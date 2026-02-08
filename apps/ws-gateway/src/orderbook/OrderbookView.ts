import { Decimal } from "decimal.js";
import type { OrderEvent, TradeEvent } from "./types";

type PriceLevel = Map<string, Decimal>; //orderId -> quantity

export class OrderbookView {
    private bids: Map<string, PriceLevel>; //price -> levels
    private asks: Map<string, PriceLevel>;

    constructor() {
        this.bids = new Map();
        this.asks = new Map();
    }

    private serialize(levels: Map<string, PriceLevel>) {
        return Array.from(levels.entries())
            .map(([price, level]) => {
                // Aggregate total quantity at this price level
                const totalQuantity = Array.from(level.values())
                    .reduce((sum, quantity) => sum.plus(quantity), new Decimal(0));
                
                return {
                    price,
                    totalQuantity: totalQuantity.toString(),
                    orderCount: level.size,
                    // Include individual orders for detailed view
                    orders: Array.from(level.entries()).map(([orderId, quantity]) => ({
                        orderId,
                        quantity: quantity.toString()
                    }))
                };
            })
            // Sort bids descending, asks ascending
            .sort((a, b) => {
                const priceA = new Decimal(a.price);
                const priceB = new Decimal(b.price);
                return priceB.minus(priceA).toNumber(); // descending for bids
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
            // Sort asks ascending
            .sort((a, b) => {
                const priceA = new Decimal(a.price);
                const priceB = new Decimal(b.price);
                return priceA.minus(priceB).toNumber(); // ascending for asks
            });
    }

    applyOrderUpdate(order: OrderEvent) {
        // Remove order from all price levels first (in case it's moving)
        this.bids.forEach(level => level.delete(order.orderId));
        this.asks.forEach(level => level.delete(order.orderId));

        // Only add if order is still open/partially filled
        if (order.status === "FILLED" || order.status === "CANCELLED") {
            return; // Order is complete, don't add to orderbook
        }

        const sideBook = order.side === "BUY" ? this.bids : this.asks;
        const priceKey = order.price.toString();

        if (!sideBook.has(priceKey)) {
            sideBook.set(priceKey, new Map());
        }

        sideBook.get(priceKey)!.set(
            order.orderId,
            new Decimal(order.remainingQuantity)
        );
    }

    applyTrade(trade: TradeEvent) {
        // Remove or update the filled orders
        this.bids.forEach((level, price) => {
            const orderQuantity = level.get(trade.buyOrderId);
            if (orderQuantity) {
                const remaining = orderQuantity.minus(trade.quantity);
                if (remaining.lessThanOrEqualTo(0)) {
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
                if (remaining.lessThanOrEqualTo(0)) {
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

    applyOrderCancel(order: OrderEvent) {
        console.log("Applying order cancel:", order);
        this.bids.forEach(level => level.delete(order.orderId));
        this.asks.forEach(level => level.delete(order.orderId));
    }

    snapshot() {
        return {
            bids: this.serialize(this.bids),
            asks: this.serializeAsks()
        };
    }
}
