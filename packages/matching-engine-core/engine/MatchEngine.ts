import Orderbook from "./Orderbook";
import type { EngineOrder, Trade } from "../types";
import { EventEmitter } from "events";
import { Decimal } from "decimal.js";
import BTree from "sorted-btree";
import type { OrderQueue } from "./OrderQueue";

export interface OrderbookLevel {
  price: string;
  totalQuantity: string;
  orderCount: number;
  orders: Array<{ orderId: string; quantity: string }>;
}

export class MatchEngine extends EventEmitter {
  private orderbook: Orderbook;

  constructor() {
    super();
    this.orderbook = new Orderbook();
  }

  serializeOrderbook() {
    return this.orderbook.serialize();
  }

  treeToLevels(tree: BTree<Decimal, OrderQueue>): OrderbookLevel[] {
    const levels: OrderbookLevel[] = [];

    tree.forEach((queue, price) => {
      const orders = queue.toArray();

      let total = new Decimal(0);

      const formattedOrders: { orderId: string; quantity: string }[] = [];

      for (const order of orders) {
        const qty = order.quantity.minus(order.filled);

        if (qty.lte(0)) continue;

        total = total.plus(qty);

        formattedOrders.push({
          orderId: order.id,
          quantity: qty.toString(),
        });
      }

      if (total.lte(0)) return;

      levels.push({
        price: price.toString(),
        totalQuantity: total.toString(),
        orderCount: formattedOrders.length,
        orders: formattedOrders,
      });
    });

    return levels;
  }

  private finalizeOrder(order: EngineOrder) {
    if (order.type === "MARKET") {
      if (order.filled.eq(0)) {
        order.status = "CANCELLED";
        this.emit("order_cancelled", order);
        return;
      } else {
        order.status = "FILLED";
        this.emit("order_updated", order);
        return;
      }
    }

    if (order.filled.eq(0)) {
      order.status = "OPEN";
      this.emit("order_opened", order);
      return;
    } else if (order.filled.lt(order.quantity)) {
      order.status = "PARTIALLY_FILLED";
      this.emit("order_updated", order);
      return;
    } else {
      order.status = "FILLED";
      this.emit("order_updated", order);
      return;
    }
  }

  addOrder(order: EngineOrder): void {
    if (order.side === "BUY") {
      this.matchBuyOrder(order);
    } else {
      this.matchSellOrder(order);
    }
  }

  // private matchBuyOrder(buyOrder: EngineOrder): void {
  //   while (
  //     buyOrder.type === "MARKET"
  //       ? buyOrder.quoteRemaining!.gt(0)
  //       : buyOrder.filled.lt(buyOrder.quantity)
  //   ) {
  //     if (buyOrder.type === "MARKET") {
  //       if (!buyOrder.quoteRemaining || buyOrder.quoteRemaining.lte(0)) {
  //         this.finalizeOrder(buyOrder);
  //         return;
  //       }
  //     } else {
  //       if (buyOrder.filled.gte(buyOrder.quantity)) {
  //         this.finalizeOrder(buyOrder);
  //         return;
  //       }
  //     }

  //     const bestAsk = this.orderbook.getBestAsk();
  //     if (!bestAsk) {
  //       if (buyOrder.type === "MARKET") {
  //         this.finalizeOrder(buyOrder);
  //       } else {
  //         this.orderbook.addOrder(buyOrder);
  //         this.finalizeOrder(buyOrder);
  //       }
  //       return;
  //     }

  //     const sellOrder = bestAsk.queue.peek();
  //     if (!sellOrder) {
  //       this.orderbook.removePriceLevel("SELL", bestAsk.price);
  //       continue;
  //     }

  //     if (buyOrder.userId === sellOrder.userId) {
  //       this.orderbook.removeOrder(sellOrder.id);
  //       sellOrder.status = "CANCELLED";
  //       this.emit("order_removed", sellOrder);
  //       continue;
  //     }

  //     const price = bestAsk.price;
  //     const availableBase = sellOrder.quantity.minus(sellOrder.filled);

  //     let tradeBase: Decimal;

  //     if (buyOrder.type === "MARKET") {
  //       const affordableBase = buyOrder.quoteRemaining!.div(price);
  //       tradeBase = Decimal.min(availableBase, affordableBase);
  //     } else {
  //       if (price.gt(buyOrder.price!)) {
  //         this.orderbook.addOrder(buyOrder);
  //         this.finalizeOrder(buyOrder);
  //         return;
  //       }

