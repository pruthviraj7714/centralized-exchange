import { WebSocketServer } from "ws";
import { SUPPORTED_PAIRS } from "./constants";
import WebSocket from "ws";
import type { IOrderbookData, IOrderResponse, OrderEvent } from "./types";
import Orderbook from "./orderbook";
import redisClient from "@repo/redisclient";
import { ORDER_CANCEL_STREAM } from "./config";

export const broadcastMessageToClients = (
  orderbookData: IOrderbookData,
  message: any
) => {
  orderbookData.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

const orderbookMap: Map<string, IOrderbookData> = new Map();

const subscriber = redisClient.duplicate();

const initializeSubscriber = async () => {
  try {
    console.log("🔌 Connecting subscriber to Redis...");
    console.log("🔔 Subscribing to order-events channel...");
    await subscriber.subscribe("order-events");
    console.log("✅ Successfully subscribed to order-events channel");
    subscriber.on("connect", () => {
      console.log("🔗 Subscriber connection established");
    });
    subscriber.on("ready", () => {
      console.log("🚀 Subscriber is ready");
    });
    subscriber.on("error", (error) => {
      console.error("❌ Subscriber error:", error);
    });
    subscriber.on("end", () => {
      console.log("🔚 Subscriber connection ended");
    });
    subscriber.on("reconnecting", () => {
      console.log("🔄 Subscriber reconnecting...");
    });
  } catch (error) {
    console.error("❌ Failed to initialize subscriber:", error);
    throw error;
  }
};

export const startWsServer = () => {
  const wss = new WebSocketServer({ port: 8080 });

  subscriber.on("message", async (channel, message) => {
    try {
      const orderData = JSON.parse(message) as IOrderResponse;

      const ticker = orderData.pair;

      if (!ticker) {
        console.error(
          "❌ Could not extract ticker from order data:",
          orderData
        );
        return;
      }
      let orderbookData: IOrderbookData;
      if (orderbookMap.has(ticker)) {
        orderbookData = orderbookMap.get(ticker)!;

        switch (orderData.event) {
          case "CREATE_ORDER":
            console.log("✅ Adding order to orderbook:", orderData);

            try {
              // orderbookData.orderbook.addOrder(orderData);
              console.log("📈 Order added to orderbook successfully");
            } catch (addError) {
              console.error("❌ Error adding order to orderbook:", addError);
            }

            break;

          case "CANCEL_ORDER":
            try {
              const isCancelled = orderbookData.orderbook.cancelOrder(
                orderData.orderId!
              );

              if (isCancelled) {
                await redisClient.xadd(
                  ORDER_CANCEL_STREAM,
                  "*",
                  ...Object.entries(orderData).flat()
                );
              }
            } catch (removeError) {
              console.error(
                "❌ Error removing order from orderbook:",
                removeError
              );
            }

            break;

          default:
            console.log("❓ Unknown event type:", orderData.event);
        }
      } else {
        let orderbookData: IOrderbookData;
        const [baseAsset, quoteAsset] = orderData.pair.split("-");
        if (!baseAsset || !quoteAsset) {
          console.error("invalid pair");
          return;
        }

        const orderbook = new Orderbook(baseAsset, quoteAsset);
        orderbookData = {
          clients: [],
          orderbook,
        };
        orderbookMap.set(orderData.pair, orderbookData);

        switch (orderData.event) {
          case "CREATE_ORDER":
            console.log("✅ Adding order to orderbook:", orderData);

            try {
              orderbookData.orderbook.addOrder(orderData);
            } catch (addError) {
              console.error("❌ Error adding order to orderbook:", addError);
            }

            break;

          case "CANCEL_ORDER":
            try {
              const isCancelled = orderbookData.orderbook.cancelOrder(
                orderData.orderId!
              );

              if (isCancelled) {
                await redisClient.xadd(
                  ORDER_CANCEL_STREAM,
                  "*",
                  ...Object.entries(orderData).flat()
                );
              } else {
                //will send error by pubsub
                console.error("error cannot be cancelled");
              }
            } catch (removeError) {
              console.error(
                "❌ Error removing order from orderbook:",
                removeError
              );
            }

            break;

          default:
            console.log("❓ Unknown event type:", orderData.event);
        }
      }
    } catch (error) {
      console.error("❌ Error processing message:", error);
      console.error("📄 Raw message that failed to parse:", message);
    }
  });

  subscriber.on("error", (error) => {
    console.error("❌ Subscriber error:", error);
  });

  subscriber.on("subscribe", (channel, count) => {
    console.log(
      `✅ Successfully subscribed to channel: ${channel} (total: ${count})`
    );
  });

  subscriber.on("unsubscribe", (channel, count) => {
    console.log(
      `❌ Unsubscribed from channel: ${channel} (remaining: ${count})`
    );
  });

  initializeSubscriber();

  wss.on("connection", async (ws, req) => {
    const ticker = req.url?.split("?ticker=")[1];

    if (!ticker) {
      ws.send(
        JSON.stringify({
          type: "ERROR",
          message: "No Ticker Found!",
        })
      );
      return;
    }

    const [baseAsset, quoteAsset] = ticker.split("-");

    if (!baseAsset || !quoteAsset || !SUPPORTED_PAIRS.includes(ticker)) {
      ws.send(
        JSON.stringify({
          type: "ERROR",
          message: "Invalid Ticker",
        })
      );
      return;
    }

    let orderbookData: IOrderbookData;

    if (!orderbookMap.has(ticker)) {
      const orderbook = new Orderbook(baseAsset, quoteAsset);
      orderbookData = {
        orderbook,
        clients: [],
      };
      orderbookMap.set(ticker, orderbookData);
    } else {
      orderbookData = orderbookMap.get(ticker) as IOrderbookData;
    }

    orderbookData.clients.push(ws);

    console.log(`Client connected for ticker: ${ticker}`);

    ws.on("error", (err) => {
      console.error(err.message);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "ERROR",
            message: err.message,
          })
        );
      }
    });

    ws.on("close", () => {
      orderbookData.clients = orderbookData.clients.filter((c) => c !== ws);
      console.log(`Client disconnected for ticker: ${ticker}`);
    });
  });

  wss.on("listening", () => {
    console.log("Matching engine server is running on ws://localhost:8080");
  });
};
