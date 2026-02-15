import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import { IncomingMessage } from 'http';
import { createConsumer } from "@repo/kafka/src/consumer";
import { OrderbookView } from "./orderbook/OrderbookView";
import redisclient from "@repo/redisclient"

const wss = new WebSocketServer({
    port: 8082,
    perMessageDeflate: false
});


const books = new Map<string, OrderbookView>();
const orderbookClients = new Map<string, Set<WebSocket>>();
const candleClients = new Map<string, Map<string, Set<WebSocket>>>();

function getBook(pair: string) {
    if (!books.has(pair)) {
        books.set(pair, new OrderbookView())
    }
    return books.get(pair);
}

function handleCandle(data: any) {
    const { pair, interval, type } = data;

    if (type === "CANDLE_NEW") {
        broadcastCandle(pair, interval, JSON.stringify({
            type: "CANDLE_NEW",
            interval,
            candle: data.candle,
            timestamp: Date.now()
        }));
    } else if (type === "CANDLE_UPDATE") {
        broadcastCandle(pair, interval, JSON.stringify({
            type: "CANDLE_UPDATE",
            interval,
            candle: data.candle,
            timestamp: Date.now()
        }));
    }
}

const restoreAllBooks = async () => {
    let cursor = "0";

    do {
        const [nextCursor, keys] = await redisclient.scan(
            cursor,
            "MATCH",
            "snapshot:*",
            "COUNT",
            100
        );

        cursor = nextCursor;

        for (const key of keys) {
            const pair = key.split(":")[1];
            if (!pair) continue;

            const raw = await redisclient.get(key);
            if (!raw) continue;

            const snapshot = JSON.parse(raw);
            const book = getBook(pair);
            book?.restoreOrderbook(snapshot);
        }
    } while (cursor !== "0");

}

const redisSubscriber = redisclient.duplicate();

let consumer: ReturnType<typeof createConsumer>;

async function initializeKafka() {
    try {
        await restoreAllBooks();

        consumer = createConsumer("ws-gateway-service");

        consumer.on("consumer.crash", async (e: any) => {
            console.error("Kafka consumer crashed, attempting restart...", e);
            try {
                await consumer.disconnect();
            } catch { }
            setTimeout(initializeKafka, 5000);
        });

        await consumer.connect();
        await consumer.subscribe({ topic: "trades.executed" });
        await consumer.subscribe({ topic: "orders.cancelled" });
        await consumer.subscribe({ topic: "orders.opened" });

        console.log("Kafka consumer connected successfully");

        await redisSubscriber.psubscribe("candle:update:*");
        await redisSubscriber.psubscribe("market-metrics:*");

        redisSubscriber.on("pmessage", (pattern, channel, message) => {
            if (!message) return;

            const data = JSON.parse(message);
            try {
                switch (pattern) {
                    case "candle:update:*":
                        if (!data?.pair) return;
                        handleCandle(data);
                        break;
                    case "market-metrics:*":
                        if (data.type !== "MARKET_UPDATE") return;
                        const pair = channel.split(":")[1];
                        if(!pair) return;
                        const {
                            marketId,
                            price,
                            open24h,
                            low24h,
                            volume24h,
                            quoteVolume24h,
                            change24h,
                            priceChange24h
                        } = data.data;

                        broadcastMarketUpdate(pair, {
                            marketId,
                            price,
                            open24h,
                            low24h,
                            volume24h,
                            quoteVolume24h,
                            change24h,
                            priceChange24h
                        });
                        break;

                }
            } catch (err) {
                console.error("Invalid candle message", err);
            }
        });

        await consumer.run({
            eachMessage: async ({ message, partition, topic }) => {
                try {
                    if (!message.value) return;
                    const event = JSON.parse(message.value.toString());

                    if (!event.pair) {
                        console.warn("Message missing pair:", event);
                        return;
                    }

                    const key = `ws-gateway:${event.eventId}`;

                    const isAlreadyProcessed = await redisclient.get(key);

                    if (isAlreadyProcessed) {
                        console.log("Event Already Processed", event.eventId);
                        return;
                    }

                    const book = getBook(event.pair);

                    if (event.event === "ORDER_OPENED") {
                        book?.applyOrderOpened(event);
                        const snapshot = book?.snapshot();
                        broadcastToPair(event.pair, JSON.stringify({
                            type: "ORDERBOOK_UPDATE",
                            pair: event.pair,
                            bids: snapshot?.bids || [],
                            asks: snapshot?.asks || [],
                            timestamp: Date.now()
                        }));
                    }

                    if (event.event === "TRADE_EXECUTED") {
                        book?.applyTrade(event);
                        const snapshot = book?.snapshot();
                        broadcastToPair(event.pair, JSON.stringify({
                            type: "TRADE_EXECUTED",
                            pair: event.pair,
                            trade: event,
                            timestamp: Date.now()
                        }));
                        broadcastToPair(event.pair, JSON.stringify({
                            type: "ORDERBOOK_UPDATE",
                            pair: event.pair,
                            bids: snapshot?.bids || [],
                            asks: snapshot?.asks || [],
                            timestamp: Date.now()
                        }));
                    }

                    if (event.event === "ORDER_CANCELED") {
                        book?.applyOrderCancel(event);
                        const snapshot = book?.snapshot();
                        broadcastToPair(event.pair, JSON.stringify({
                            type: "ORDERBOOK_UPDATE",
                            pair: event.pair,
                            bids: snapshot?.bids || [],
                            asks: snapshot?.asks || [],
                            timestamp: Date.now()
                        }));
                    }

                    await redisclient.set(key, "1", "EX", 60 * 60);

                    await consumer.commitOffsets([
                        {
                            offset: (Number(message.offset) + 1).toString(),
                            partition,
                            topic
                        }
                    ])
                } catch (error) {
                    console.error("Error processing Kafka message:", error);
                }
            }
        });
    } catch (error) {
        console.error("Failed to initialize Kafka consumer:", error);
        setTimeout(initializeKafka, 5000);
    }
}

