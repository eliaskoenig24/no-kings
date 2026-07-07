/**
 * Honesty rules for the network view.
 *
 * Aggregates ("the collective will") are only shown once enough distinct
 * persons contributed. Below the threshold we show the founding state —
 * a real count, never simulated numbers presented as real.
 *
 * The threshold serves two purposes:
 * 1. Statistics: an average of 4 people is noise, not a signal.
 * 2. Privacy (k-anonymity): with very few participants, an aggregate
 *    can expose an individual's political profile — sensitive data
 *    under GDPR Art. 9.
 */
export const MIN_AGGREGATE_PERSONS = 25;

/**
 * Tiered k-anonymity: a single yes/no answer to the daily question reveals
 * far less about a person than a full 8-dimension profile, so its reveal
 * threshold can be lower without endangering anyone. Full-profile and
 * regional aggregates stay at MIN_AGGREGATE_PERSONS.
 */
export const DAILY_MIN_PERSONS = 10;

export type NetworkPhase = 'founding' | 'live';

export function networkPhase(persons: number): NetworkPhase {
  return persons >= MIN_AGGREGATE_PERSONS ? 'live' : 'founding';
}

/** 0–1 progress toward unlocking live aggregates. */
export function foundingProgress(persons: number): number {
  return Math.min(1, persons / MIN_AGGREGATE_PERSONS);
}

/**
 * Groups twins by region and applies the SAME k-anonymity rule per bucket:
 * a region's aggregate unlocks only once that region alone has enough persons —
 * regardless of how big the global network is.
 */
export function groupByRegion<T extends { region?: string }>(
  twins: T[],
): { code: string; twins: T[]; count: number; unlocked: boolean }[] {
  const map = new Map<string, T[]>();
  for (const t of twins) {
    if (!t.region) continue;
    const list = map.get(t.region) ?? [];
    list.push(t);
    map.set(t.region, list);
  }
  return [...map.entries()]
    .map(([code, list]) => ({
      code,
      twins: list,
      count: list.length,
      unlocked: list.length >= MIN_AGGREGATE_PERSONS,
    }))
    .sort((a, b) => b.count - a.count);
}
