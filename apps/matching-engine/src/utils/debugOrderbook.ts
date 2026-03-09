import { type OrderbookLevel } from "@repo/matching-engine-core";

export function debugOrderBook(
    DEBUG: boolean,
  ob: { bids: OrderbookLevel[]; asks: OrderbookLevel[] } | null,
) {
  if (!DEBUG) return;
  console.log("---- ORDERBOOK ----");
  console.log("BIDS:");
  for (const level of ob?.bids || []) {
    console.log(`  ${level.price} -> ${level.totalQuantity} orders`);
  }
  console.log("ASKS:");
  for (const level of ob?.asks || []) {
    console.log(`  ${level.price} -> ${level.totalQuantity} orders`);
  }
  console.log("-------------------");
}
