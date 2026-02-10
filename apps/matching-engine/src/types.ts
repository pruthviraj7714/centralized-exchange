import type Decimal from "decimal.js"
import type Orderbook from "../../../packages/matching-engine-core/engine/Orderbook";

export type ORDER_STATUS = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";

export type Side = "BUY" | "SELL";

export type EngineOrder = {
  id: string;
  userId: string;
  side: Side;
  price: Decimal | null; // null for MARKET
  quantity: Decimal;
  pair : string;
  marketId : string;
  filled: Decimal;
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
  type: "LIMIT" | "MARKET";
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
    status: "OPEN",
    originalQuantity: string,
    remainingQuantity: string,
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
  };
