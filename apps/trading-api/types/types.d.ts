import type {
  ORDER_STATUS,
  ORDER_TYPE,
  SIDE,
} from "@repo/db/generated/prisma/enums";

export interface IOrder {
  id: string;
  clientOrderId: string;
  originalQuantity: Decimal;
  remainingQuantity: Decimal;
  quoteAmount: Decimal;
  quoteRemaining: Decimal;
  quoteSpent: Decimal;
  price: Decimal;
  side: SIDE;
  type: ORDER_TYPE;
  userId: string;
  status: ORDER_STATUS;
  marketId: string;
  createdAt: Date;
  updatedAt: Date;
}
