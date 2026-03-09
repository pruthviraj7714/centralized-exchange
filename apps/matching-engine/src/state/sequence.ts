import redisclient from "@repo/redisclient";

const pairSequence = new Map<string, number>();

//Track which pairs have had their sequence changed since the last
// Redis persist so we skip unnecessary writes in retainSequenceLoop.
const dirtySequences = new Set<string>();

export const nextSequence = (pair: string) => {
  const current = pairSequence.get(pair) ?? 0;
  const next = current + 1;
  pairSequence.set(pair, next);
  dirtySequences.add(pair);
  return next;
};

export const currentSequence = (pair: string) => pairSequence.get(pair) ?? 0;

export async function restoreSequence(pair: string) {
  const val = await redisclient.get(`seq:${pair}`);
  if (val) pairSequence.set(pair, parseInt(val, 10));
}

export const getDirtySequences = () => Array.from(dirtySequences);

export const clearDirtySequences = () => dirtySequences.clear();

export const setSequence = (pair: string, seq: number) => {
  pairSequence.set(pair, seq);
};

export const retainSequenceLoop = () => {
  setInterval(async () => {
    for (const [pair, seq] of pairSequence) {
      await redisclient.set(`seq:${pair}`, seq.toString());
    }
  }, 5_000);
};
