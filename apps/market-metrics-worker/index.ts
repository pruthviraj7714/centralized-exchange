import { createConsumer } from "@repo/kafka/src/consumer";
import { type ITickerData, type TradeEvent } from "./types";
import prisma from "@repo/db";
import Decimal from "decimal.js";
import redisclient from "@repo/redisclient";

const ONE_MIN = 60;
const DAY_SECONDS = 24 * 60 * 60;

function minuteBucket(ts: number) {
  return Math.floor(ts / 1000 / ONE_MIN) * ONE_MIN;
}

const lastDbFlush = new Map<string, number>();
const DB_FLUSH_INTERVAL = 10;

const processTrade = async (event: TradeEvent) => {
  if (event.event !== "TRADE_EXECUTED") return;

  const { marketId, price, quantity, executedAt, pair } = event;

  const ts = new Date(executedAt).getTime();
  const bucket = minuteBucket(ts);

  const candleKey = `m:${marketId}:c:${bucket}`;
  const indexKey = `m:${marketId}:idx`;

  const p = new Decimal(price);
  const q = new Decimal(quantity);
  const quoteVol = p.mul(q);

  const existing = await redisclient.hgetall(candleKey);

  let open: Decimal;
  let high: Decimal;
  let low: Decimal;
  let close: Decimal;
  let volume: Decimal;
  let quoteVolume: Decimal;


  if (!existing.o) {
    open = high = low = close = p;
    volume = q;
    quoteVolume = quoteVol;
  } else {
    open = new Decimal(existing.o);
    high = Decimal.max(new Decimal(existing.h as string), p);
    low = Decimal.min(new Decimal(existing.l as string), p);
    close = p;
    volume = new Decimal(existing.v as string).add(q);
    quoteVolume = new Decimal(existing.q as string).add(quoteVol);
  }

  await redisclient
    .multi()
    .hmset(candleKey, {
      o: open.toString(),
      h: high.toString(),
      l: low.toString(),
      c: close.toString(),
      v: volume.toString(),
      q: quoteVolume.toString(),
    })
    .expire(candleKey, 7 * DAY_SECONDS)
    .zadd(indexKey, bucket, bucket)
    .exec();

  await recompute24h(marketId);
  const ticker = await getTickerFromRedis(marketId);
  if (ticker) {
    await publishUpdatedMarketDataToWS(pair, ticker as ITickerData);
  }

  if (shouldFlushToDB(marketId)) {
    await updateMarketData(ticker as ITickerData);
  }

}

const recompute24h = async (marketId: string) => {
  const nowBucket = minuteBucket(Date.now());
  const fromBucket = nowBucket - DAY_SECONDS;

  const indexKey = `m:${marketId}:idx`;
  const tickerKey = `m:${marketId}:t`;

  const buckets = await redisclient.zrangebyscore(
    indexKey,
    fromBucket,
    nowBucket
  );

  if (!buckets.length) return;

  let open: Decimal | null = null;
  let close: Decimal | null = null;
  let high = new Decimal(0);
  let low = new Decimal("1e50");
  let volume = new Decimal(0);
  let quoteVolume = new Decimal(0);

  for (const b of buckets) {
    const c = await redisclient.hgetall(`m:${marketId}:c:${b}`);
    if (!c.o) continue;

    const co = new Decimal(c.o);
    const ch = new Decimal(c.h as string);
    const cl = new Decimal(c.l as string);
    const cc = new Decimal(c.c as string);
    const cv = new Decimal(c.v as string);
    const cq = new Decimal(c.q as string);

    if (!open) open = co;
    close = cc;

    high = Decimal.max(high, ch);
    low = Decimal.min(low, cl);
    volume = volume.add(cv);
    quoteVolume = quoteVolume.add(cq);
  }

  if (!open || !close) return;

  const change = close.sub(open);
  const changePct = open.gt(0)
    ? change.div(open).mul(100)
    : new Decimal(0);

  await redisclient.hmset(tickerKey, {
    price: close.toString(),
    open24h: open.toString(),
    high24h: high.toString(),
    low24h: low.toString(),
    volume24h: volume.toString(),
    quoteVolume24h: quoteVolume.toString(),
    change24h: changePct.toFixed(4),
    priceChange24h: change.toString(),
  });

  await redisclient.expire(tickerKey, DAY_SECONDS);
}

const shouldFlushToDB = (marketId: string): boolean => {
  const last = lastDbFlush.get(marketId) || 0;
  const now = Date.now();
  if (now - last >= DB_FLUSH_INTERVAL * 1000) {
    lastDbFlush.set(marketId, now);
    return true;
  }
  return false;
};

const updateMarketData = async (ticker: ITickerData) => {
  const {
    marketId,
    price,
    open24h,
    high24h,
    low24h,
    volume24h,
    change24h,
    priceChange24h,
  } = ticker;

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

      const currentSparkline = market.sparkline7d || [];

      let updatedSparkline = [...currentSparkline];

      if (updatedSparkline.length >= 7) {
        updatedSparkline = updatedSparkline.slice(-6);
      }

      updatedSparkline.push(new Decimal(price));

      await tx.market.update({
        where: {
          id: market.id,
        },
        data: {
          price: new Decimal(price),
          priceChange: new Decimal(change24h),
          change24h: new Decimal(priceChange24h),
          volume24h: new Decimal(volume24h),
          high24h: new Decimal(high24h),
          low24h: new Decimal(low24h),
          open24h: new Decimal(open24h),
          sparkline7d: updatedSparkline,
          updatedAt: new Date(),
        },
      });

      console.log(`Market ${marketId} updated: price=${price}, volume24h=${volume24h}`);
    });
  } catch (error) {
    console.error("Error processing trade event:", error);
    throw error;
  }
};

const getTickerFromRedis = async (marketId: string) => {
  try {
    const tickerKey = `m:${marketId}:t`;
    const data = await redisclient.hgetall(tickerKey);

    if (!data || !data.price) return null;

    return {
      marketId,
      price: data.price,
      open24h: data.open24h,
      high24h: data.high24h,
      low24h: data.low24h,
      volume24h: data.volume24h,
      quoteVolume24h: data.quoteVolume24h,
      change24h: data.change24h,
      priceChange24h: data.priceChange24h,
    };
  } catch (error) {
    console.error("Error while getting ticker from redis");
    return null;
  }
}

const publishUpdatedMarketDataToWS = async (pair: string, data: ITickerData) => {
  if (!data) return;

  await redisclient.publish(`market-metrics:${pair}`, JSON.stringify({
    type: "MARKET_UPDATE",
    data,
    timestamp: Date.now()
  }))
}

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
          await processTrade(event);
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