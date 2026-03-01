import { type OrderbookLevel } from "@repo/matching-engine-core";
import { createConsumer } from "@repo/kafka/src/consumer";
import { MatchingEngineService } from "./MatchEngineService";
import { SUPPORTED_MARKETS } from "@repo/common";
import { SnapshotService } from "./snapshotService";
import redisclient from "@repo/redisclient";
import { producer } from "@repo/kafka/src/producer";
import type { SnapshotOffset } from "./types";

function debugOrderBook(
  ob: { bids: OrderbookLevel[]; asks: OrderbookLevel[] } | null,
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

const currentSequence = (pair: string) => pairSequence.get(pair) ?? 0;

async function restoreSequence(pair: string) {
  const val = await redisclient.get(`seq:${pair}`);
  if (val) pairSequence.set(pair, parseInt(val, 10));
}

/**
 * Key format: "topic:partition" -> last committed offset string.
 * e.g. "orders.create:0" -> "42"
 */
const lastProcessedOffsets = new Map<string, string>();

/**
 * Key format: "pair" -> list of SnapshotOffset entries.
 * This correctly maps a market pair to the topic+partition+offset
 * that was last committed for it, so snapshots can store the right seek point.
 *
 * We track all topics because an order for pair BTC-USD could arrive
 * on orders.create, orders.cancel, or orders.expired.
 */
const pairOffsets = new Map<string, SnapshotOffset[]>();
const processedEventIds = new Set<string>();

function recordOffset(
  pair: string,
  topic: string,
  partition: number,
  offset: string,
) {
  const key = `${topic}:${partition}`;
  lastProcessedOffsets.set(key, offset);

  const existing = pairOffsets.get(pair) ?? [];
  const idx = existing.findIndex(
    (e) => e.topic === topic && e.partition === partition,
  );
  const entry: SnapshotOffset = { topic, partition, offset };
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.push(entry);
  }
  pairOffsets.set(pair, existing);
}

// ─── Snapshot loading ─────────────────────────────────────────────────────────

/**
 * Returns a flat list of {topic, partition, offset} to seek to on startup.
 */
const loadSnapshotSeekPoints = async (): Promise<SnapshotOffset[]> => {
  const seekPoints: SnapshotOffset[] = [];

  for (const market of SUPPORTED_MARKETS) {
    const snapshot = await SnapshotService.load(market);
    if (!snapshot?.lastCommittedOffsets) continue;

    for (const entry of snapshot.lastCommittedOffsets as SnapshotOffset[]) {
      seekPoints.push(entry);
    }
  }

  return seekPoints;
};

// ─── Restore ──────────────────────────────────────────────────────────────────

async function restoreAllPairs() {
  for (const market of SUPPORTED_MARKETS) {
    const snapshot = await SnapshotService.load(market);
    if (!snapshot) continue;

    MatchingEngineService.restoreOrderbook(snapshot, market);
    await restoreSequence(market);

    if (snapshot.processedEventIds) {
      for (const id of snapshot.processedEventIds as string[]) {
        processedEventIds.add(id);
      }
    }

    const orderbookSnapshot = MatchingEngineService.getOrderbook(market);
    if (!orderbookSnapshot) continue;

    const event = {
      event: "ORDERBOOK_SNAPSHOT",
      pair: market,
      bids: orderbookSnapshot.bids,
      asks: orderbookSnapshot.asks,
      updatedAt: Date.now(),
      eventId: crypto.randomUUID(),
      sequence: currentSequence(market),
    };

    await producer.send({
      topic: "orderbook.snapshot",
      messages: [{ value: JSON.stringify(event), key: market }],
    });
  }
}

// ─── Snapshot loop ────────────────────────────────────────────────────────────

const startSnapshotLoop = () => {
  setInterval(async () => {
    const activePairs = MatchingEngineService.getActivePairs();

    for (const pair of activePairs) {
      const snapshot = MatchingEngineService.serializeOrderbook(pair);
      if (!snapshot) continue;

      await SnapshotService.save(pair, {
        ...snapshot,
        lastCommittedOffsets: pairOffsets.get(pair) ?? [],
        processedEventIds: Array.from(processedEventIds),
      });

      processedEventIds.clear();

      const orderbook = MatchingEngineService.getOrderbook(pair);
      const lastTrades = MatchingEngineService.getRecentTrades(pair);
      if (!orderbook) continue;

      await redisclient.set(
        `snapshot:rendered:${pair}`,
        JSON.stringify({
          bids: orderbook.bids,
          asks: orderbook.asks,
          sequence: currentSequence(pair),
          lastTrades,
        }),
        "EX",
        300,
      );
    }
  }, 10_000);
};

