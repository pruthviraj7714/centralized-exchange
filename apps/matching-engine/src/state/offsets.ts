import type { SnapshotOffset } from "../types";

/**
 * Use a Map<"topic:partition", SnapshotOffset> per pair instead of an
 * array so upserts are O(1) rather than O(n) linear scans.
 *
 * Key format: pair -> Map<"topic:partition", SnapshotOffset>
 */
const pairOffsets = new Map<string, Map<string, SnapshotOffset>>();

export function recordOffset(
  pair: string,
  topic: string,
  partition: number,
  offset: string,
) {
  let inner = pairOffsets.get(pair);

  if (!inner) {
    inner = new Map();
    pairOffsets.set(pair, inner);
  }

  inner.set(`${topic}:${partition}`, { topic, partition, offset });
}

export function getPairOffsets(pair: string): SnapshotOffset[] {
  const inner = pairOffsets.get(pair);
  return inner ? Array.from(inner.values()) : [];
}
