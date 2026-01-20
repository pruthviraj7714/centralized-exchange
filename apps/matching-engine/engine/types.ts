import type Decimal from "decimal.js"

export type Side = "BUY" | "SELL";

export type EngineOrder = {
  id: string;
  userId: string;
  side: Side;
  price: Decimal | null; // null for MARKET
  quantity: Decimal;
  filled: Decimal;
  createdAt: number;
};

export type Trade = {
    buyOrderId: string
    sellOrderId: string
    price: Decimal
    quantity: Decimal
    timestamp: number
  }