initializeKafka();

const getPairFromQuery = (req: IncomingMessage) => {
    try {
        const url = new URL(req.url!, "http://localhost");
        const pair = url.searchParams.get("pair");
        if (!pair) {
            throw new Error("Missing pair parameter");
        }
        return pair;
    } catch (error) {
        console.error("Error parsing pair from query:", error);
        return null;
    }
};

function broadcastToPair(pair: string, message: string) {
    const clients = orderbookClients.get(pair);
    if (clients) {
        const deadClients: WebSocket[] = [];

        clients.forEach(client => {
            try {
                if (client.readyState === 1) {
                    client.send(message);
                } else {
                    deadClients.push(client);
                }
            } catch (error) {
                console.error("Error sending message to client:", error);
                deadClients.push(client);
            }
        });

        deadClients.forEach(client => {
            clients.delete(client);
        });
    }
}

function broadcastCandle(pair: string, interval: string, message: string) {
    const pairMap = candleClients.get(pair);
    if (!pairMap) return;

    const clients = pairMap?.get(interval);
    if (!clients) return;

    clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(message)
        }
    })
}

function broadcastMarketUpdate(pair: string, data: {
    marketId: string;
    price: string;
    open24h: string;
    low24h: string;
    volume24h: string;
    quoteVolume24h: string;
    change24h: string;
    priceChange24h: string;
}) {
    broadcastToPair(pair, JSON.stringify({
        type: "MARKET_UPDATE",
        pair,
        data,
        timestamp: Date.now()
    }));
}

function sendOrderbookSnapshot(ws: WebSocket, pair: string) {
    try {
        const book = getBook(pair);
        const snapshot = book?.snapshot();

        ws.send(JSON.stringify({
            type: "ORDERBOOK_SNAPSHOT",
            pair,
            bids: snapshot?.bids || [],
            asks: snapshot?.asks || [],
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error("Error sending orderbook snapshot:", error);
        ws.send(JSON.stringify({
            type: "ERROR",
            message: "Failed to get orderbook snapshot"
        }));
    }
}

wss.on("connection", async (ws, req) => {
    const pair = getPairFromQuery(req);

    if (!pair) {
        ws.send(JSON.stringify({
            type: "ERROR",
            message: "Invalid or missing pair parameter"
        }));
        ws.close(1008, "Invalid pair");
        return;
    }

    if (!orderbookClients.has(pair)) {
        orderbookClients.set(pair, new Set());
    }
    orderbookClients.get(pair)!.add(ws);

    console.log(`Client connected to pair: ${pair}`);

    sendOrderbookSnapshot(ws, pair);

    ws.on("message", (data: WebSocket.Data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('received message:', message);

            if (message.type === "SUBSCRIBE_ORDERBOOK") {
                sendOrderbookSnapshot(ws, pair);
            } else if (message.type === "SUBSCRIBE_CANDLES") {
                const interval = message.interval;

                if (!interval) {
                    ws.send(JSON.stringify({
                        type: "ERROR",
                        message: "Interval required"
                    }));
                    return;
                }

                if (!candleClients.has(pair)) {
                    candleClients.set(pair, new Map());
                }

                if (!candleClients.get(pair)!.has(interval)) {
                    candleClients.get(pair)!.set(interval, new Set());
                }

                candleClients.get(pair)?.get(interval)?.add(ws);

                ws.send(JSON.stringify({
                    type: "CANDLE_SUBSCRIBED",
                    interval,
                    pair
                }))
            } else if (message.type === "PING") {
                ws.send(JSON.stringify({
                    type: "PONG",
                    timestamp: Date.now()
                }));
            } else {
                ws.send(JSON.stringify({
                    type: "ERROR",
                    message: `Unknown message type: ${message.type}`
                }));
            }
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
            ws.send(JSON.stringify({
                type: "ERROR",
                message: "Invalid message format"
            }));
        }
    });

    ws.on("close", (code, reason) => {
        orderbookClients.get(pair)?.delete(ws);
        const pairMap = candleClients.get(pair);

        if (pairMap) {
            pairMap.forEach((clients, interval) => {
                clients.delete(ws);
            })
        }

        console.log(`WebSocket connection closed for ${pair}, code: ${code}, reason: ${reason}`);
    });

    ws.on("error", (error) => {
        console.error(`WebSocket error for ${pair}:`, error);
        orderbookClients.get(pair)?.delete(ws);
        const pairMap = candleClients.get(pair);

        if (pairMap) {
            pairMap.forEach((clients, interval) => {
                clients.delete(ws);
            })
        }
    });

    const pingInterval = setInterval(() => {
        if (ws.readyState === 1) {
            ws.ping();
        } else {
            clearInterval(pingInterval);
        }
    }, 30000);

    ws.on("close", () => {
        clearInterval(pingInterval);
    });
});

wss.on("listening", () => {
    console.log("WebSocket server is running on ws://localhost:8082");
});

wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
});

