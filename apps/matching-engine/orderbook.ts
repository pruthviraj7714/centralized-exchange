import type { IOrder, ITrade } from "./types";

class Orderbook {
  bids: IOrder[];
  asks: IOrder[];
  bestBid: number;
  bestAsk: number;
  baseAsset: string;
  lastPrice: number;
  highPrice24h: number;
  lowPrice24h: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  quoteAsset: string;
  tradeHisotry: ITrade[];

  constructor(baseAsset: string, quoteAsset: string) {
    this.baseAsset = baseAsset;
    this.quoteAsset = quoteAsset;
    this.lastPrice = 0;
    this.highPrice24h = 0;
    this.lowPrice24h = 0;
    this.volume24h = 0;
    this.priceChange24h = 0;
    this.priceChangePercent24h = 0;
    this.bestAsk = 0;
    this.bestBid = 0;
    this.bids = [];
    this.asks = [];
    this.tradeHisotry = [];
  }

  private sortOrders(orders: IOrder[], side: "BUY" | "SELL") {
    if (side === "BUY") {
      orders.sort((a, b) =>
        a.price === b.price
          ? a.createdAt - b.createdAt
          : b.quantity - a.quantity
      );
    } else {
      orders.sort((a, b) =>
        a.price === b.price
          ? a.createdAt - b.createdAt
          : a.quantity - b.quantity
      );
    }
  }

  addOrder(order: IOrder) {}

  cancelOrder(orderId: string) {}

  getTicker() {
    return {
      ticker: `${this.baseAsset}-${this.quoteAsset}`,
      bestAsk: this.bestAsk,
      bestBid: this.bestBid,
      lastPrice: this.lastPrice,
      highPrice24h: this.highPrice24h,
      lowPrice24h: this.lowPrice24h,
      volume24h: this.volume24h,
      priceChange24h: this.priceChange24h,
      priceChangePercent24h: this.priceChangePercent24h,
      timestamp: Date.now(),
    };
  }

  executeTrade() {}
}

export default Orderbook;
