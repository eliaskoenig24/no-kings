/**
 * Pure similarity math — shared by the client and the AI worker.
 * No imports with side effects: the worker bundle must stay clean.
 */

/** Below this cosine score a match is noise, not meaning (tuned via e2e:talk). */
export const MATCH_THRESHOLD = 0.82;

/** Dot product of normalized vectors = cosine similarity. */
export function cosine(a: Float32Array | number[], b: Float32Array | number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Top-k items by score above a floor, best first. */
export function topK<T>(items: T[], scores: number[], k: number, minScore: number): { item: T; score: number }[] {
  return items
    .map((item, i) => ({ item, score: scores[i] }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
