import { Decimal } from "decimal.js";
import type { OrderEvent, TradeEvent } from "./types";

type PriceLevel = Map<string, Decimal>;

export class OrderbookView {
    private bids: Map<string, PriceLevel>;
    private asks: Map<string, PriceLevel>;

    constructor() {
        this.bids = new Map();
        this.asks = new Map();
    }

    private serialize(levels: Map<string, PriceLevel>) {
        return Array.from(levels.entries())
            .map(([price, level]) => {
                const totalQuantity = Array.from(level.values())
                    .reduce((sum, quantity) => sum.plus(quantity), new Decimal(0));

                return {
                    price,
                    totalQuantity: totalQuantity.toString(),
                    orderCount: level.size,
                    orders: Array.from(level.entries()).map(([orderId, quantity]) => ({
                        orderId,
                        quantity: quantity.toString()
                    }))
                };
            })
            .sort((a, b) => {
                const priceA = new Decimal(a.price);
                const priceB = new Decimal(b.price);
                return priceB.minus(priceA).toNumber();
            });
    }

    private serializeAsks() {
        return Array.from(this.asks.entries())
            .map(([price, level]) => {
                const totalQuantity = Array.from(level.values())
                    .reduce((sum, quantity) => sum.plus(quantity), new Decimal(0));

                return {
                    price,
                    totalQuantity: totalQuantity.toString(),
                    orderCount: level.size,
                    orders: Array.from(level.entries()).map(([orderId, quantity]) => ({
                        orderId,
                        quantity: quantity.toString()
                    }))
                };
            })
            .sort((a, b) => {
                const priceA = new Decimal(a.price);
                const priceB = new Decimal(b.price);
                return priceA.minus(priceB).toNumber();
            });
    }

    applyOrderUpdate(order: OrderEvent) {
        this.bids.forEach((level, price) => {
            level.delete(order.orderId)
            if (level.size === 0) {
                this.bids.delete(price);
            }
        })
        this.asks.forEach((level, price) => {
            level.delete(order.orderId)
            if (level.size === 0) {
                this.asks.delete(price);
            }
        })

        if (order.status === "FILLED" || order.status === "CANCELLED") {
            return;
        }

        const sideBook = order.side === "BUY" ? this.bids : this.asks;
        const priceKey = order.price.toString();

        if (!sideBook.has(priceKey)) {
            sideBook.set(priceKey, new Map());
        }

        if (new Decimal(order.remainingQuantity).lte(0)) {
            sideBook.get(priceKey)!.delete(order.orderId);
            if (sideBook.get(priceKey)!.size === 0) {
                sideBook.delete(priceKey);
            }
            return;
        }

        sideBook.get(priceKey)!.set(
            order.orderId,
            new Decimal(order.remainingQuantity)
        );
    }

    applyTrade(trade: TradeEvent) {
        this.bids.forEach((level, price) => {
            const orderQuantity = level.get(trade.buyOrderId);
            if (orderQuantity) {
                const remaining = orderQuantity.minus(trade.quantity);
                if (remaining.lte(0)) {
                    level.delete(trade.buyOrderId);
                    if (level.size === 0) {
                        this.bids.delete(price);
                    }
                } else {
                    level.set(trade.buyOrderId, remaining);
                }
            }
        });

        this.asks.forEach((level, price) => {
            const orderQuantity = level.get(trade.sellOrderId);
            if (orderQuantity) {
                const remaining = orderQuantity.minus(trade.quantity);
                if (remaining.lte(0)) {
                    level.delete(trade.sellOrderId);
                    if (level.size === 0) {
                        this.asks.delete(price);
                    }
                } else {
                    level.set(trade.sellOrderId, remaining);
                }
            }
        });
    }

    // applyOrderOpened(order: OrderEvent) {
    //     const sidebook = order.side === "BUY" ? this.bids : this.asks;
    //     const priceKey = order.price.toString();

    //     if (new Decimal(order.remainingQuantity).lte(0)) {
    //         return;
    //     }

    //     if (!sidebook.has(priceKey)) {
    //         sidebook.set(priceKey, new Map());
    //     }

    //     sidebook.get(priceKey)!.set(order.orderId, new Decimal(order.remainingQuantity));
    // }

    applyOrderCancel(order: OrderEvent) {
        this.bids.forEach((level, price) => {
            level.delete(order.orderId)
            if (level.size === 0) {
                this.bids.delete(price);
            }
        })
        this.asks.forEach((level, price) => {
            level.delete(order.orderId)
            if (level.size === 0) {
                this.asks.delete(price);
            }
        })
    }

    snapshot() {
        return {
            bids: this.serialize(this.bids),
            asks: this.serializeAsks()
        };
    }
}
