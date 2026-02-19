import Orderbook from "./Orderbook";
import type { EngineOrder, Trade } from "../types";
import { EventEmitter } from "events";
import { Decimal } from "decimal.js"
import BTree from "sorted-btree"
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

    treeToLevels(
        tree: BTree<Decimal, OrderQueue>
    ): OrderbookLevel[] {
        const levels: OrderbookLevel[] = [];

        tree.forEach((queue, price) => {
            const orders = queue.toArray();

            let total = new Decimal(0);

            const formattedOrders = orders.map(order => {
                const qty = order.quantity.minus(order.filled)

                total = total.plus(qty);

                return {
                    orderId: order.id,
                    quantity: qty.toString()
                };
            });

            levels.push({
                price: price.toString(),
                totalQuantity: total.toString(),
                orderCount: orders.length,
                orders: formattedOrders
            });
        });

        return levels;
    }

    private finalizeMarketBuy(order: EngineOrder) {
        if (order.quoteSpent!.eq(0)) {
            order.status = "CANCELLED";
            this.emit("order_cancelled", order);
            return;
        }

        order.status = "FILLED";
        this.orderbook.removeOrder(order.id);
        this.emit("order_updated", order);
    }

    private finalizeMarketSell(order: EngineOrder) {
        if (order.filled.eq(0)) {
            order.status = "CANCELLED";
            this.emit("order_cancelled", order);
            return;
        }
        order.status = "FILLED";
        this.orderbook.removeOrder(order.id);
        this.emit("order_updated", order);
    }

    addOrder(order: EngineOrder): void {
        if (order.side === "BUY") {
            this.matchBuyOrder(order);
        } else {
            this.matchSellOrder(order);
        }
    }

    private updateOrderStatus(order: EngineOrder) {
        const previousStatus = order.status;

        if (order.filled.equals(0)) {
            order.status = "OPEN";
        } else if (order.filled.lessThan(order.quantity)) {
            order.status = "PARTIALLY_FILLED";
        } else {
            order.status = "FILLED";
        }

        if (order.status !== previousStatus) {
            if (order.status === "OPEN") {
                this.emit("order_opened", order);
            } else {
                this.emit("order_updated", order);
            }
        }
    }

    private matchBuyOrder(buyOrder: EngineOrder): void {
        while (true) {
            if (buyOrder.type === "MARKET") {
                if (!buyOrder.quoteRemaining || buyOrder.quoteRemaining.lte(0)) {
                    this.finalizeMarketBuy(buyOrder);
                    return;
                }
            } else {
                if (buyOrder.filled.gte(buyOrder.quantity)) {
                    this.updateOrderStatus(buyOrder);
                    return;
                }
            }

            const bestAsk = this.orderbook.getBestAsk();
            if (!bestAsk) {
                if (buyOrder.type === "MARKET") {
                    this.finalizeMarketBuy(buyOrder);
                } else {
                    this.orderbook.addOrder(buyOrder);
                    this.updateOrderStatus(buyOrder);
                }
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
                    this.updateOrderStatus(buyOrder);
                    return;
                }

                const remainingBase = buyOrder.quantity.minus(buyOrder.filled);
                tradeBase = Decimal.min(availableBase, remainingBase);
            }

            if (tradeBase.lte(0)) {
                if (buyOrder.type === "LIMIT" && buyOrder.filled.lt(buyOrder.quantity)) {
                    this.orderbook.addOrder(buyOrder);
                    this.updateOrderStatus(buyOrder);
                }
                return;
            }

            this.executeTrade(buyOrder, sellOrder, price, tradeBase);

            if (sellOrder.filled.eq(sellOrder.quantity)) {
                this.orderbook.removeOrder(sellOrder.id);
                sellOrder.status = "FILLED";
                this.emit("order_updated", sellOrder);
            }
        }
    }

    private matchSellOrder(sellOrder: EngineOrder): void {
        while (sellOrder.filled.lessThan(sellOrder.quantity)) {
            const bestBid = this.orderbook.getBestBid();

            if (!bestBid) {
                if (sellOrder.price === null) {
                    this.finalizeMarketSell(sellOrder);
                    console.log(`Market SELL order ${sellOrder.id} cancelled due to no liquidity`);
                    return;
                } else {
                    this.orderbook.addOrder(sellOrder);
                    this.updateOrderStatus(sellOrder);
                    break;
                }
            }

            if (sellOrder.price !== null && bestBid.price.lessThan(sellOrder.price)) {
                this.orderbook.addOrder(sellOrder);
                this.updateOrderStatus(sellOrder);
                break;
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
            const tradeQuantity = availableQuantity.lessThan(neededQuantity) ? availableQuantity : neededQuantity;

            this.executeTrade(buyOrder, sellOrder, tradePrice, tradeQuantity);

            if (buyOrder.filled.equals(buyOrder.quantity)) {
                this.orderbook.removeOrder(buyOrder.id);
                buyOrder.status = "FILLED";
                this.emit("order_updated", buyOrder);
                continue;
            }

            if (sellOrder.filled.equals(sellOrder.quantity)) {
                this.updateOrderStatus(sellOrder);
                break;
            }
        }
    }

    private executeTrade(
        buyOrder: EngineOrder,
        sellOrder: EngineOrder,
        price: Decimal,
        quantity: Decimal
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
            timestamp: Date.now()
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
            asks: this.treeToLevels(this.orderbook.asks)
        };
    }
}

export default MatchEngine;