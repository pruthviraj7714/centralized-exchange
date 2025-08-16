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
  side: "BUY" | "SELL";
  pair: string;
  executedAt: number;
  userId: string;
}

export interface IOrderResponse {
  id: string;
  requestId : string;
  userId: string;
  side: "BUY" | "SELL";
  pair: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  createdAt: Date;
  updatedAt: Date;
  event? : "ORDER_CREATED" | "ORDER_CANCELLED"
  type: "LIMIT" | "MARKET";
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
}