import { OrderQueue } from "@repo/matching-engine-core";
import { createConsumer } from "@repo/kafka/src/consumer";
import { MatchingEngineService } from "./MatchEngineService";

function debugOrderBook(ob: {
  bids: Map<string, OrderQueue>;
  asks: Map<string, OrderQueue>;
} | null) {
  console.log("---- ORDERBOOK ----");

  console.log("BIDS:");
  for (const [price, queue] of ob?.bids.entries() || []) {
    console.log(`  ${price} -> ${queue.size()} orders`);
  }

  console.log("ASKS:");
  for (const [price, queue] of ob?.asks.entries() || []) {
    console.log(`  ${price} -> ${queue.size()} orders`);
  }

  console.log("-------------------");
}

async function main() {
  const consumer = createConsumer("matching-engine");

  await consumer.subscribe({ topic: "orders.create" });
  await consumer.subscribe({ topic: "orders.cancel" });

  consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value?.toString() || "");
      const result = MatchingEngineService.processOrderEvent(event);
      console.log("Result:", result);
      const ob = MatchingEngineService.getOrderbook(event.pair);

      debugOrderBook(ob);
      console.log("Active pairs:", MatchingEngineService.getActivePairs());
    }
  });
}

main();


