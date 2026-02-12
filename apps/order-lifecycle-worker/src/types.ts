import { Decimal } from "decimal.js";

export interface IOrder {
    id : string;
    price : Decimal | null;
    originalQuantity : Decimal;
    remainingQuantity : Decimal;
    side : "BUY" | "SELL";
    type : "LIMIT" | "MARKET";
    status : "PENDING" | "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
    createdAt : Date;
    updatedAt : Date;
    userId : string;
    marketId : string;
}