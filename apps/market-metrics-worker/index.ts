import { createConsumer } from "@repo/kafka/src/consumer";
import { type TradeEvent } from "./types";
import prisma from "@repo/db";
import Decimal from "decimal.js";
import redisclient from "@repo/redisclient";

const processTradeEvent = async (event: TradeEvent) => {
  const { price, quantity, marketId, event: eventType, executedAt } = event;
  
  if (eventType !== "TRADE_EXECUTED") {
    console.log("Skipping non-trade event:", event);
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const [market] = await tx.$queryRaw<
        {
          id: string;
          price: Decimal | null;
          sparkline7d: Decimal[];
          volume24h: Decimal | null;
          high24h: Decimal | null;
          low24h: Decimal | null;
          open24h: Decimal | null;
          change24h: Decimal | null;
        }[]
      >`
        SELECT id, price, sparkline7d, volume24h, high24h, low24h,
               open24h, change24h
        FROM "Market"
        WHERE id = ${marketId}
        FOR UPDATE
      `;

      if (!market) {
        console.error("Market not found:", marketId);
        return;
      }

      const newPrice = new Decimal(price);
      const tradeQuantity = new Decimal(quantity);

      const previousPrice = market.price ? new Decimal(market.price) : newPrice;
      const priceChange = newPrice.sub(previousPrice);

      const volume24h = market.volume24h
        ? new Decimal(market.volume24h).add(tradeQuantity)
        : tradeQuantity;

      const high24h = market.high24h && new Decimal(market.high24h).gt(newPrice)
        ? new Decimal(market.high24h)
        : newPrice;

      const low24h = market.low24h && new Decimal(market.low24h).lt(newPrice)
        ? new Decimal(market.low24h)
        : newPrice;

      const open24h = market.open24h ? new Decimal(market.open24h) : newPrice;

      const change24h = open24h.gt(0)
        ? newPrice.sub(open24h).div(open24h).mul(100)
        : new Decimal(0);

      const currentSparkline = market.sparkline7d || [];
      const tradeDayBucket = Math.floor(
        new Date(executedAt).getTime() / (24 * 60 * 60 * 1000)
      );

      let updatedSparkline = [...currentSparkline];
      
      if (updatedSparkline.length >= 7) {
        updatedSparkline = updatedSparkline.slice(-6);
      }
      
      updatedSparkline.push(newPrice);

      await tx.market.update({
        where: {
          id: market.id,
        },
        data: {
          price: newPrice,
          priceChange,
          change24h,
          volume24h,
          high24h,
          low24h,
          open24h,
          sparkline7d: updatedSparkline,
          updatedAt: new Date(executedAt),
        },
      });

      console.log(`Market ${marketId} updated: price=${newPrice}, volume24h=${volume24h}`);
    });
  } catch (error) {
    console.error("Error processing trade event:", error);
    throw error;
  }
};

async function initializeKafka() {
  const consumer = createConsumer("market-metrics-worker");

  consumer.on("consumer.crash", (error) => {
    console.error("Consumer crashed:", error);
    process.exit(1); 
  });

  await consumer.subscribe({ topic: "trades.executed", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message, partition }) => {
      try {
        const event = JSON.parse(message.value?.toString() || "{}");

        if (!event.eventId) {
          console.warn("Event missing eventId, skipping");
          return;
        }

        const key = `mmw:processed:${event.eventId}`;
        const alreadyProcessed = await redisclient.get(key);
        
        if (alreadyProcessed) {
          console.log("Trade already processed:", event.eventId);
          await consumer.commitOffsets([
            {
              offset: (Number(message.offset) + 1).toString(),
              partition,
              topic,
            },
          ]);
          return;
        }

        if (topic === "trades.executed") {
          await processTradeEvent(event);
        }

        await redisclient.set(key, "1", "EX", 60 * 60 * 24);

        await consumer.commitOffsets([
          {
            offset: (Number(message.offset) + 1).toString(),
            partition,
            topic,
          },
        ]);
      } catch (error) {
        console.error("Error processing message:", error);
        throw error;
      }
    },
  });
}

async function main() {
  console.log("Starting market metrics worker...");
  await initializeKafka();
}

main()
  .then(() => console.log("Market metrics worker started successfully"))
  .catch((error) => {
    console.error("Fatal error starting worker:", error);
    process.exit(1);
  });