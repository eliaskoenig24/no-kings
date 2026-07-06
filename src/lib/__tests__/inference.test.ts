import { describe, it, expect } from 'vitest';
import { inferPosition, aggregateForItem } from '@/lib/inference';
import type { AgendaItem, TwinValues } from '@/types';

const uniform = (v: number): TwinValues => ({
  klimaschutz: v, sozialstaat: v, wirtschaft: v, bildung: v,
  gesundheit: v, migration: v, freiheit: v, europa: v,
});

const item = (weights: AgendaItem['topicWeights']): AgendaItem => ({
  id: 'test', text: { en: 't' }, description: { en: 'd' },
  topicWeights: weights, category: 'klimaschutz', addedAt: '2026-01-01', tags: [],
});

describe('inferPosition — the twin answers for you', () => {
  it('is exactly neutral for a neutral twin', () => {
    const v = inferPosition(uniform(0.5), item({ klimaschutz: 0.6, migration: 0.4 }));
    expect(v.score).toBeCloseTo(0.5);
  });

  it('positive weight + high dimension → support', () => {
    const v = inferPosition({ ...uniform(0.5), klimaschutz: 1 }, item({ klimaschutz: 1 }));
    expect(v.score).toBeCloseTo(1);
  });

  it('negative weight inverts the direction', () => {
    const v = inferPosition({ ...uniform(0.5), migration: 1 }, item({ migration: -1 }));
    expect(v.score).toBeCloseTo(0);
  });

  it('clamps to [0,1] even with extreme weights', () => {
    const v = inferPosition(uniform(1), item({ klimaschutz: 2, europa: 2 }));
    expect(v.score).toBeLessThanOrEqual(1);
    expect(v.score).toBeGreaterThanOrEqual(0);
  });

  it('confidence grows with total weight, capped at 1', () => {
    expect(inferPosition(uniform(0.5), item({ klimaschutz: 0.2 })).confidence).toBeCloseTo(0.2);
    expect(inferPosition(uniform(0.5), item({ klimaschutz: 0.8, europa: -0.8 })).confidence).toBe(1);
  });
});

describe('aggregateForItem', () => {
  it('splits an evenly opposed population 50/50', () => {
    const pro = { ...uniform(0.5), klimaschutz: 0.9 };
    const con = { ...uniform(0.5), klimaschutz: 0.1 };
    const agg = aggregateForItem([pro, con, pro, con], item({ klimaschutz: 1 }));
    expect(agg.support).toBe(0.5);
    expect(agg.count).toBe(4);
  });

  it('handles an empty population without dividing by zero', () => {
    const agg = aggregateForItem([], item({ klimaschutz: 1 }));
    expect(agg.support).toBe(0.5);
    expect(agg.count).toBe(0);
  });
});
