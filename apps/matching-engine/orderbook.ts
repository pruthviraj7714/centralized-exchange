import type { IOrderResponse, ITrade } from "./types";

class Orderbook {
  bids: IOrderResponse[];
  asks: IOrderResponse[];
  bestBid: number;
  bestAsk: number;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: number;
  highPrice24h: number;
  lowPrice24h: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  tradeHistory: ITrade[];

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
    this.tradeHistory = [];
  }

  private sortOrders(orders: IOrderResponse[], side: "BUY" | "SELL") {
    if (side === "BUY") {
      orders.sort((a, b) =>
        a.price === b.price ? a.createdAt - b.createdAt : b.price - a.price
      );
    } else {
      orders.sort((a, b) =>
        a.price === b.price ? a.createdAt - b.createdAt : a.price - b.price
      );
    }
  }

  private matchOrders(
    taker: IOrderResponse,
    oppositeOrderbook: IOrderResponse[],
    isBuy: boolean
  ) {
    let i = 0;
    let trades: ITrade[] = [];
    let makers: IOrderResponse[] = [];
    let remainingQty = taker.quantity;
    while (i < oppositeOrderbook.length && remainingQty > 0) {
      const maker = oppositeOrderbook[i];

      if (taker.type === "LIMIT") {
        if (isBuy && maker?.price! > taker.price!) break;
        if (!isBuy && maker?.price! < taker.price!) break;
      }

      const trade = isBuy
        ? this.executeTrade(taker, maker!)
        : this.executeTrade(maker!, taker);

      trades.push(trade);
      remainingQty -= trade.quantity;

      if (maker?.quantity! <= 0) {
        makers.push(maker!);
        oppositeOrderbook.splice(i, 1);
      } else {
        i++;
      }
    }

    return {
      makers,
      remainingQty,
      trades: trades && trades.length > 0 ? trades : [],
    };
  }

  addOrder(order: IOrderResponse): {
    taker: IOrderResponse | null;
    makers: IOrderResponse[];
    trades: ITrade[];
  } {
    const isBuy = order.side === "BUY";
    const book = isBuy ? this.asks : this.bids;

    const { makers, remainingQty, trades } = this.matchOrders(
      order,
      book,
      isBuy
    );

    let orderData: IOrderResponse | null = null;
    orderData = {
      ...order,
      status:
        remainingQty === 0
          ? "FILLED"
          : remainingQty < order.quantity
            ? "PARTIALLY_FILLED"
            : "OPEN",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      filledQuantity: order.quantity - remainingQty,
    };
    if (remainingQty > 0) {
      order.quantity = remainingQty;
      if (isBuy) {
        this.bids.push(orderData as IOrderResponse);
        this.sortOrders(this.bids, "BUY");
      } else {
        this.asks.push(orderData as IOrderResponse);
        this.sortOrders(this.asks, "SELL");
      }
    }
    return {
      taker: orderData ? orderData : null,
      makers,
      trades: trades && trades.length > 0 ? trades : [],
    };
  }

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

  getBids(): IOrderResponse[] {
    this.sortOrders(this.bids, "BUY");
    return this.bids;
  }

  getAsks(): IOrderResponse[] {
    this.sortOrders(this.asks, "SELL");
    return this.asks;
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
    const price = bid.createdAt < ask.createdAt ? bid.price : ask.price;

    const trade: ITrade = {
      id: crypto.randomUUID(),
      price,
      quantity: tradeQty,
      pair: bid.pair,
      type: bid.type === "MARKET" || ask.type === "MARKET" ? "MARKET" : "LIMIT",
      executedAt: Date.now(),
      bidId: bid.id!,
      askId: ask.id!,
    };

    this.tradeHistory.push(trade);
    this.lastPrice = price;
    this.highPrice24h = Math.max(this.highPrice24h, price);
    this.lowPrice24h = Math.min(this.lowPrice24h, price);

    bid.quantity -= tradeQty;
    ask.quantity -= tradeQty;

    bid.filledQuantity = (bid.filledQuantity || 0) + tradeQty;
    ask.filledQuantity = (ask.filledQuantity || 0) + tradeQty;

    return trade;
  }
}

export default Orderbook;
