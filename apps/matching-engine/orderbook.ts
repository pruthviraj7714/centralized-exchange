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

  //new few fixes here TOOD: adding orders also first before trade
  addOrder(order: IOrderResponse): {
    taker: IOrderResponse | null;
    makers : IOrderResponse[],
    trades: ITrade[];
  } {
    if (order.side === "BUY") {
      let remainingQty = order.quantity;
      let i = 0;
      let trades: ITrade[] = [];
      let orgQty = order.quantity;
      while (i < this.asks.length && remainingQty > 0) {
        const currAsk = this.asks[i];

        if (currAsk?.price! > order.price) break;

        const trade = this.executeTrade(order, currAsk!);

        trades.push(trade);
        remainingQty -= trade.quantity;

        if (currAsk?.quantity! <= 0) {
          this.asks.splice(i, 1);
        } else {
          i++;
        }
      }
      let orderData : IOrderResponse | null = null;
      
      orderData = {
        streamId: order.streamId,
        status: remainingQty === 0 ? "FILLED" : remainingQty < orgQty ? "PARTIALLY_FILLED" : "OPEN",
        quantity: orgQty,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        filledQuantity: orgQty - remainingQty,
        side: order.side,
        type: order.type,
        requestId: order.requestId,
        pair: order.pair,
        userId: order.userId,
        event: "CREATE_ORDER",
        price: order.price,
      };
      if(remainingQty > 0) {
        this.bids.push(orderData as IOrderResponse);
      }

      return {
        taker: orderData ? orderData : null,
        trades: trades && trades.length > 0 ? trades : [],
      };
    } else if (order.side === "SELL") {
      let remainingQty = order.quantity;
      let i = 0;
      let orgQty = order.quantity;
      let trades: ITrade[] = [];
      while (i < this.bids.length && remainingQty > 0) {
        const currBid = this.bids[i];

        if (currBid?.price! > order.price) break;

        const trade = this.executeTrade(order, currBid!);
        trades.push(trade);
        remainingQty-= trade.quantity;
        
        if (trade.quantity >= remainingQty) break;

        if(currBid?.quantity! <= 0) {
          this.bids.splice(i, 1);
          break;
        }else {
          i++;
        }
      }

      const orderData: IOrderResponse = {
        streamId: order.streamId,
        status: remainingQty === 0 ? "FILLED" : remainingQty !== orgQty ? "PARTIALLY_FILLED" : "OPEN",
        quantity: orgQty,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        filledQuantity: orgQty - remainingQty,
        side: order.side,
        type: order.type,
        requestId: order.requestId,
        pair: order.pair,
        userId: order.userId,
        event: "CREATE_ORDER",
        price: order.price,
      };

      if(remainingQty > 0) this.asks.push(orderData);

      return {
        order: orderData ? orderData : null,
        trades: trades && trades.length > 0 ? trades : [],
      };
    }

    return {
      order: null,
      trades: [],
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
    const price = ask.price;

    const trade: ITrade = {
      id: crypto.randomUUID(),
      price,
      quantity: tradeQty,
      pair: bid.pair,
      type: "LIMIT",
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

    return trade;
  }
}

export default Orderbook;
