import Decimal from "decimal.js";

export interface IOrderBook {
  asks: IOrderBookOrder[];
  bids: IOrderBookOrder[];
}

export interface IOrderBookOrder {
  price: Decimal;
  quantity: Decimal;
  total: Decimal;
  requestId: string;
  orderCount: number;
}


export interface OrderbookLevel {
    price: string;
    totalQuantity: string;
    orderCount: number;
    orders: Array<{ orderId: string; quantity: string }>;
}

export interface OrderbookData {
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
    pair: string;
    timestamp: number;
}
