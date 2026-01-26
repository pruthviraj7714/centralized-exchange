import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import { IncomingMessage } from 'http';
import { createConsumer } from "@repo/kafka/src/consumer";
import { OrderbookView } from "./orderbook/OrderbookView";

const wss = new WebSocketServer({ 
    port: 8082,
    perMessageDeflate: false
});

const books = new Map<string, OrderbookView>();
const clientsByPair = new Map<string, Set<WebSocket>>();

function getBook(pair: string) {
    if (!books.has(pair)) {
        books.set(pair, new OrderbookView())
    }
    return books.get(pair);
}

let consumer: any = null;

async function initializeKafka() {
    try {
        consumer = createConsumer("ws-gateway-service");
        
        consumer.on("consumer.crash", (e: any) => {
            console.error("Kafka consumer crashed, attempting restart...", e);
            setTimeout(initializeKafka, 5000);
        });

        await consumer.connect();
        await consumer.subscribe({ topic: "trades.executed" });
        await consumer.subscribe({ topic: "orders.updated" });

        console.log("Kafka consumer connected successfully");
        
        await consumer.run({
            eachMessage: async ({ message }: any) => {
                try {
                    console.log('received message', message.value.toString());
                    const event = JSON.parse(message.value.toString());

                    console.log(event);
                    
                    if (!event.pair) {
                        console.warn("Message missing pair:", event);
                        return;
                    }
                    
                    const book = getBook(event.pair);

                    if (event.event === "ORDER_UPDATED") {
                        book?.applyOrderUpdate(event);
                        broadcastToPair(event.pair, JSON.stringify({
                            type: "ORDERBOOK_UPDATE",
                            pair: event.pair,
                            bids: book?.snapshot().bids || [],
                            asks: book?.snapshot().asks || [],
                            timestamp: Date.now()
                        }));
                    }

                    if (event.event === "TRADE_EXECUTED") {
                        book?.applyTrade(event);
                        broadcastToPair(event.pair, JSON.stringify({
                            type: "TRADE_EXECUTED",
                            pair: event.pair,
                            trade: event,
                            timestamp: Date.now()
                        }));
                    }
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
    const clients = clientsByPair.get(pair);
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

wss.on("connection", (ws, req) => {
    const pair = getPairFromQuery(req);

    if (!pair) {
        ws.send(JSON.stringify({
            type: "ERROR",
            message: "Invalid or missing pair parameter"
        }));
        ws.close(1008, "Invalid pair");
        return;
    }

    if (!clientsByPair.has(pair)) {
        clientsByPair.set(pair, new Set());
    }
    clientsByPair.get(pair)!.add(ws);

    console.log(`Client connected to pair: ${pair}`);

    sendOrderbookSnapshot(ws, pair);

    ws.on("message", (data: WebSocket.Data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('received message:', message);

            if (message.type === "SUBSCRIBE_ORDERBOOK") {
                sendOrderbookSnapshot(ws, pair);
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
        clientsByPair.get(pair)?.delete(ws);
        console.log(`WebSocket connection closed for ${pair}, code: ${code}, reason: ${reason}`);
    });

    ws.on("error", (error) => {
        console.error(`WebSocket error for ${pair}:`, error);
        clientsByPair.get(pair)?.delete(ws);
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
