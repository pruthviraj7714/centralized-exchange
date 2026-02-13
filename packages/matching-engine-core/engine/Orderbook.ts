import { OrderQueue } from "./OrderQueue";
import type { EngineOrder, Side } from "../types";
import Decimal from "decimal.js";

class Orderbook {
    bids: Map<string, OrderQueue>;
    asks: Map<string, OrderQueue>;

    constructor() {
        this.bids = new Map<string, OrderQueue>();
        this.asks = new Map<string, OrderQueue>();
    }

    serialize() {
        return {
            bids: Array.from(this.bids.entries()).map(([price, queue]) => ({
                price,
                orders: queue.toArray()
            })),
            asks: Array.from(this.asks.entries()).map(([price, queue]) => ({
                price,
                orders: queue.toArray()
            }))
        };
    }

    addOrder(order: EngineOrder): void {
        if (order.price === null) {
            throw new Error("Market orders must never be added to orderbook");
        }

        const priceKey = order.price.toString();

        if (order.side === "BUY") {
            if (!this.bids.has(priceKey)) {
                this.bids.set(priceKey, new OrderQueue());
            }
            this.bids.get(priceKey)?.enqueue(order);
        } else {
            if (!this.asks.has(priceKey)) {
                this.asks.set(priceKey, new OrderQueue());
            }
            this.asks.get(priceKey)?.enqueue(order);
        }
    }

    getBestBid(): { price: Decimal; queue: OrderQueue } | null {
        if (this.bids.size === 0) return null;

        let bestPrice: Decimal | null = null;
        let bestQueue: OrderQueue | null = null;

        for (const [priceStr, queue] of this.bids.entries()) {
            if (queue.isEmpty()) continue;

            const price = new Decimal(priceStr);
            if (bestPrice === null || price.greaterThan(bestPrice)) {
                bestPrice = price;
                bestQueue = queue;
            }
        }

        return bestPrice && bestQueue ? { price: bestPrice, queue: bestQueue } : null;
    }

    getBestAsk(): { price: Decimal; queue: OrderQueue } | null {
        if (this.asks.size === 0) return null;

        let bestPrice: Decimal | null = null;
        let bestQueue: OrderQueue | null = null;

        for (const [priceStr, queue] of this.asks.entries()) {
            if (queue.isEmpty()) continue;

            const price = new Decimal(priceStr);
            if (bestPrice === null || price.lessThan(bestPrice)) {
                bestPrice = price;
                bestQueue = queue;
            }
        }

        return bestPrice && bestQueue ? { price: bestPrice, queue: bestQueue } : null;
    }

    removePriceLevel(side: Side, price: string): void {
        if (side === "BUY") {
            this.bids.delete(price);
        } else {
            this.asks.delete(price);
        }
    }

    getOrder(orderId: string): EngineOrder | null {
        for (const queue of this.bids.values()) {
            const order = queue.getOrder(orderId);
            if (order) return order;
        }

        for (const queue of this.asks.values()) {
            const order = queue.getOrder(orderId);
            if (order) return order;
        }

        return null;
    }

    removeOrder(orderId: string, side: Side): void {
        if (side === "BUY") {
            for (const [price, queue] of this.bids.entries()) {
                if (queue.getOrder(orderId)) {
                    queue.removeOrder(orderId);
                    if (queue.isEmpty()) {
                        this.bids.delete(price);
                    }
                    return;
                }
            }
        } else {
            for (const [price, queue] of this.asks.entries()) {
                if (queue.getOrder(orderId)) {
                    queue.removeOrder(orderId);
                    if (queue.isEmpty()) {
                        this.asks.delete(price);
                    }
                    return;
                }
            }
        }
    }

    restoreOrderbook(snapshot: any): void {
        if (!snapshot) return;

        if (!Array.isArray(snapshot.bids) || !Array.isArray(snapshot.asks)) {
            console.warn("Invalid snapshot format");
            return;
        }

        // Clear existing
        this.bids.clear();
        this.asks.clear();

        for (const level of snapshot.bids) {
            const queue = new OrderQueue();

            for (const rawOrder of level.orders) {
                const restoredOrder = {
                    ...rawOrder,
                    price: rawOrder.price ? new Decimal(rawOrder.price) : null,
                    quantity: new Decimal(rawOrder.quantity),
                    filled: new Decimal(rawOrder.filled)
                };

                queue.enqueue(restoredOrder);
            }

            this.bids.set(level.price, queue);
        }

        for (const level of snapshot.asks) {
            const queue = new OrderQueue();

            for (const rawOrder of level.orders) {
                const restoredOrder = {
                    ...rawOrder,
                    price: rawOrder.price ? new Decimal(rawOrder.price) : null,
                    quantity: new Decimal(rawOrder.quantity),
                    filled: new Decimal(rawOrder.filled)
                };

                queue.enqueue(restoredOrder);
            }

            this.asks.set(level.price, queue);
        }

    }

}

export default Orderbook;
