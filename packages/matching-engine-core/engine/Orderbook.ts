import { OrderQueue } from "./OrderQueue";
import type { EngineOrder, Side } from "../types";
import Decimal from "decimal.js";
import BTree from "sorted-btree";

class Orderbook {
    bids: BTree<Decimal, OrderQueue>;
    asks: BTree<Decimal, OrderQueue>;
    private orderIndex: Map<string, { side: Side; price: Decimal }>;

    constructor() {
        this.bids = new BTree<Decimal, OrderQueue>(undefined, (a: Decimal, b: Decimal) =>
            b.comparedTo(a)
        );

        this.asks = new BTree<Decimal, OrderQueue>(undefined, (a: Decimal, b: Decimal) =>
            a.comparedTo(b)
        );

        this.orderIndex = new Map();
    }

    serialize() {
        return {
            bids: Array.from(this.bids.entries()).map(([price, queue]) => ({
                price: price.toString(),
                orders: queue.toArray()
            })),
            asks: Array.from(this.asks.entries()).map(([price, queue]) => ({
                price: price.toString(),
                orders: queue.toArray()
            }))
        };
    }

    addOrder(order: EngineOrder): void {
        if (order.price === null || order.type === "MARKET") {
            throw new Error("Market orders must never be added to orderbook");
        }

        const priceKey = order.price;
        const tree = order.side === "BUY" ? this.bids : this.asks;

        if (!tree.has(priceKey)) {
            tree.set(priceKey, new OrderQueue())
        }

        tree.get(priceKey)?.enqueue(order);
        this.orderIndex.set(order.id, { side: order.side, price: priceKey });
    }

    getBestBid(): { price: Decimal; queue: OrderQueue } | null {
        if (this.bids.size === 0) return null;

        const entry = this.bids.entries().next().value;
        if (!entry) return null;

        const [price, queue] = entry;
        if (queue.isEmpty()) {
            this.bids.delete(price);
            return this.getBestBid();
        }

        return { price, queue };
    }

    getBestAsk(): { price: Decimal; queue: OrderQueue } | null {
        if (this.asks.size === 0) return null;

        const entry = this.asks.entries().next().value;
        if (!entry) return null;

        const [price, queue] = entry;
        if (queue.isEmpty()) {
            this.asks.delete(price);
            return this.getBestAsk();
        }

        return { price, queue };
    }

    getOrder(orderId: string): EngineOrder | null {
        const orderInfo = this.orderIndex.get(orderId);

        if (!orderInfo) return null;

        const { side, price } = orderInfo;
        const tree = side === "BUY" ? this.bids : this.asks;

        const queue = tree.get(price);
        if (queue) {
            return queue.getOrder(orderId) ?? null;
        }

        return null;
    }

    removeOrder(orderId: string): void {
        const order = this.orderIndex.get(orderId);

        if (!order) return;

        const { price, side } = order;

        const tree = side === "BUY" ? this.bids : this.asks;
        const queue = tree.get(price);

        if (!queue) return;

        queue.removeOrder(orderId);

        if (queue.isEmpty()) {
            tree.delete(price);
        }

        this.orderIndex.delete(orderId);
    }

    removePriceLevel(side: Side, price: Decimal): void {
        const tree = side === "BUY" ? this.bids : this.asks;
        tree.delete(price);
    }

    restoreOrderbook(snapshot: {
        bids: Array<{ price: Decimal | string; orders: EngineOrder[] }>;
        asks: Array<{ price: Decimal | string; orders: EngineOrder[] }>;
    }): void {
        if (!snapshot) return;

        if (!Array.isArray(snapshot.bids) || !Array.isArray(snapshot.asks)) {
            console.warn("Invalid snapshot format");
            return;
        }

        this.bids.clear();
        this.asks.clear();
        this.orderIndex.clear();

        for (const level of snapshot.bids) {
            const queue = new OrderQueue();
            const priceDecimal = new Decimal(level.price);

            for (const rawOrder of level.orders) {
                const restoredOrder = {
                    ...rawOrder,
                    price: rawOrder.price ? new Decimal(rawOrder.price) : null,
                    quantity: new Decimal(rawOrder.quantity),
                    filled: new Decimal(rawOrder.filled),
                    remainingQuantity: rawOrder.remainingQuantity
                        ? new Decimal(rawOrder.remainingQuantity)
                        : new Decimal(rawOrder.quantity).minus(new Decimal(rawOrder.filled)),
                    quoteAmount: rawOrder.quoteAmount ? new Decimal(rawOrder.quoteAmount) : null,
                    quoteRemaining: rawOrder.quoteRemaining ? new Decimal(rawOrder.quoteRemaining) : null,
                    quoteSpent: rawOrder.quoteSpent ? new Decimal(rawOrder.quoteSpent) : null,
                };

                queue.enqueue(restoredOrder);
                this.orderIndex.set(restoredOrder.id, { side: "BUY", price: priceDecimal });
            }

            this.bids.set(priceDecimal, queue);
        }

        for (const level of snapshot.asks) {
            const queue = new OrderQueue();
            const priceDecimal = new Decimal(level.price);

            for (const rawOrder of level.orders) {
                const restoredOrder = {
                    ...rawOrder,
                    price: rawOrder.price ? new Decimal(rawOrder.price) : null,
                    quantity: new Decimal(rawOrder.quantity),
                    filled: new Decimal(rawOrder.filled),
                    quoteAmount: rawOrder.quoteAmount ? new Decimal(rawOrder.quoteAmount) : null,
                    remainingQuantity: rawOrder.remainingQuantity
                        ? new Decimal(rawOrder.remainingQuantity)
                        : new Decimal(rawOrder.quantity).minus(new Decimal(rawOrder.filled)),
                    quoteRemaining: rawOrder.quoteRemaining ? new Decimal(rawOrder.quoteRemaining) : null,
                    quoteSpent: rawOrder.quoteSpent ? new Decimal(rawOrder.quoteSpent) : null,
                };

                queue.enqueue(restoredOrder);
                this.orderIndex.set(restoredOrder.id, { side: "SELL", price: priceDecimal });
            }

            this.asks.set(priceDecimal, queue);
        }
    }
}

export default Orderbook;