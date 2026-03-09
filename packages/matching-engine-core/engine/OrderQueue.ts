import type { EngineOrder } from "../types";
import { Decimal } from "decimal.js";

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

  getTotalQuantity(): Decimal {
    let total = new Decimal(0);
    for (const order of this.orders) {
      total = total.plus(order.quantity.minus(order.filled));
    }
    return total;
  }

  size(): number {
    return this.orders.length;
  }

  getOrder(orderId: string): EngineOrder | undefined {
    return this.orders.find((order) => order.id === orderId);
  }

  removeOrder(orderId: string): void {
    this.orders = this.orders.filter((order) => order.id !== orderId);
  }

  toArray(): EngineOrder[] {
    return this.orders;
  }
}
