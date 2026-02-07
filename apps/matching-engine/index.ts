import { MatchEngine, OrderQueue } from "@repo/matching-engine-core";
import type { EngineOrder, OrderEvent, Trade } from "./types";
import Decimal from "decimal.js";
import { createConsumer } from "@repo/kafka/src/consumer";
import { producer } from "@repo/kafka/src/producer";
import { TOPICS } from "@repo/kafka/src/topics";

await producer.connect();

interface OrderbookData {
  engine: MatchEngine;
  lastTrades: Trade[];
}

const orderIndex = new Map<string, { pair: string; side: "BUY" | "SELL" }>();
const orderbookMap: Map<string, OrderbookData> = new Map();

function debugOrderBook(ob:  {
    bids: Map<string, OrderQueue>;
    asks: Map<string, OrderQueue>;
} | null) {
  console.log("---- ORDERBOOK ----");

  console.log("BIDS:");
  for (const [price, queue] of ob?.bids.entries() || []) {
    console.log(`  ${price} -> ${queue.size()} orders`);
  }

  console.log("ASKS:");
  for (const [price, queue] of ob?.asks.entries() || []) {
    console.log(`  ${price} -> ${queue.size()} orders`);
  }

  console.log("-------------------");
}

const sendTradeToKafka = async (trade: Trade) => {

  const event = {
    ...trade,
    event: "TRADE_EXECUTED",
    executedAt : Date.now(),
  }

  await producer.send({
    topic : TOPICS.TRADE_EXECUTED,
    messages: [
      {
        key : trade.pair,
        value : JSON.stringify(event)
      }
    ]
  })
};

const sendUpdatedOrderToKafka = async (order: EngineOrder) => {
   const event = {
    event: "ORDER_UPDATED",
    orderId: order.id,
    pair: order.pair,
    userId: order.userId,
    price : order.price,
    side: order.side,
    status: order.status,
    filledQuantity: order.filled.toString(),
    remainingQuantity: order.quantity.sub(order.filled).toString(),
    updatedAt: Date.now()
  };
  
  await producer.send({
    topic : TOPICS.ORDER_UPDATED,
    messages: [
      {
        key : order.pair,
        value : JSON.stringify(event)
      }
    ]
  })
};

const sendCanceledOrderToKafka = async (order: EngineOrder) => {
   const event = {
    event: "ORDER_CANCELED",
    orderId: order.id,
    pair: order.pair,
    userId: order.userId,
    price : order.price,
    side: order.side,
    status: order.status,
    filledQuantity: order.filled.toString(),
    remainingQuantity: order.quantity.sub(order.filled).toString(),
    updatedAt: Date.now()
  };
  
  await producer.send({
    topic : TOPICS.ORDER_CANCEL,
    messages: [
      {
        key : order.pair,
        value : JSON.stringify(event)
      }
    ]
  })
};

const getOrCreateOrderbookData = (pair: string): OrderbookData => {
  if (orderbookMap.has(pair)) {
    return orderbookMap.get(pair)!;
  }

  const engine = new MatchEngine();

  engine.on("trade", (trade: Trade) => {
    sendTradeToKafka(trade);
    
    const orderbookData = orderbookMap.get(pair);
    if (orderbookData) {
      orderbookData.lastTrades.unshift(trade);
      if (orderbookData.lastTrades.length > 100) {
        orderbookData.lastTrades = orderbookData.lastTrades.slice(0, 100);
      }
    }
  });

  engine.on("order_updated",  (order: EngineOrder) => {
    if (order.status === "FILLED" || order.status === "CANCELLED") {
      orderIndex.delete(order.id);
    }
    sendUpdatedOrderToKafka(order);
  });

  engine.on("order_removed",  (order: EngineOrder) => {
    orderIndex.delete(order.id);
    sendCanceledOrderToKafka(order);
  });

  const orderbookData: OrderbookData = {
    engine,
    lastTrades: []
  };

  orderbookMap.set(pair, orderbookData);
  console.log(`Created new orderbook for ${pair}`);

  return orderbookData;
};

