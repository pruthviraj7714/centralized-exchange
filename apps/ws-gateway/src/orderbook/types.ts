import type Decimal from "decimal.js";


export interface TradeEvent {
  event : "TRADE_EXECUTED",
  marketId : string;
  buyOrderId : string;
  sellOrderId : string;
  quantity : Decimal;
  price : Decimal;
  executedAt : Date;
}

export interface OrderEvent {
  event : "ORDER_UPDATED" | "ORDER_CANCELED",
  orderId : string;
  side : "BUY" | "SELL";
  status : "FILLED" | "CANCELLED" | "PARTIALLY_FILLED" | "OPEN";
  remainingQuantity : string;
  updatedAt : Date;
  pair : string;
  price : Decimal;
}