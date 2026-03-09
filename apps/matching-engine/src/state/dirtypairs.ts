const dirtyPairs = new Set<string>();

export function markPairDirty(pair: string) {
  dirtyPairs.add(pair);
}

export function getDirtyPairs(): string[] {
  const pairs = Array.from(dirtyPairs);
  dirtyPairs.clear();
  return pairs;
}
