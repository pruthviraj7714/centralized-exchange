export interface ICancelOrder {
    id: string;
    streamId : string;
    event : "CANCEL_ORDER" | "CREATE_ORDER"
    requestId: string;
    userId: string;
    orderId: string;
    timestamp: number;
  }
  
  export interface ICancelOrderResponse {
    id: string;
    userId: string;
    side: "BUY" | "SELL";
    pair: string;
    price: number;
    quantity: number;
    filledQuantity: number;
    createdAt: Date;
    updatedAt: Date;
    event? : "ORDER_CREATED" | "ORDER_CANCELLED"
    type: "LIMIT" | "MARKET";
    status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
  }
  