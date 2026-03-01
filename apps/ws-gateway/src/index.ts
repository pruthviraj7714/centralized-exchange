import { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { createConsumer } from "@repo/kafka/src/consumer";
import redisclient from "@repo/redisclient";

const wss = new WebSocketServer({
  port: 8082,
  perMessageDeflate: false,
});

const orderbookClients = new Map<string, Set<WebSocket>>();
const candleClients = new Map<string, Map<string, Set<WebSocket>>>();

function handleCandle(data: any) {
  const { pair, interval, type } = data;

  if (type === "CANDLE_NEW") {
    broadcastCandle(
      pair,
      interval,
      JSON.stringify({
        type: "CANDLE_NEW",
        interval,
        candle: data.candle,
        timestamp: Date.now(),
      }),
    );
  } else if (type === "CANDLE_UPDATE") {
    broadcastCandle(
      pair,
      interval,
      JSON.stringify({
        type: "CANDLE_UPDATE",
        interval,
        candle: data.candle,
        timestamp: Date.now(),
      }),
    );
  }
}

const redisSubscriber = redisclient.duplicate();

let consumer: ReturnType<typeof createConsumer>;

async function initializeKafka() {
  try {
    consumer = createConsumer("ws-gateway-service");

    consumer.on("consumer.crash", async (e: any) => {
      console.error("Kafka consumer crashed, attempting restart...", e);
      try {
        await consumer.stop();
        await consumer.disconnect();
      } catch {}
      setTimeout(initializeKafka, 5000);
    });

    await consumer.connect();
    await consumer.subscribe({ topic: "trades.executed" });
    await consumer.subscribe({ topic: "orderbook.updated" });
    await consumer.subscribe({ topic: "orderbook.snapshot" });

    console.log("Kafka consumer connected successfully");

    await redisSubscriber.psubscribe("candle:update:*");
    await redisSubscriber.psubscribe("market-metrics:*");

    redisSubscriber.on("pmessage", (pattern, channel, message) => {
      if (!message) return;

      try {
        const data = JSON.parse(message);

        switch (pattern) {
          case "candle:update:*":
            if (!data?.pair) return;
            handleCandle(data);
            break;
          case "market-metrics:*":
            if (data.type !== "MARKET_UPDATE") return;
            const pair = channel.split(":")[1];
            if (!pair) return;
            const {
              marketId,
              price,
              open24h,
              low24h,
              volume24h,
              quoteVolume24h,
              change24h,
              priceChange24h,
            } = data.data;

            broadcastMarketUpdate(pair, {
              marketId,
              price,
              open24h,
              low24h,
              volume24h,
              quoteVolume24h,
              change24h,
              priceChange24h,
            });
            break;
        }
      } catch (err) {
        console.error("Invalid Redis pubsub message:", err);
      }
    });

    await consumer.run({
      autoCommit: false,
      eachMessage: async ({ message, partition, topic }) => {
        try {
          if (!message.value) return;
          const event = JSON.parse(message.value.toString());

          if (!event.pair) {
            console.warn("Message missing pair:", event);
            return;
          }

          const key = `ws-gateway:${topic}:${event.eventId}`;

          const isAlreadyProcessed = await redisclient.get(key);

          if (isAlreadyProcessed) {
            console.log("Event already processed:", event.eventId);
            return;
          }

          if (event.event === "ORDERBOOK_SNAPSHOT") {
            broadcastToPair(
              event.pair,
              JSON.stringify({
                type: "ORDERBOOK_SNAPSHOT",
                pair: event.pair,
                bids: event.bids,
                asks: event.asks,
                timestamp: Date.now(),
                sequence: event.sequence,
              }),
            );
            return;
          }

          if (event.event === "ORDERBOOK_UPDATE") {
            broadcastToPair(
              event.pair,
              JSON.stringify({
                type: "ORDERBOOK_UPDATE",
                pair: event.pair,
                bids: event.bids,
                asks: event.asks,
                timestamp: Date.now(),
                sequence: event.sequence,
              }),
            );
          }
          if (event.event === "TRADE_EXECUTED") {
            broadcastToPair(
              event.pair,
              JSON.stringify({
                type: "TRADE_EXECUTED",
                pair: event.pair,
                trade: {
                  buyOrderId: event.buyOrderId,
                  sellOrderId: event.sellOrderId,
                  price: event.price,
                  quantity: event.quantity,
                  timestamp: event.executedAt ?? Date.now(),
                },
                timestamp: Date.now(),
              }),
            );
          }

          await redisclient.set(key, "1", "EX", 60 * 60);

          await consumer.commitOffsets([
            {
              offset: (Number(message.offset) + 1).toString(),
              partition,
              topic,
            },
          ]);
        } catch (error) {
          console.error("Error processing Kafka message:", error);
        }
      },
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
  if (!clients) return;

  const deadClients: WebSocket[] = [];

  clients.forEach((client) => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        deadClients.push(client);
      }
    } catch (error) {
      console.error("Error sending message to client:", error);
      deadClients.push(client);
    }
  });

  deadClients.forEach((client) => clients.delete(client));
}

function broadcastCandle(pair: string, interval: string, message: string) {
  const pairMap = candleClients.get(pair);
  if (!pairMap) return;

  const clients = pairMap.get(interval);
  if (!clients) return;

  const deadClients: WebSocket[] = [];

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    } else {
      deadClients.push(client);
    }
  });

  deadClients.forEach((client) => clients.delete(client));
}