  //       const remainingBase = buyOrder.quantity.minus(buyOrder.filled);
  //       tradeBase = Decimal.min(availableBase, remainingBase);
  //     }

  //     if (tradeBase.lte(0)) {
  //       if (
  //         buyOrder.type === "LIMIT" &&
  //         buyOrder.filled.lt(buyOrder.quantity)
  //       ) {
  //         this.orderbook.addOrder(buyOrder);
  //         this.finalizeOrder(buyOrder);
  //       }
  //       return;
  //     }

  //     this.executeTrade(buyOrder, sellOrder, price, tradeBase);

  //     if (sellOrder.filled.eq(sellOrder.quantity)) {
  //       this.orderbook.removeOrder(sellOrder.id);
  //       sellOrder.status = "FILLED";
  //       this.emit("order_updated", sellOrder);
  //     }
  //   }
  // }

  private matchBuyOrder(buyOrder: EngineOrder): void {
    const MIN_TRADE = new Decimal("1e-12");

    while (
      buyOrder.type === "MARKET"
        ? buyOrder.quoteRemaining!.gt(MIN_TRADE)
        : buyOrder.filled.lt(buyOrder.quantity)
    ) {
      const bestAsk = this.orderbook.getBestAsk();

      if (!bestAsk) {
        if (buyOrder.type !== "MARKET") {
          this.orderbook.addOrder(buyOrder);
        }
        this.finalizeOrder(buyOrder);
        return;
      }

      const sellOrder = bestAsk.queue.peek();
      if (!sellOrder) {
        this.orderbook.removePriceLevel("SELL", bestAsk.price);
        continue;
      }

      if (buyOrder.userId === sellOrder.userId) {
        this.orderbook.removeOrder(sellOrder.id);
        sellOrder.status = "CANCELLED";
        this.emit("order_removed", sellOrder);
        continue;
      }

      const price = bestAsk.price;
      const availableBase = sellOrder.quantity.minus(sellOrder.filled);
      let tradeBase: Decimal;

      if (buyOrder.type === "MARKET") {
        const affordableBase = buyOrder.quoteRemaining!.div(price);
        tradeBase = Decimal.min(availableBase, affordableBase);
      } else {
        if (price.gt(buyOrder.price!)) {
          this.orderbook.addOrder(buyOrder);
          this.finalizeOrder(buyOrder);
          return;
        }
        const remainingBase = buyOrder.quantity.minus(buyOrder.filled);
        tradeBase = Decimal.min(availableBase, remainingBase);
      }

      if (tradeBase.lt(MIN_TRADE)) {
        this.finalizeOrder(buyOrder);
        return;
      }

      this.executeTrade(buyOrder, sellOrder, price, tradeBase);

      if (sellOrder.filled.gte(sellOrder.quantity)) {
        this.orderbook.removeOrder(sellOrder.id);
        sellOrder.status = "FILLED";
        this.emit("order_updated", sellOrder);
      }
    }

    this.finalizeOrder(buyOrder);
  }

  private matchSellOrder(sellOrder: EngineOrder): void {
    while (sellOrder.filled.lessThan(sellOrder.quantity)) {
      const bestBid = this.orderbook.getBestBid();

      if (!bestBid) {
        if (sellOrder.type !== "MARKET") {
          this.orderbook.addOrder(sellOrder);
        }
        this.finalizeOrder(sellOrder);
        return;
      }

      if (
        sellOrder.type !== "MARKET" &&
        bestBid.price.lessThan(sellOrder.price!)
      ) {
        this.orderbook.addOrder(sellOrder);
        this.finalizeOrder(sellOrder);
        return;
      }

      const buyOrder = bestBid.queue.peek();
      if (!buyOrder) {
        this.orderbook.removePriceLevel("BUY", bestBid.price);
        continue;
      }

      if (buyOrder.userId === sellOrder.userId) {
        this.orderbook.removeOrder(buyOrder.id);
        buyOrder.status = "CANCELLED";
        this.emit("order_removed", buyOrder);
        continue;
      }

      const tradePrice = bestBid.price;
      const availableQuantity = buyOrder.quantity.minus(buyOrder.filled);
      const neededQuantity = sellOrder.quantity.minus(sellOrder.filled);
      const tradeQuantity = Decimal.min(availableQuantity, neededQuantity);

      this.executeTrade(buyOrder, sellOrder, tradePrice, tradeQuantity);

      if (buyOrder.filled.gte(buyOrder.quantity)) {
        this.orderbook.removeOrder(buyOrder.id);
        buyOrder.status = "FILLED";
        this.emit("order_updated", buyOrder);
      }
    }

    this.finalizeOrder(sellOrder);
  }

