import { OrderQueue } from "./OrderQueue";
import type { EngineOrder, Side } from "./types";
import Decimal from "decimal.js";

class Orderbook {
    bids: Map<string, OrderQueue>;
    asks: Map<string, OrderQueue>;

    constructor() {
        this.bids = new Map<string, OrderQueue>();
        this.asks = new Map<string, OrderQueue>();
    }

    addOrder(order: EngineOrder): void {
        const priceKey = order.price?.toString() || "";
        
        if(order.side === "BUY") {
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
}

export default Orderbook;