function broadcastMarketUpdate(
  pair: string,
  data: {
    marketId: string;
    price: string;
    open24h: string;
    low24h: string;
    volume24h: string;
    quoteVolume24h: string;
    change24h: string;
    priceChange24h: string;
  },
) {
  broadcastToPair(
    pair,
    JSON.stringify({
      type: "MARKET_UPDATE",
      pair,
      data,
      timestamp: Date.now(),
    }),
  );
}

wss.on("connection", async (ws, req) => {
  const pair = getPairFromQuery(req);

  if (!pair) {
    ws.send(
      JSON.stringify({
        type: "ERROR",
        message: "Invalid or missing pair parameter",
      }),
    );
    ws.close(1008, "Invalid pair");
    return;
  }

  if (!orderbookClients.has(pair)) {
    orderbookClients.set(pair, new Set());
  }
  orderbookClients.get(pair)!.add(ws);

  console.log(`Client connected to pair: ${pair}`);

  ws.on("message", async (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === "SUBSCRIBE_ORDERBOOK") {
        const raw = await redisclient.get(`snapshot:rendered:${pair}`);
        const snapshot = raw ? JSON.parse(raw) : null;
        ws.send(
          JSON.stringify({
            type: "ORDERBOOK_SNAPSHOT",
            pair,
            bids: snapshot?.bids || [],
            asks: snapshot?.asks || [],
            timestamp: Date.now(),
            sequence: snapshot?.sequence,
            lastTrades: snapshot?.lastTrades || [],
          }),
        );
        ws.send(
          JSON.stringify({
            type: "SUBSCRIBED_ORDERBOOK",
            pair,
          }),
        );
      } else if (message.type === "SUBSCRIBE_CANDLES") {
        const interval = message.interval;

        if (!interval) {
          ws.send(
            JSON.stringify({
              type: "ERROR",
              message: "Interval required",
            }),
          );
          return;
        }

        if (!candleClients.has(pair)) {
          candleClients.set(pair, new Map());
        }

        if (!candleClients.get(pair)!.has(interval)) {
          candleClients.get(pair)!.set(interval, new Set());
        }

        candleClients.get(pair)?.get(interval)?.add(ws);

        ws.send(
          JSON.stringify({
            type: "CANDLE_SUBSCRIBED",
            interval,
            pair,
          }),
        );
      } else if (message.type === "PING") {
        ws.send(
          JSON.stringify({
            type: "PONG",
            timestamp: Date.now(),
          }),
        );
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      ws.send(
        JSON.stringify({
          type: "ERROR",
          message: "Invalid message format",
        }),
      );
    }
  });

  ws.on("close", (code, reason) => {
    clearInterval(pingInterval);

    orderbookClients.get(pair)?.delete(ws);
    const pairMap = candleClients.get(pair);
    if (pairMap) {
      pairMap.forEach((clients) => clients.delete(ws));
    }

    console.log(
      `WebSocket connection closed for ${pair}, code: ${code}, reason: ${reason}`,
    );
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error for ${pair}:`, error);
    orderbookClients.get(pair)?.delete(ws);
    const set = orderbookClients.get(pair);
    if (set && set.size === 0) {
      orderbookClients.delete(pair);
    }
    const pairMap = candleClients.get(pair);
    if (pairMap) {
      pairMap.forEach((clients) => clients.delete(ws));
    }
  });

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
});

wss.on("listening", () => {
  console.log("WebSocket server is running on ws://localhost:8082");
});

wss.on("error", (error) => {
  console.error("WebSocket server error:", error);
});