  // private matchSellOrder(sellOrder: EngineOrder): void {
  //   while (sellOrder.filled.lessThan(sellOrder.quantity)) {
  //     const bestBid = this.orderbook.getBestBid();

  //     if (!bestBid) {
  //       if (sellOrder.type === "MARKET") {
  //         this.finalizeOrder(sellOrder);
  //         console.log(
  //           `Market SELL order ${sellOrder.id} cancelled due to no liquidity`,
  //         );
  //         return;
  //       } else {
  //         this.orderbook.addOrder(sellOrder);
  //         this.finalizeOrder(sellOrder);
  //         break;
  //       }
  //     }

  //     if (
  //       sellOrder.type !== "MARKET" &&
  //       bestBid.price.lessThan(sellOrder.price!)
  //     ) {
  //       this.orderbook.addOrder(sellOrder);
  //       this.finalizeOrder(sellOrder);
  //       break;
  //     }

  //     const buyOrder = bestBid.queue.peek();
  //     if (!buyOrder) {
  //       this.orderbook.removePriceLevel("BUY", bestBid.price);
  //       continue;
  //     }

  //     if (buyOrder.userId === sellOrder.userId) {
  //       this.orderbook.removeOrder(buyOrder.id);
  //       buyOrder.status = "CANCELLED";
  //       this.emit("order_removed", buyOrder);
  //       continue;
  //     }

  //     const tradePrice = bestBid.price;
  //     const availableQuantity = buyOrder.quantity.minus(buyOrder.filled);
  //     const neededQuantity = sellOrder.quantity.minus(sellOrder.filled);
  //     const tradeQuantity = availableQuantity.lessThan(neededQuantity)
  //       ? availableQuantity
  //       : neededQuantity;

  //     this.executeTrade(buyOrder, sellOrder, tradePrice, tradeQuantity);

  //     if (buyOrder.filled.equals(buyOrder.quantity)) {
  //       this.orderbook.removeOrder(buyOrder.id);
  //       buyOrder.status = "FILLED";
  //       this.emit("order_updated", buyOrder);
  //       continue;
  //     }

  //     if (sellOrder.filled.equals(sellOrder.quantity)) {
  //       this.finalizeOrder(sellOrder);
  //       break;
  //     }
  //   }
  // }

  private executeTrade(
    buyOrder: EngineOrder,
    sellOrder: EngineOrder,
    price: Decimal,
    quantity: Decimal,
  ): void {
    const tradeQuote = price.mul(quantity);

    buyOrder.filled = buyOrder.filled.plus(quantity);

    if (buyOrder.type === "MARKET") {
      buyOrder.quoteSpent = buyOrder.quoteSpent!.plus(tradeQuote);
      buyOrder.quoteRemaining = buyOrder.quoteRemaining!.minus(tradeQuote);
    }

    sellOrder.filled = sellOrder.filled.plus(quantity);

    const trade: Trade = {
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      price,
      quantity,
      quoteSpent: buyOrder.quoteSpent,
      quoteRemaining: buyOrder.quoteRemaining,
      marketId: buyOrder.marketId,
      pair: buyOrder.pair,
      timestamp: Date.now(),
    };

    this.emit("trade", trade);
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orderbook.getOrder(orderId);

    if (!order) {
      return false;
    }

    if (order.status === "FILLED" || order.status === "CANCELLED") {
      return false;
    }

    this.orderbook.removeOrder(orderId);

    order.status = "CANCELLED";
    this.emit("order_removed", order);

    return true;
  }

  removeExpiredOrder(orderId: string): boolean {
    const order = this.orderbook.getOrder(orderId);

    if (!order) return false;

    if (order.status === "PENDING" || order.status === "FILLED") {
      return false;
    }

    this.orderbook.removeOrder(orderId);

    return true;
  }

  restoreOrderbook(snapshot: any): void {
    this.orderbook.restoreOrderbook(snapshot);
  }

  getOrderbook() {
    return {
      bids: this.treeToLevels(this.orderbook.bids),
      asks: this.treeToLevels(this.orderbook.asks),
    };
  }
}

export default MatchEngine;
