import type Decimal from "decimal.js"
import type Orderbook from "../../../packages/matching-engine-core/engine/Orderbook";

export type ORDER_STATUS = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";

export type Side = "BUY" | "SELL";

export type OrderType = "LIMIT" | "MARKET"

export type EngineOrder = {
  id: string;
  userId: string;
  side: Side;
  price: Decimal | null; // null for MARKET
  quantity: Decimal;
  pair : string;
  quoteAmount: Decimal | null;
  quoteRemaining: Decimal | null;
  quoteSpent : Decimal | null;
  marketId : string;
  filled: Decimal;
  type : OrderType;
  status: ORDER_STATUS;
  createdAt: number;
};

export type Trade = {
  buyOrderId: string
  sellOrderId: string
  price: Decimal
  marketId: string
  pair: string
  quantity: Decimal
  timestamp: number
}

export interface IOrder {
  id: string;
  type: OrderType;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  requestId: string;
  pair: string;
  createdAt: number;
  userId: string;
}

export interface IOrderbookData {
  orderbook: Orderbook;
  clients: WebSocket[];
}

export interface ITrade {
  id: string;
  price: number;
  quantity: number;
  type: "LIMIT" | "MARKET";
  bidId: string;
  askId: string;
  pair: string;
  executedAt: number;
}

export type OrderEvent =
  | {
    marketId: string
    status: "OPEN" | "PENDING",
    originalQuantity?: string,
    remainingQuantity?: string,
    quoteSpent?: string,
    quoteAmount: string,
    quoteRemaining: string,
    createdAt: string,
    updatedAt: string,
    event: "CREATE_ORDER",
    side: "BUY" | "SELL";
    type: "LIMIT" | "MARKET";
    userId: string;
    id: string;
    price: string;
    orderId?: never;
    pair: string;
    timestamp: number;
  }
  | {
    event: "CANCEL_ORDER";
    userId: string;
    orderId: string;
    timestamp: number;
    side?: never;
    pair?: never;
  } | {
    event : "ORDER_EXPIRED";
    orderId: string;
    timestamp: number;
    pair?: never;
    userId?: never;
  };