const parseOrderEvent = (data: OrderEvent): EngineOrder | null => {
  if (data.event === "CREATE_ORDER") {
    return {
      id: data.id,
      userId: data.userId,
      side: data.side,
      marketId : data.marketId,
      price: data.type === "MARKET" ? null : new Decimal(data.price),
      quantity: new Decimal(data.originalQuantity),
      pair: data.pair,
      filled: new Decimal(0),
      createdAt: data.timestamp,
      status: data.status
    };
  }
  return null;
};

function processOrder(data: OrderEvent): boolean {
  try {
    if (data.event === "CREATE_ORDER") {
      const engineOrder = parseOrderEvent(data);
      if (!engineOrder) return false;

      orderIndex.set(data.id, {
        pair: data.pair,
        side: data.side
      });

      const orderbookData = getOrCreateOrderbookData(data.pair);
      orderbookData.engine.addOrder(engineOrder);

      console.log(`Processed ${data.side} order ${data.id} for ${data.pair}`);
      return true;
    }

    if (data.event === "CANCEL_ORDER") {
      const meta = orderIndex.get(data.orderId);
      if (!meta) {
        console.log(`Order ${data.orderId} not found in index`);
        return false;
      }

      const orderbookData = orderbookMap.get(meta.pair);
      if (!orderbookData) {
        console.log(`Orderbook for ${meta.pair} not found`);
        return false;
      }

      const cancelled = orderbookData.engine.cancelOrder(data.orderId, meta.side);

      if (cancelled) {
        orderIndex.delete(data.orderId);
        console.log(`Cancelled order ${data.orderId}`);
        return true;
      } else {
        console.log(`Failed to cancel order ${data.orderId}`);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error("Error processing order:", data, error);
    return false;
  }
}

export class MatchingEngineService {
  static processOrderEvent(data: OrderEvent): boolean {
    return processOrder(data);
  }

  static getOrderbook(pair: string) {
    const orderbookData = orderbookMap.get(pair);
    return orderbookData ? orderbookData.engine.getOrderbook() : null;
  }

  static getRecentTrades(pair: string): Trade[] {
    const orderbookData = orderbookMap.get(pair);
    return orderbookData ? orderbookData.lastTrades : [];
  }

  static getActivePairs(): string[] {
    return Array.from(orderbookMap.keys());
  }

  static subscribeToTrades(pair: string, callback: (trade: Trade) => void): () => void {
    const { engine } = getOrCreateOrderbookData(pair);
    engine.on("trade", callback);
    return () => engine.off("trade", callback);
  }

  static addOrder(pair: string, order: EngineOrder): void {
    const orderbookData = getOrCreateOrderbookData(pair);
    orderbookData.engine.addOrder(order);
  }

  static cancelOrder(pair: string, orderId: string, side: "BUY" | "SELL"): boolean {
    const orderbookData = orderbookMap.get(pair);
    if (!orderbookData) return false;

    const cancelled = orderbookData.engine.cancelOrder(orderId, side);
    if (cancelled) {
      orderIndex.delete(orderId);
    }
    return cancelled;
  }

  static clearAll(): void {
    orderbookMap.clear();
    orderIndex.clear();
  }

  static getOrderIndexSize(): number {
    return orderIndex.size;
  }
}

async function main() {
  const consumer = createConsumer("matching-engine");

  await consumer.subscribe({ topic: "orders.create" });
  await consumer.subscribe({ topic: "orders.cancel" });

  consumer.run({
    eachMessage: async ({ topic, message }) => {
      const event = JSON.parse(message.value?.toString() || "");
      console.log("Received message:", event);
      const result = MatchingEngineService.processOrderEvent(event);
      console.log("Result:", result);
      const ob = MatchingEngineService.getOrderbook(event.pair);

      debugOrderBook(ob);
      console.log("Active pairs:", MatchingEngineService.getActivePairs());
    }
  });
}

main();


