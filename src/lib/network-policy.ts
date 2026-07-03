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

export type NetworkPhase = 'founding' | 'live';

export function networkPhase(persons: number): NetworkPhase {
  return persons >= MIN_AGGREGATE_PERSONS ? 'live' : 'founding';
}

/** 0–1 progress toward unlocking live aggregates. */
export function foundingProgress(persons: number): number {
  return Math.min(1, persons / MIN_AGGREGATE_PERSONS);
}
