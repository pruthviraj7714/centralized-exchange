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
