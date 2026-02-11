import { createConsumer } from "@repo/kafka/src/consumer"
import type { ITradeEvent } from "./types";
import redisclient from "@repo/redisclient"
import { Decimal } from "decimal.js"

let consumer: ReturnType<typeof createConsumer>;

const INTERVALS = {
    "1m": 60000,
    "5m": 300000,
    "15m": 900000,
    "30m": 1800000,
    "1h": 3600000,
    "4h": 14400000,
    "1d": 86400000
}

const TTL_CONFIG: Record<string, number> = {
    "1m": 60 * 60 * 2,
    "5m": 60 * 60 * 12,
    "15m": 60 * 60 * 24,
    "30m": 60 * 60 * 24,
    "1h": 60 * 60 * 48,
    "4h": 60 * 60 * 72,
    "1d": 60 * 60 * 24 * 7
}

async function initializeKafka() {
    consumer = createConsumer("candle-aggregator-worker");

    await consumer.connect();
    await consumer.subscribe({ topic: "trades.executed" });
}

const processInterval = async (trade: ITradeEvent, interval: string, intervalMs: number) => {
    const openTime = Math.floor(trade.timestamp / intervalMs) * intervalMs
    const closeTime = openTime + intervalMs;

    const key = `candle:${trade.pair}:${interval}:${openTime}`

    const ttl = TTL_CONFIG[interval]

    const existing = await redisclient.get(key);

    const tradePrice = new Decimal(trade.price);
    const tradeQty = new Decimal(trade.quantity)

    if (!existing) {
        const newCandle = {
            openTime,
            closeTime,
            high: tradePrice.toString(),
            open: tradePrice.toString(),
            low: tradePrice.toString(),
            close: tradePrice.toString(),
            volume: tradeQty.toString(),
            tradeCount: 1
        }
        await redisclient.zadd(`candle:index:${trade.pair}:${interval}`, openTime, openTime.toString());
        const result = await redisclient.publish(`candle:update:${trade.pair}:${interval}`, JSON.stringify({
            type : "CANDLE_NEW",
            pair : trade.pair,
            interval,
            candle : newCandle
        }));
        console.log("new candle added result:", result);
        
        await redisclient.set(key, JSON.stringify(newCandle), "EX", ttl);
        return;
    }
    const candle = JSON.parse(existing);

    const existingHigh = new Decimal(candle.high)
    const existingLow = new Decimal(candle.low)

    const updateCandle = {
        ...candle,
        high: Decimal.max(tradePrice, existingHigh).toString(),
        low: Decimal.min(tradePrice, existingLow).toString(),
        close: tradePrice.toString(),
        volume: new Decimal(candle.volume).plus(tradeQty).toString(),
        tradeCount: candle.tradeCount + 1
    }

    await redisclient.set(key, JSON.stringify(updateCandle), "EX", ttl);
    const result = await redisclient.publish(`candle:update:${trade.pair}:${interval}`, JSON.stringify({
            type : "CANDLE_UPDATE",
            pair : trade.pair,
            interval,
            candle : updateCandle
        }))

        console.log('Hi there', result);
        
}

const processTrade = async (trade: ITradeEvent) => {
    if (trade.event !== "TRADE_EXECUTED") return;

    await Promise.all(
        Object.entries(INTERVALS).map(([interval, intervalMs]) => {
            return processInterval(trade, interval, intervalMs)
        })
    )
}

async function main() {
    await initializeKafka();

    if (!consumer) {
        throw new Error("Consumer not initialized");
    }

    consumer.run({
        eachMessage: async ({ message }) => {
            if(!message.value) return;

            let trade: ITradeEvent;

            try {
                 trade = JSON.parse(message.value?.toString())
                     await processTrade(trade)
            } catch (error) {
                throw new Error("Error while processing trades");
            }
        }
    })
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});