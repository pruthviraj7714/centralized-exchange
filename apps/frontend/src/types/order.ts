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
  userId: string;
}

export type BottomTab = "OPEN_ORDERS" | "ORDER_HISTORY" | "TRADE_HISTORY";
