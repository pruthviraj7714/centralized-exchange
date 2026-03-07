import { Decimal } from "decimal.js";

export interface IOrder {
  id: string;
  price: Decimal | null;
  originalQuantity: Decimal;
  remainingQuantity: Decimal;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  status:
    | "NEW"
    | "OPEN"
    | "PARTIALLY_FILLED"
    | "CANCEL_REQUESTED"
    | "FILLED"
    | "CANCELLED"
    | "EXPIRED";
  createdAt: Date;
  updatedAt: Date;
  market: {
    symbol: string;
  };
  userId: string;
  marketId: string;
}
