type BaseEvent = {
  requestId: string;
  userId: string;
  streamId: string;
  timestamp: number;
};

export type OrderEvent =
  | (BaseEvent & {
      event: "Order.Create";
      side: "BUY" | "SELL";
      type: "LIMIT" | "MARKET";
      status: "FILLED" | "PARTIAL" | "OPEN" | "CANCELLED";
      quantity: number;
      price: number;
      pair: string;
      orderId?: string;
    })
  | (BaseEvent & {
      event: "Order.Cancel";
      orderId: string;
    })
  | (BaseEvent & {
      event: "Trade.Create";
      orderId: string;
      quantity: number;
      price: number;
      pair: string;
      bidId: string;
      askId: string;
      executedAt: number;
    });
