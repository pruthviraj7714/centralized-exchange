type BaseEvent = {
  requestId: string;
  userId: string;
  streamId: string;
  timestamp: number;
};

export type OrderEvent =
  | (BaseEvent & {
      event: "Order.CreateWithTrades";
      data: {
        makers: IOrderResponse[];
        taker: IOrderResponse;
        trades: ITrade[];
      };
      orderId? : string;
      streamId: string;
    })
  | (BaseEvent & {
      event: "Order.Cancel";
      orderId: string;
    });
  // | (BaseEvent & {
  //     event: "Trade.Create";
  //     orderId: string;
  //     quantity: number;
  //     price: number;
  //     pair: string;
  //     bidId: string;
  //     askId: string;
  //     executedAt: number;
  //   });

export type ORDER_STATUS = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";

export interface ITrade {
  id: string;
  price: number;
  quantity: number;
  type: "LIMIT" | "MARKET";
  bidId: string;
  askId: string;
  pair: string;
  executedAt: number;
}

export interface IOrderResponse {
  id?: string;
  requestId: string;
  userId: string;
  side: "BUY" | "SELL";
  pair: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  createdAt: number;
  orderId?: string;
  updatedAt: number;
  streamId: string;
  event?: "CREATE_ORDER" | "CANCEL_ORDER";
  type: "LIMIT" | "MARKET";
  status: ORDER_STATUS;
}
