export type Rng = () => number;

/** Deterministic PRNG for tests and reproducible draws. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks one item proportionally to its weight. Items with weight <= 0 are skipped. */
export function weightedPick<T>(items: readonly T[], weightOf: (item: T) => number, rng: Rng): T | undefined {
  let total = 0;
  for (const item of items) total += Math.max(0, weightOf(item));
  if (total <= 0) return undefined;
  let roll = rng() * total;
  for (const item of items) {
    const w = Math.max(0, weightOf(item));
    if (w === 0) continue;
    if (roll < w) return item;
    roll -= w;
  }
  return items.findLast((i) => weightOf(i) > 0);
}
