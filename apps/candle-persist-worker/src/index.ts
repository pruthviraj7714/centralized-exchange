import { SUPPORTED_MARKETS } from "@repo/common"
import prisma from '@repo/db'
import redisclient from "@repo/redisclient";

interface ICandle {
    interval: string;
    openTime: number;
    closeTime: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
}

const INTERVALS = {
    "1m": 60000,
    "5m": 300000,
    "15m": 900000,
    "30m": 1800000,
    "1h": 3600000,
    "4h": 14400000,
    "1d": 86400000
}

async function insertCandle(pair: string, candle: ICandle, interval: string) {
    console.log("inserting candle" + JSON.stringify(candle, null, 2));
    
    await prisma.candle.upsert({
        where : {
            market_interval_openTime: {
                market: pair,
                interval: interval,
                openTime: new Date(Number(candle.openTime))
            }
        },
        create: {
            ...candle,
            openTime: new Date(Number(candle.openTime)),
            closeTime: new Date(Number(candle.closeTime)),
            interval : interval,
            market: pair
        },
        update: {
            ...candle,
            openTime: new Date(Number(candle.openTime)),
            closeTime: new Date(Number(candle.closeTime)),
            interval : interval,
            market: pair
        }
    })
}


async function flushCandlesToDB() {
  console.log("Flushing candles...");

  for (const pair of SUPPORTED_MARKETS) {
    for (const interval of Object.keys(INTERVALS)) {

      const indexKey = `candle:index:${pair}:${interval}`;

      const openTimes = await redisclient.zrange(indexKey, 0, -1);

      if (openTimes.length <= 1) continue;

      const closedOpenTimes = openTimes.slice(0, -1);

      for (const openTime of closedOpenTimes) {
        const key = `candle:${pair}:${interval}:${openTime}`;

        const candleStr = await redisclient.get(key);
        if (!candleStr) continue;

        const candle = JSON.parse(candleStr) as ICandle;

        await insertCandle(pair, candle, interval);

        await redisclient.del(key);
        await redisclient.zrem(indexKey, openTime);
      }
    }
  }
}

setInterval(flushCandlesToDB, 30000);