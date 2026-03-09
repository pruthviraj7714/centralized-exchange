// ─── Dedup: bounded sliding window ────────────────────────────────────────────

/**
 * Replace the single shared Set + blanket .clear() with a bounded
 * sliding window so we never accidentally drop IDs for in-flight events.
 *
 * Strategy:
 *  - Keep a "current" set that accumulates IDs during the current window.
 *  - Keep a "previous" set from the last snapshot cycle.
 *  - On snapshot: rotate current → previous, start a fresh current.
 *  - Lookup checks both sets, so an ID is retained for at least one full
 *    snapshot interval (10 s) after it was first seen — long enough for any
 *    in-flight message to be committed.
 */
let processedEventIdsCurrent = new Set<string>();
let processedEventIdsPrevious = new Set<string>();

export function hasProcessedEvent(id: string): boolean {
  return processedEventIdsCurrent.has(id) || processedEventIdsPrevious.has(id);
}

export function markEventProcessed(id: string) {
  processedEventIdsCurrent.add(id);
}

export function rotateProcessedEventIds() {
  processedEventIdsPrevious = processedEventIdsCurrent;
  processedEventIdsCurrent = new Set();
}

export function getCurrentProcessedIds() {
  return Array.from(processedEventIdsCurrent);
}

export function restoreProcessedIds(ids: string[]) {
  for (const id of ids) {
    processedEventIdsCurrent.add(id);
  }
}
