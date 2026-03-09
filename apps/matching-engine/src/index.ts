import { createConsumer } from "@repo/kafka/src/consumer";
import { MatchingEngineService } from "./MatchEngineService";
import { SUPPORTED_MARKETS } from "@repo/common";
import { SnapshotService } from "./snapshotService";
import redisclient from "@repo/redisclient";
import { producer } from "@repo/kafka/src/producer";
import type { SnapshotOffset } from "./types";
import { debugOrderBook } from "./utils/debugOrderbook";
import { restoreAllPairs } from "./recovery/restoreState";
import { startSnapshotLoop } from "./recovery/snapshotLoop";
import { hasProcessedEvent, markEventProcessed } from "./state/dedup";
import { markPairDirty } from "./state/dirtypairs";
import { recordOffset } from "./state/offsets";
import { nextSequence, retainSequenceLoop } from "./state/sequence";

const DEBUG = process.env.MATCHING_ENGINE_DEBUG === "true";

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

  const seekPoints = await loadSnapshotSeekPoints();

  const catchUpTargets = new Map<string, string>();
  for (const { topic, partition, offset } of seekPoints) {
    catchUpTargets.set(`${topic}:${partition}`, offset);
  }

  await restoreAllPairs(producer);

  // Use a one-shot flag so we only seek on the FIRST GROUP_JOIN
  // event (startup), not on every subsequent rebalance.  Re-seeking on
  // every rebalance would rewind partitions back to the snapshot offset and
  // replay already-processed events whenever the consumer group changes.
  let hasSeekOnStartup = false;

  consumer.on(consumer.events.GROUP_JOIN, () => {
    if (hasSeekOnStartup) {
      console.log("Rebalance detected — skipping seek (already recovered).");
      return;
    }
    hasSeekOnStartup = true;

    for (const { topic, partition, offset } of seekPoints) {
      consumer.seek({ topic, partition, offset });
      console.log(
        `[startup] Seeking ${topic}:${partition} to offset ${offset}`,
      );
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

      if (!SUPPORTED_MARKETS.includes(event.pair)) {
        console.error(
          `Event has unsupported pair "${event.pair}", skipping:`,
          event,
        );
        return;
      }

      try {
        const partitionKey = `${topic}:${partition}`;
        const catchUpTarget = catchUpTargets.get(partitionKey);

        const isRecovering = catchUpTarget
          ? BigInt(message.offset) < BigInt(catchUpTarget)
          : false;

        if (isRecovering) {
          // Use in-memory sliding-window dedup during replay.
          if (hasProcessedEvent(event.eventId)) return;
        } else {
          // Use Redis dedup for live traffic.
          const isAlreadyProcessed = await redisclient.get(
            `processed:${event.eventId}`,
          );
          if (isAlreadyProcessed) return;
        }

        MatchingEngineService.processOrderEvent(event);
        markPairDirty(event.pair);

        markEventProcessed(event.eventId);

        await redisclient.set(`processed:${event.eventId}`, "1", "EX", 86_400);

        // Record the offset in memory BEFORE committing to Kafka.
        // Previously recordOffset() was called after commitOffsets(), meaning
        // a crash between the two would advance Kafka's pointer while leaving
        // pairOffsets stale — causing a missed event on recovery.
        const commitOffset = (Number(message.offset) + 1).toString();
        recordOffset(event.pair, topic, partition, commitOffset); // record first

        await consumer.commitOffsets([
          { topic, partition, offset: commitOffset },
        ]);

        const seq = nextSequence(event.pair);

        const ob = MatchingEngineService.getOrderbook(event.pair);
        debugOrderBook(DEBUG, ob);
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
