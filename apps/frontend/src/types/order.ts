import Decimal from "decimal.js";

export interface IOrder {
  createdAt: Date;
  id: string;
  marketId: string;
  originalQuantity: string;
  price: string;
  remainingQuantity: string;
  side: "BUY" | "SELL";
  status: "OPEN" | "FILLED" | "CANCELLED";
  type: "LIMIT" | "MARKET";
  updatedAt: Date;
  quoteAmount: string;
  quoteRemaining: string;
  quoteSpent: string;
  userId: string;
}

export interface PlaceOrderPayload {
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity: Decimal;
  price?: Decimal;
  ticker: string;
  token: string;
  clientOrderId: string;
  quoteAmount?: Decimal;
}

export type BottomTab = "OPEN_ORDERS" | "ORDER_HISTORY" | "TRADE_HISTORY";
