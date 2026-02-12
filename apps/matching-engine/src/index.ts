import { OrderQueue } from "@repo/matching-engine-core";
import { createConsumer } from "@repo/kafka/src/consumer";
import { MatchingEngineService } from "./MatchEngineService";
import { SUPPORTED_MARKETS } from "@repo/common";
import { SnapshotService } from "./snapshotservice";

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

async function restoreAllPairs() {
  for(const market of SUPPORTED_MARKETS) {
    const snapshot = await SnapshotService.load(market)
    if(snapshot) {
      console.log(`Restoring orderbook for ${market}`, snapshot);
      MatchingEngineService.restoreOrderbook(snapshot, market);
    }
  }
}

async function main() {
  await restoreAllPairs();

  startSnapshotLoop();  

  const consumer = createConsumer("matching-engine");

  await consumer.subscribe({ topic: "orders.create" });
  await consumer.subscribe({ topic: "orders.cancel" });
  await consumer.subscribe({ topic: "orders.expired" });

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

const startSnapshotLoop = () => {
  setInterval(async () => {  
    const activePairs = MatchingEngineService.getActivePairs();
    for(const pair of activePairs) {
      const snapshot = MatchingEngineService.serializeOrderbook(pair);
      if(snapshot) {
        await SnapshotService.save(pair, snapshot)
      }
    }
  }, 10000);
}

main();


