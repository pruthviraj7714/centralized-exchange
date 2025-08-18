import redisClient from "@repo/redisclient";
import type { IOrderbookData, IOrderResponse, ORDER_STATUS } from "./types";
import { orderbookMap } from "./ws-server";
import { PERSISTENCE_STREAM } from "./config";
import Orderbook from "./orderbook";

const subscriber = redisClient.duplicate();

export const initializeSubscriber = async (): Promise<void> => {
  try {
    console.log("Connecting subscriber to Redis...");
    
    subscriber.on("connect", () => {
      console.log("Subscriber connection established");
    });
    
    subscriber.on("ready", () => {
      console.log("Subscriber is ready");
    });
    
    subscriber.on("error", (error) => {
      console.error("Subscriber error:", error);
    });
    
    subscriber.on("end", () => {
      console.log("Subscriber connection ended");
    });
    
    subscriber.on("reconnecting", () => {
      console.log("Subscriber reconnecting...");
    });

    subscriber.on("subscribe", (channel, count) => {
      console.log(`Successfully subscribed to channel: ${channel} (total: ${count})`);
    });

    subscriber.on("unsubscribe", (channel, count) => {
      console.log(`Unsubscribed from channel: ${channel} (remaining: ${count})`);
    });

    subscriber.on("message", handleOrderMessage);
    
    console.log("Subscribing to order-events channel...");
    await subscriber.subscribe("order-events");
    console.log("Successfully subscribed to order-events channel");
    
  } catch (error) {
    console.error("Failed to initialize subscriber:", error);
    throw error;
  }
};

const handleOrderMessage = async (channel: string, message: string): Promise<void> => {
  try {
    const orderData = JSON.parse(message) as IOrderResponse;

    if (!orderData.pair) {
      console.error("Missing pair in order data:", orderData);
      return;
    }

    const ticker = orderData.pair;
    let orderbookData = getOrCreateOrderbook(ticker, orderData);

    if (!orderbookData) {
      console.error("Failed to get or create orderbook for ticker:", ticker);
      return;
    }

    await processOrderEvent(orderbookData, orderData);
    
  } catch (error) {
    console.error("Error processing message:", error);
    console.error("📄 Raw message that failed to parse:", message);
  }
};

const getOrCreateOrderbook = (ticker: string, orderData: IOrderResponse): IOrderbookData | null => {
  if (orderbookMap.has(ticker)) {
    return orderbookMap.get(ticker)!;
  }

  const [baseAsset, quoteAsset] = ticker.split("-");
  if (!baseAsset || !quoteAsset) {
    console.error("Invalid pair format:", ticker);
    return null;
  }

  const orderbook = new Orderbook(baseAsset, quoteAsset);
  const orderbookData: IOrderbookData = {
    clients: [],
    orderbook,
  };
  
  orderbookMap.set(ticker, orderbookData);
  console.log(`📚 Created new orderbook for ${ticker}`);
  
  return orderbookData;
};

const processOrderEvent = async (orderbookData: IOrderbookData, orderData: IOrderResponse): Promise<void> => {
  try {
    switch (orderData.event) {
      case "CREATE_ORDER":
        await handleCreateOrder(orderbookData, orderData);
        break;

      case "CANCEL_ORDER":
        await handleCancelOrder(orderbookData, orderData);
        break;

      default:
        console.warn("Unknown event type:", orderData.event);
    }
  } catch (error) {
    console.error("Error processing order event:", error);
  }
};

const handleCreateOrder = async (orderbookData: IOrderbookData, orderData: IOrderResponse): Promise<void> => {
  try {
    console.log("Processing CREATE_ORDER:", orderData);

    const result = orderbookData.orderbook.addOrder(orderData);
    
    if (!result) {
      console.error("Failed to add order - no result returned");
      return;
    }

    const { trades, order } = result;

    if (!order && (!trades || trades.length === 0)) {
      console.error("Order placement failed - no order or trades created");
      return;
    }

    if (trades && trades.length > 0) {
      await persistTrades(trades);
    }

    if (!trades && order) {
      await persistOrder(order, "Order.Create", "OPEN");
    }else if(trades && order && order.quantity > 0) {
      await persistOrder(order, "Order.Create", "PARTIAL");
    }else {
      await persistOrder(order, "Order.Create", "FILLED");
    }

    console.log("Order processed successfully");
    
  } catch (error) {
    console.error("Error handling CREATE_ORDER:", error);
    throw error;
  }
};

const handleCancelOrder = async (orderbookData: IOrderbookData, orderData: IOrderResponse): Promise<void> => {
  try {
    if (!orderData.orderId) {
      console.error("Missing orderId for CANCEL_ORDER");
      return;
    }

    const isCancelled = orderbookData.orderbook.cancelOrder(orderData.orderId);

    if (isCancelled) {
      await persistOrder(orderData, "Order.Cancel", "CANCELLED");
      console.log("Order cancelled successfully:", orderData.orderId);
    } else {
      console.warn("Order not found or already cancelled:", orderData.orderId);
    }
    
  } catch (error) {
    console.error("Error handling CANCEL_ORDER:", error);
    throw error;
  }
};

const persistTrades = async (trades: any[]): Promise<void> => {
  try {
    const persistPromises = trades.map(async (trade) => {
      const tradeData = {
        ...trade,
        event: "Create.Trade"
      };
      
      return redisClient.xadd(
        PERSISTENCE_STREAM, 
        "*", 
        "data", 
        JSON.stringify(tradeData)
      );
    });

    await Promise.all(persistPromises);
    console.log(`Persisted ${trades.length} trades`);
    
  } catch (error) {
    console.error("Error persisting trades:", error);
    throw error;
  }
};

const persistOrder = async (order: any, eventType: string, orderStatus : ORDER_STATUS): Promise<void> => {
  try {
    const orderData = {
      ...order,
      status : orderStatus,
      event: eventType
    };
    
    await redisClient.xadd(
      PERSISTENCE_STREAM,
      "*",
      "data",
      JSON.stringify(orderData)
    );
    
    console.log(`Persisted order with event: ${eventType}`);
    
  } catch (error) {
    console.error(`Error persisting order (${eventType}):`, error);
    throw error;
  }
};

export { subscriber };