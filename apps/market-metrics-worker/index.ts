import { createConsumer } from "@repo/kafka/src/consumer";
import { type TradeEvent } from "./types";
import prisma from "@repo/db";
import Decimal from "decimal.js";

const processTradeEvent = async (event: TradeEvent) => {
  const { price, quantity, marketId, event: eventType, executedAt } = event;
  if (eventType !== "TRADE_EXECUTED") {
    console.log("Received message:", event);
    return;
  }

  try {

    await prisma.$transaction(async (tx) => {
      const [market] = await tx.$queryRaw<
        {
          id: string
          price: Decimal
          sparkline7d: Decimal[]
          volume24h: Decimal
          high24h: Decimal
          low24h: Decimal
          open24h: Decimal
          change24h: Decimal
          quoteVolume24h: Decimal
        }[]
      >`
  SELECT id, price, sparkline7d, volume24h, high24h, low24h,
         open24h, change24h, quoteVolume24h
  FROM "Market"
  WHERE id = ${marketId}
  FOR UPDATE
`;
      if (!market) {
        console.error("Market not found:", marketId);
        return;
      }

      const priceChange = new Decimal(price).sub(market.price || 0);

      const bucket = Math.floor(new Date(executedAt).getTime() / (24 * 60 * 60 * 1000));
      const sparkline7d = market.sparkline7d?.slice(bucket - 7, bucket + 1) || [];

      const volume24h = market.volume24h?.add(quantity) || quantity;
      const high24h = market.high24h?.gt(price) ? market.high24h : price;
      const low24h = market.low24h?.lt(price) ? market.low24h : price;
      const open24h = market.open24h || price;
      const change24h = market.change24h?.add(priceChange) || priceChange;


      await tx.market.update({
        where: {
          id: market.id
        },
        data: {
          price,
          priceChange,
          change24h,
          volume24h,
          quoteVolume24h: market.quoteVolume24h?.add(new Decimal(price).mul(quantity)) || new Decimal(price).mul(quantity),
          high24h,
          low24h,
          open24h,
          sparkline7d: sparkline7d.concat([new Decimal(price)]),
          updatedAt: new Date(executedAt)
        }
      })

    })
  } catch (error) {
    console.error("Error processing trade event:", error);
  }

}


async function initializeKafka() {
  const consumer = createConsumer("market-metrics-worker");

  consumer.on("consumer.crash", (error) => {
    console.error("Consumer crashed:", error);
  });
  consumer.subscribe({ topic: "trades.executed", fromBeginning: false })

  consumer.run({
    eachMessage: async ({ topic, message }) => {
      const event = JSON.parse(message.value?.toString() || "");
      if (topic === "trades.executed") {
        console.log("Received message:", event);
        await processTradeEvent(event);
      }
    }
  })
}

async function main() {
  await initializeKafka();

}

main().then(() => console.log("Market metrics worker started")).catch(console.error);