export interface CreateOrderEvent {
  type: "CREATE_ORDER";
  orderId: string;
  userId: string;
  pair: string;
  side: "BUY" | "SELL";
  orderType: "LIMIT" | "MARKET";
  price?: string;
  quantity: string;
  timestamp: number;
}
