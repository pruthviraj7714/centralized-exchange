import type Decimal from "decimal.js";


export interface TradeEvent {
  event : "TRADE_EXECUTED",
  marketId : string;
  buyOrderId : string;
  quoteSpent : Decimal | null;
  quoteRemaining : Decimal | null;
  sellOrderId : string;
  quantity : Decimal;
  price : Decimal;
  executedAt : Date;
}

export interface OrderEvent {
  event : "ORDER_UPDATED" | "ORDER_CANCELLED" | "ORDER_OPENED",
  userId : string;
  orderId : string;
  quoteSpent : string;
  price : string | null;
  type : "LIMIT" | "MARKET";
  quoteRemaining : string;
  side : "BUY" | "SELL";
  status : "FILLED" | "CANCELLED" | "PARTIALLY_FILLED" | "OPEN";
  remainingQuantity : string;
  updatedAt : Date;
  pair : string;
}