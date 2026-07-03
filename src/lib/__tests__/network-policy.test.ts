import { describe, it, expect } from 'vitest';
import { MIN_AGGREGATE_PERSONS, networkPhase, foundingProgress } from '@/lib/network-policy';

describe('network policy — honest aggregates', () => {
  it('stays in founding phase below the threshold', () => {
    expect(networkPhase(0)).toBe('founding');
    expect(networkPhase(MIN_AGGREGATE_PERSONS - 1)).toBe('founding');
  });

  it('goes live exactly at the threshold', () => {
    expect(networkPhase(MIN_AGGREGATE_PERSONS)).toBe('live');
    expect(networkPhase(MIN_AGGREGATE_PERSONS * 10)).toBe('live');
  });

  it('reports progress between 0 and 1, clamped', () => {
    expect(foundingProgress(0)).toBe(0);
    expect(foundingProgress(MIN_AGGREGATE_PERSONS / 2)).toBeCloseTo(0.5);
    expect(foundingProgress(MIN_AGGREGATE_PERSONS)).toBe(1);
    expect(foundingProgress(MIN_AGGREGATE_PERSONS * 3)).toBe(1);
  });
});
