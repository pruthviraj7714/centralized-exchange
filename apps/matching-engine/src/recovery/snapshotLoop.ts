import { MatchingEngineService } from "../MatchEngineService";
import { getDirtyPairs } from "../state/dirtypairs";
import { SnapshotService } from "../snapshotService";
import {
  getCurrentProcessedIds,
  rotateProcessedEventIds,
} from "../state/dedup";
import { getPairOffsets } from "../state/offsets";

export const startSnapshotLoop = () => {
  setInterval(async () => {
    const pairsToSnapshot = getDirtyPairs();

    for (const pair of pairsToSnapshot) {
      const snapshot = MatchingEngineService.serializeOrderbook(pair);
      if (!snapshot) continue;

      //Rotate the sliding window AFTER we have captured a consistent
      // snapshot of processedEventIdsCurrent.  The save below persists
      // "current", then we rotate so new events go into a fresh set while
      // "previous" still covers any IDs that arrived just before the rotate.
      const snapshotIds = getCurrentProcessedIds();
      rotateProcessedEventIds();

      await SnapshotService.save(pair, {
        ...snapshot,
        lastCommittedOffsets: getPairOffsets(pair),
        processedEventIds: snapshotIds,
      });
    }
  }, 10_000);
};