// ─── Sequence persistence loop ────────────────────────────────────────────────

const retainSequenceLoop = () => {
  setInterval(async () => {
    for (const [pair, seq] of pairSequence) {
      await redisclient.set(`seq:${pair}`, seq.toString());
    }
  }, 5_000);
};

function setupGracefulShutdown(cleanup: () => Promise<void>) {
  const handle = (signal: string) => {
    console.log(`Received ${signal}, shutting down...`);
    cleanup()
      .catch((err) => console.error("Error during shutdown:", err))
      .finally(() => process.exit(0));
  };

  process.on("SIGTERM", () => handle("SIGTERM"));
  process.on("SIGINT", () => handle("SIGINT"));
}

async function main() {
  await producer.connect();

  const consumer = createConsumer("matching-engine");

  await consumer.connect();

  await consumer.subscribe({ topic: "orders.create" });
  await consumer.subscribe({ topic: "orders.cancel" });
  await consumer.subscribe({ topic: "orders.expired" });

  // 1. Load seek points BEFORE starting the consumer run loop
  const seekPoints = await loadSnapshotSeekPoints();

  const catchUpTargets = new Map<string, string>();
  for (const { topic, partition, offset } of seekPoints) {
    // offset is the NEXT offset to consume, so caught up means >= this offset
    catchUpTargets.set(`${topic}:${partition}`, offset);
  }

  // 2. Restore orderbook state BEFORE starting the consumer run loop
  await restoreAllPairs();

  const seekMap = new Map<string, string>();
  for (const { topic, partition, offset } of seekPoints) {
    seekMap.set(`${topic}:${partition}`, offset);
  }

  // 3. KafkaJS requires consumer.run() to be called BEFORE consumer.seek()
  //    The correct pattern is to seek inside the partitionsAssigned rebalance
  //    event, which fires after run() initializes the consumer group but
  //    before any messages are fetched for those partitions.
  consumer.on(consumer.events.GROUP_JOIN, () => {
    for (const { topic, partition, offset } of seekPoints) {
      consumer.seek({ topic, partition, offset });
      console.log(`Seeking ${topic}:${partition} to offset ${offset}`);
    }
  });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ message, partition, topic }) => {
      const raw = message.value?.toString();
      if (!raw) return;

      let event: any;
      try {
        event = JSON.parse(raw);
      } catch {
        console.error("Failed to parse message, skipping:", raw);
        return;
      }

      if (!event.eventId) {
        console.error("Event missing eventId, skipping dedup:", event);
        return;
      }
      try {
        const partitionKey = `${topic}:${partition}`;
        const catchUpTarget = catchUpTargets.get(partitionKey);

        // During recovery: check in-memory snapshot set instead of Redis
        // After recovery: check Redis as normal
        const isRecovering = catchUpTarget
          ? BigInt(message.offset) < BigInt(catchUpTarget)
          : false;

        if (isRecovering) {
          // Use in-memory dedup during replay
          if (processedEventIds.has(event.eventId)) return;
        } else {
          // Use Redis dedup for live traffic
          const isAlreadyProcessed = await redisclient.get(
            `processed:${event.eventId}`,
          );
          if (isAlreadyProcessed) return;
        }

        // --- process the event ---
        MatchingEngineService.processOrderEvent(event);

        // Track in both places
        processedEventIds.add(event.eventId);
        await redisclient.set(`processed:${event.eventId}`, "1", "EX", 86_400);

        const commitOffset = (Number(message.offset) + 1).toString();
        await consumer.commitOffsets([
          { topic, partition, offset: commitOffset },
        ]);
        recordOffset(event.pair, topic, partition, commitOffset);

        const seq = nextSequence(event.pair);

        const ob = MatchingEngineService.getOrderbook(event.pair);
        debugOrderBook(ob);
        console.log(
          `[${event.pair}] seq=${seq} | Active pairs:`,
          MatchingEngineService.getActivePairs(),
        );
      } catch (error) {
        console.error("Error processing order event:", error);
        throw error;
      }
    },
  });

  startSnapshotLoop();
  retainSequenceLoop();

  setupGracefulShutdown(async () => {
    await consumer.disconnect();
    await producer.disconnect();
    await redisclient.quit();
  });
}

main().catch((err) => {
  console.error("Fatal error in main:", err);
  process.exit(1);
});
