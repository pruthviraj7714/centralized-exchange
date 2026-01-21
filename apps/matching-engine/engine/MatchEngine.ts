import Orderbook from "./Orderbook";
import type { EngineOrder, Trade, Side } from "../types";
import { EventEmitter } from "events";

export class MatchEngine extends EventEmitter {
    private orderbook: Orderbook;

    constructor() {
        super();
        this.orderbook = new Orderbook();
    }

    addOrder(order: EngineOrder): void {
        if (order.side === "BUY") {
            this.matchBuyOrder(order);
        } else {
            this.matchSellOrder(order);
        }
    }
    
    private updateOrderStatus(order: EngineOrder) {
        if (order.filled.equals(0)) {
            order.status = "OPEN";
        } else if (order.filled.lessThan(order.quantity)) {
            order.status = "PARTIALLY_FILLED";
        } else {
            order.status = "FILLED";
        }
    }

    private matchBuyOrder(buyOrder: EngineOrder): void {
        while (buyOrder.filled.lessThan(buyOrder.quantity)) {
            const bestAsk = this.orderbook.getBestAsk();
            
            // Market BUY: Must have opposite side (SELL) orders available
            if (!bestAsk) {
                if (buyOrder.price === null) {
                    // Market order with no liquidity - cancel remaining quantity
                    buyOrder.status = "CANCELLED";
                    this.emit("order_updated", buyOrder);
                    console.log(`Market BUY order ${buyOrder.id} cancelled due to no liquidity`);
                    return;
                } else {
                    // Limit order - add to orderbook
                    buyOrder.status = "OPEN";
                    this.orderbook.addOrder(buyOrder);
                    this.emit("order_updated", buyOrder);
                    break;
                }
            }

            // Market orders ignore price limits, limit orders respect their price
            if (buyOrder.price && bestAsk.price.greaterThan(buyOrder.price)) {
                // Limit order with price too high - add to orderbook
                buyOrder.status = "OPEN";
                this.orderbook.addOrder(buyOrder);
                this.emit("order_updated", buyOrder);
                break;
            }

            const sellOrder = bestAsk.queue.peek();
            if (!sellOrder) {
                bestAsk.queue.dequeue();
                continue;
            }

            // Trade executes at ask price (market taker takes maker price)
            const tradePrice = bestAsk.price;
            const availableQuantity = sellOrder.quantity.minus(sellOrder.filled);
            const neededQuantity = buyOrder.quantity.minus(buyOrder.filled);
            const tradeQuantity = availableQuantity.lessThan(neededQuantity) ? availableQuantity : neededQuantity;

            // Execute trade
            this.executeTrade(buyOrder, sellOrder, tradePrice, tradeQuantity);

            // Remove fully filled orders
            if (sellOrder.filled.equals(sellOrder.quantity)) {
                bestAsk.queue.dequeue();
                if (bestAsk.queue.isEmpty()) {
                    this.orderbook.removePriceLevel("SELL", bestAsk.price.toString());
                }
            }

            if (buyOrder.filled.equals(buyOrder.quantity)) {
                break;
            }
        }
    }

    private matchSellOrder(sellOrder: EngineOrder): void {
        while (sellOrder.filled.lessThan(sellOrder.quantity)) {
            const bestBid = this.orderbook.getBestBid();
            
            // Market SELL: Must have opposite side (BUY) orders available
            if (!bestBid) {
                if (sellOrder.price === null) {
                    // Market order with no liquidity - cancel remaining quantity
                    sellOrder.status = "CANCELLED";
                    this.emit("order_updated", sellOrder);
                    console.log(`Market SELL order ${sellOrder.id} cancelled due to no liquidity`);
                    return;
                } else {
                    // Limit order - add to orderbook
                    sellOrder.status = "OPEN";
                    this.orderbook.addOrder(sellOrder);
                    this.emit("order_updated", sellOrder);
                    break;
                }
            }

            // Market orders ignore price limits, limit orders respect their price
            if (sellOrder.price && bestBid.price.lessThan(sellOrder.price)) {
                // Limit order with price too low - add to orderbook
                sellOrder.status = "OPEN";
                this.orderbook.addOrder(sellOrder);
                this.emit("order_updated", sellOrder);
                break;
            }

            const buyOrder = bestBid.queue.peek();
            if (!buyOrder) {
                bestBid.queue.dequeue();
                continue;
            }

            // Trade executes at bid price (market taker takes maker price)
            const tradePrice = bestBid.price;
            const availableQuantity = buyOrder.quantity.minus(buyOrder.filled);
            const neededQuantity = sellOrder.quantity.minus(sellOrder.filled);
            const tradeQuantity = availableQuantity.lessThan(neededQuantity) ? availableQuantity : neededQuantity;

            // Execute trade
            this.executeTrade(buyOrder, sellOrder, tradePrice, tradeQuantity);

            // Remove fully filled orders
            if (buyOrder.filled.equals(buyOrder.quantity)) {
                bestBid.queue.dequeue();
                if (bestBid.queue.isEmpty()) {
                    this.orderbook.removePriceLevel("BUY", bestBid.price.toString());
                }
            }

            if (sellOrder.filled.equals(sellOrder.quantity)) {
                break;
            }
        }
    }

    private executeTrade(buyOrder: EngineOrder, sellOrder: EngineOrder, price: any, quantity: any): void {
        // Update filled quantities
        buyOrder.filled = buyOrder.filled.plus(quantity);
        sellOrder.filled = sellOrder.filled.plus(quantity);

        this.updateOrderStatus(buyOrder);
        this.updateOrderStatus(sellOrder);

        this.emit("order_updated", buyOrder);
        this.emit("order_updated", sellOrder);

        // Create trade event
        const trade: Trade = {
            buyOrderId: buyOrder.id,
            sellOrderId: sellOrder.id,
            price: price,
            quantity: quantity,
            timestamp: Date.now()
        };

        // Emit trade event
        this.emit("trade", trade);
    }

    cancelOrder(orderId: string, side: Side): boolean {
        // Implementation for order cancellation
        // This would require tracking orders by ID
        return false;
    }

    getOrderbook() {
        return {
            bids: this.orderbook.bids,
            asks: this.orderbook.asks
        };
    }
}

export default MatchEngine;