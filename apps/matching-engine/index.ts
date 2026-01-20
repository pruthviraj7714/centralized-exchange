import { MatchEngine } from "./engine/MatchEngine";
import type { EngineOrder, Trade } from "./engine/types";
import type { OrderEvent } from "./types";
import Decimal from "decimal.js";
import { createConsumer } from "@repo/kafka/src/consumer";

interface OrderbookData {
  engine: MatchEngine;
  lastTrades: Trade[];
}

// Global order index for efficient lookups
const orderIndex = new Map<string, { pair: string; side: "BUY" | "SELL" }>();
const orderbookMap: Map<string, OrderbookData> = new Map();

const getOrCreateOrderbookData = (pair: string): OrderbookData => {
  if (orderbookMap.has(pair)) {
    return orderbookMap.get(pair)!;
  }

  const engine = new MatchEngine();

  // Set up trade event listener
  engine.on("trade", (trade: Trade) => {
    console.log(`Trade executed on ${pair}:`, trade);

    // Add to recent trades
    const orderbookData = orderbookMap.get(pair);
    if (orderbookData) {
      orderbookData.lastTrades.unshift(trade);
      if (orderbookData.lastTrades.length > 100) {
        orderbookData.lastTrades = orderbookData.lastTrades.slice(0, 100);
      }
    }
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
      price: data.type === "MARKET" ? null : new Decimal(data.price),
      quantity: new Decimal(data.quantity),
      filled: new Decimal(0),
      createdAt: data.timestamp
    };
  }
  return null;
};

function processOrder(data: OrderEvent): boolean {
  try {
    if (data.event === "CREATE_ORDER") {
      const engineOrder = parseOrderEvent(data);
      if (!engineOrder) return false;

      // Add to order index for efficient lookup
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
      // Use order index for efficient lookup
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

// Public API for the matching engine
export class MatchingEngineService {
  // Process a single order event
  static processOrderEvent(data: OrderEvent): boolean {
    return processOrder(data);
  }

  // Get current orderbook state for a pair
  static getOrderbook(pair: string) {
    const orderbookData = orderbookMap.get(pair);
    return orderbookData ? orderbookData.engine.getOrderbook() : null;
  }

  // Get recent trades for a pair
  static getRecentTrades(pair: string): Trade[] {
    const orderbookData = orderbookMap.get(pair);
    return orderbookData ? orderbookData.lastTrades : [];
  }

  // Get all active pairs
  static getActivePairs(): string[] {
    return Array.from(orderbookMap.keys());
  }

  // Subscribe to trade events for a specific pair
  static subscribeToTrades(pair: string, callback: (trade: Trade) => void): () => void {
    const { engine } = getOrCreateOrderbookData(pair);
    engine.on("trade", callback);
    return () => engine.off("trade", callback);
  }

  // Add order directly (for testing)
  static addOrder(pair: string, order: EngineOrder): void {
    const orderbookData = getOrCreateOrderbookData(pair);
    orderbookData.engine.addOrder(order);
  }

  // Cancel order directly (for testing)
  static cancelOrder(pair: string, orderId: string, side: "BUY" | "SELL"): boolean {
    const orderbookData = orderbookMap.get(pair);
    if (!orderbookData) return false;

    const cancelled = orderbookData.engine.cancelOrder(orderId, side);
    if (cancelled) {
      orderIndex.delete(orderId);
    }
    return cancelled;
  }

  // Clear all data (for testing)
  static clearAll(): void {
    orderbookMap.clear();
    orderIndex.clear();
  }

  // Get order index size (for monitoring)
  static getOrderIndexSize(): number {
    return orderIndex.size;
  }
}


async function main() {
  const consumer = createConsumer("matching-engine");

  await consumer.subscribe({ topic: "orders.create" });
  await consumer.subscribe({ topic: "orders.cancel" });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const event = JSON.parse(message.value?.toString() || "");
      console.log("Received message:", event);
      MatchingEngineService.processOrderEvent(event);
      console.log("Orderbook:", MatchingEngineService.getOrderbook(event.pair));
      console.log("Recent trades:", MatchingEngineService.getRecentTrades(event.pair));
      console.log("Active pairs:", MatchingEngineService.getActivePairs());
    }
  });
}

main();


