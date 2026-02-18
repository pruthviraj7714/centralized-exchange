import type Decimal from "decimal.js";

export type ORDER_STATUS = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "EXPIRED" | "PENDING";

export type Side = "BUY" | "SELL";

type OrderType = "LIMIT" | "MARKET";

export type EngineOrder = {
  id: string;
  userId: string;
  side: Side;
  price: Decimal | null; // null for MARKET
  type : OrderType;
  quoteSpent : Decimal | null;
  quoteAmount : Decimal | null;
  quoteRemaining : Decimal | null;
  quantity: Decimal;
  remainingQuantity: Decimal;
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
  quoteSpent : Decimal | null;
  quoteRemaining : Decimal | null;
  marketId: string
  pair: string
  quantity: Decimal
  timestamp: number
}
