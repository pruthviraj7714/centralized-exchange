import { type OrderbookLevel } from "@repo/matching-engine-core";
import { createConsumer } from "@repo/kafka/src/consumer";
import { MatchingEngineService } from "./MatchEngineService";
import { SUPPORTED_MARKETS } from "@repo/common";
import { SnapshotService } from "./snapshotService";
import redisclient from "@repo/redisclient";
import { producer } from "@repo/kafka/src/producer";

function debugOrderBook(
  ob: {
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
  } | null,
) {
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

const pairSequence = new Map<string, number>();

export const nextSequence = (pair: string) => {
  const current = pairSequence.get(pair) ?? 0;
  const next = current + 1;
  pairSequence.set(pair, next);
  return next;
};

async function restoreSequence(pair: string) {
  const val = await redisclient.get(`seq:${pair}`);
  if (val) pairSequence.set(pair, parseInt(val));
}

async function restoreAllPairs() {
  for (const market of SUPPORTED_MARKETS) {
    const snapshot = await SnapshotService.load(market);
    if (snapshot) {
      MatchingEngineService.restoreOrderbook(snapshot, market);
      const orderbookSnapshot = MatchingEngineService.getOrderbook(market);

      await restoreSequence(market);

      if (orderbookSnapshot) {
        const event = {
          event: "ORDERBOOK_SNAPSHOT",
          pair: market,
          bids: orderbookSnapshot.bids,
          asks: orderbookSnapshot.asks,
          updatedAt: Date.now(),
          eventId: crypto.randomUUID(),
          sequence: nextSequence(market),
        };
        await producer.send({
          topic: "orderbook.snapshot",
          messages: [
            {
              value: JSON.stringify(event),
              key: market,
            },
          ],
        });
      }
    }
  }
}

async function main() {
  await producer.connect();
  await restoreAllPairs();

  startSnapshotLoop();

  retainSequenceLoop();

  const consumer = createConsumer("matching-engine");

  await consumer.subscribe({ topic: "orders.create" });
  await consumer.subscribe({ topic: "orders.cancel" });
  await consumer.subscribe({ topic: "orders.expired" });

  await consumer.run({
    eachMessage: async ({ message, partition, topic }) => {
      const event = JSON.parse(message.value?.toString() || "");

      if (!event.eventId) {
        console.error("Event missing eventId, skipping dedup:", event);
        return;
      }

      const key = `processed:${event.eventId}`;

      const isAlreadyProcessed = await redisclient.get(key);

      if (isAlreadyProcessed) return;

      try {
        MatchingEngineService.processOrderEvent(event);

        await redisclient.set(key, "1", "EX", 86400); // 24 hours

        await consumer.commitOffsets([
          {
            offset: (Number(message.offset) + 1).toString(),
            partition: partition,
            topic: topic,
          },
        ]);
        const ob = MatchingEngineService.getOrderbook(event.pair);
        debugOrderBook(ob);
        console.log("Active pairs:", MatchingEngineService.getActivePairs());
      } catch (error) {
        console.error("Error processing order event:", error);

        throw error;
      }
    },
  });
}

const startSnapshotLoop = () => {
  setInterval(async () => {
    const activePairs = MatchingEngineService.getActivePairs();
    for (const pair of activePairs) {
      const snapshot = MatchingEngineService.serializeOrderbook(pair);

      if (!snapshot) continue;

      await SnapshotService.save(pair, snapshot);

      const orderbook = MatchingEngineService.getOrderbook(pair);

      if (!orderbook) continue;

      await redisclient.set(
        `snapshot:rendered:${pair}`,
        JSON.stringify({ bids: orderbook.bids, asks: orderbook.asks }),
        "EX",
        300,
      );

      // await producer.send({
      //   topic: "orderbook.snapshot",
      //   messages: [
      //     {
      //       value: JSON.stringify({
      //         eventId: crypto.randomUUID(),
      //         event: "ORDERBOOK_SNAPSHOT",
      //         pair: pair,
      //         bids: orderbook.bids,
      //         asks: orderbook.asks,
      //         sequence: nextSequence(pair),
      //       }),
      //       key: pair
      //     },
      //   ],
      // })
    }
  }, 10000);
};

const retainSequenceLoop = () => {
  setInterval(async () => {
    for (const [pair, seq] of pairSequence) {
      await redisclient.set(`seq:${pair}`, seq.toString());
    }
  }, 5000);
};

main();
