export type OrderEvent =
  | {
      event: "CREATE_ORDER";
      requestId: string;
      side: "BUY" | "SELL";
      type: "LIMIT" | "MARKET";
      status : "OPEN" | "FILLED" | "PARTIAL" | "CANCELLED"
      userId: string;
      streamId?: string;
      quantity: string;
      price: string;
      orderId?: never;
      pair: string;
      timestamp: number;
    }
  | {
      event: "CANCEL_ORDER";
      requestId: string;
      userId: string;
      orderId: string;
      timestamp: number;
      streamId?: string;
      side?: never;
      pair?: never;
    };
