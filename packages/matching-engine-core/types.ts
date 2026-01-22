import type Decimal from "decimal.js";

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
