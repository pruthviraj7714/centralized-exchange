import { Decimal } from "decimal.js";
import type { OrderEvent, TradeEvent } from "./types";
import BTree from "sorted-btree";
type PriceLevel = Map<string, Decimal>;

export class OrderbookView {
    private bids: BTree<Decimal, PriceLevel>;
    private asks: BTree<Decimal, PriceLevel>;
    private orderIndex: Map<
        string,
        { side: "BUY" | "SELL"; price: Decimal }
    >;

    constructor() {
        this.bids = new BTree<Decimal, PriceLevel>(
            undefined,
            (a, b) => b.comparedTo(a)
        );

        this.asks = new BTree<Decimal, PriceLevel>(
            undefined,
            (a, b) => a.comparedTo(b)
        );

        this.orderIndex = new Map();
    }

    private serialize(levels: BTree<Decimal, PriceLevel>) {
        return Array.from(levels.entries()).map(([price, level]) => {
            const totalQuantity = Array.from(level.values())
                .reduce((sum, quantity) => sum.plus(quantity), new Decimal(0));

            return {
                price: price.toString(),
                totalQuantity: totalQuantity.toString(),
                orderCount: level.size,
                orders: Array.from(level.entries()).map(([orderId, quantity]) => ({
                    orderId,
                    quantity: quantity.toString()
                }))
            };
        });
    }

    applyTrade(trade: TradeEvent) {
        this.updateOrder(trade.buyOrderId, trade.quantity);
        this.updateOrder(trade.sellOrderId, trade.quantity);
    }

    private updateOrder(orderId: string, tradedQty: Decimal) {
        const info = this.orderIndex.get(orderId);
        if (!info) return;

        const book = info.side === "BUY" ? this.bids : this.asks;
        const level = book.get(info.price);
        if (!level) return;

        const current = level.get(orderId);
        if (!current) return;

        const remaining = current.minus(tradedQty);

        if (remaining.lte(0)) {
            level.delete(orderId);
            this.orderIndex.delete(orderId);

            if (level.size === 0) {
                book.delete(info.price);
            }
        } else {
            level.set(orderId, remaining);
        }
    }


    applyOrderOpened(order: OrderEvent) {
        const sidebook = order.side === "BUY" ? this.bids : this.asks;
        const priceKey = new Decimal(order.price);

        if (!sidebook.has(priceKey)) {
            sidebook.set(priceKey, new Map());
        }

        const remaining = new Decimal(order.remainingQuantity);
        if (remaining.lte(0)) return;

        sidebook.get(priceKey)!.set(order.orderId, remaining);

        this.orderIndex.set(order.orderId, {
            side: order.side,
            price: priceKey
        });
    }

    applyOrderCancel(order: OrderEvent) {
        const info = this.orderIndex.get(order.orderId);
        if (!info) return;

        const book = info.side === "BUY" ? this.bids : this.asks;
        const level = book.get(info.price);
        if (!level) return;

        level.delete(order.orderId);
        this.orderIndex.delete(order.orderId);

        if (level.size === 0) {
            book.delete(info.price);
        }
    }

    restoreOrderbook(snapshot: any) {
        if (!snapshot) return;

        this.bids.clear();
        this.asks.clear();
        this.orderIndex.clear();

        if (snapshot.bids) {
            for (const level of snapshot.bids) {
                const priceKey = new Decimal(level.price);
                const map = new Map<string, Decimal>();
                for (const order of level.orders) {
                    map.set(order.orderId, new Decimal(order.quantity));
                    this.orderIndex.set(order.orderId, {
                        side: "BUY",
                        price: priceKey
                    });
                }
                this.bids.set(priceKey, map);
            }

        }

        if (snapshot.asks) {
            for (const level of snapshot.asks) {
                const priceKey = new Decimal(level.price);
                const map = new Map<string, Decimal>();
                for (const order of level.orders) {
                    map.set(order.orderId, new Decimal(order.quantity));
                    this.orderIndex.set(order.orderId, {
                        side: "SELL",
                        price: priceKey
                    });
                }
                this.asks.set(priceKey, map);
            }
        }

    }

    snapshot() {
        return {
            bids: this.serialize(this.bids),
            asks: this.serialize(this.asks),
        };
    }
}
