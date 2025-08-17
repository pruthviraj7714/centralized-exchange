import type { IOrderResponse, ITrade } from "./types";

class Orderbook {
  bids: IOrderResponse[];
  asks: IOrderResponse[];
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

  private sortOrders(orders: IOrderResponse[], side: "BUY" | "SELL") {
    if (side === "BUY") {
      orders.sort((a, b) =>
        a.price === b.price
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.price - a.price
      );
    } else {
      orders.sort((a, b) =>
        a.price === b.price
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : a.price - b.price
      );
    }
  }

  addOrder(order: IOrderResponse) {}

  cancelOrder(orderId: string): boolean {
    const isBuyOrder = this.bids.find((b) => b.id === orderId);

    if (isBuyOrder) {
      this.bids = this.bids.filter((b) => b.id !== orderId);
      return true;
    }

    const isSellorder = this.asks.find((b) => b.id === orderId);

    if (isSellorder) {
      this.asks = this.asks.filter((a) => a.id !== orderId);
      return true;
    }

    return false;
  }

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

  private executeTrade(bid: IOrderResponse, ask: IOrderResponse): ITrade {
    const tradeQty = Math.min(bid.quantity, ask.quantity);
    const price = ask.price;

    const trade: ITrade = {
      id: crypto.randomUUID(),
      price,
      quantity: tradeQty,
      pair: bid.pair,
      type: "LIMIT",
      executedAt: Date.now(),
      bidId: bid.id,
      askId: ask.id,
    };

    this.tradeHisotry.push(trade);

    bid.quantity -= tradeQty;
    ask.quantity -= tradeQty;

    return trade;
  }
}

export default Orderbook;
