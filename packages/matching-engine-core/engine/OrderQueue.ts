import type { EngineOrder } from "../types";

export class OrderQueue {
    private orders: EngineOrder[] = [];

    enqueue(order: EngineOrder): void {
        this.orders.push(order);
    }

    dequeue(): EngineOrder | undefined {
        return this.orders.shift();
    }

    peek(): EngineOrder | undefined {
        return this.orders[0];
    }

    isEmpty(): boolean {
        return this.orders.length === 0;
    }

    size(): number {
        return this.orders.length;
    }
}
