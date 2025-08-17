import type WebSocket from "ws";
import type Orderbook from "./orderbook";

export interface IOrder {
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

export interface IOrderResponse {
  id: string;
  requestId: string;
  userId: string;
  side: "BUY" | "SELL";
  pair: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  createdAt: Date;
  orderId?: string;
  updatedAt: Date;
  streamId: string;
  event?: "CREATE_ORDER" | "CANCEL_ORDER";
  type: "LIMIT" | "MARKET";
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
}

export type OrderEvent =
  | {
      event: "CREATE_ORDER";
      requestId: string;
      side: "BUY" | "SELL";
      type: "LIMIT" | "MARKET";
      userId: string;
      streamId?: string;
      quantity: string;
      price: string;
      orderId?: never;
      pair: string;
      timestamp: number;
    }
  | {
      event: "CANCEL_ORDER";
      requestId: string;
      userId: string;
      orderId: string;
      timestamp: number;
      streamId?: string;
      side?: never;
      pair?: never;
    };
