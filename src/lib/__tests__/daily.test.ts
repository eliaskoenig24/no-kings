import { describe, it, expect } from 'vitest';
import { dailyIndex, dateKey, streak, aggregateDailyEntries, type DailyStore, type PublishedDaily } from '@/lib/daily';

describe('aggregateDailyEntries — the perception gap', () => {
  const e = (pubkey: string, stance: 'for' | 'against', guess: number): PublishedDaily => ({ pubkey, stance, guess });

  it('computes support share, mean guess, and the gap', () => {
    const agg = aggregateDailyEntries([
      e('a', 'for', 30), e('b', 'for', 40), e('c', 'against', 20), e('d', 'for', 30),
    ]);
    expect(agg.n).toBe(4);
    expect(agg.support).toBe(0.75);
    expect(agg.meanGuess).toBe(30);
    expect(agg.gap).toBe(45); // 75% reality vs 30% guessed
  });

  it('counts every pubkey exactly once (last entry wins)', () => {
    const agg = aggregateDailyEntries([e('a', 'for', 10), e('a', 'against', 90)]);
    expect(agg.n).toBe(1);
    expect(agg.support).toBe(0);
  });

  it('only counts pubkeys that carry a twin when a known-set is given', () => {
    const agg = aggregateDailyEntries(
      [e('twin-owner', 'for', 50), e('spam-1', 'against', 0), e('spam-2', 'against', 0)],
      new Set(['twin-owner']),
    );
    expect(agg.n).toBe(1);
    expect(agg.support).toBe(1);
  });

  it('drops out-of-range guesses and handles empty input', () => {
    expect(aggregateDailyEntries([e('a', 'for', 150)]).n).toBe(0);
    expect(aggregateDailyEntries([]).n).toBe(0);
  });
});

describe('dailyIndex', () => {
  it('is deterministic and within bounds', () => {
    const d = new Date('2026-07-06T15:00:00');
    expect(dailyIndex(30, d)).toBe(dailyIndex(30, new Date('2026-07-06T03:00:00')));
    expect(dailyIndex(30, d)).toBeGreaterThanOrEqual(0);
    expect(dailyIndex(30, d)).toBeLessThan(30);
  });

  it('advances by one each day (mod length)', () => {
    const a = dailyIndex(30, new Date('2026-07-06'));
    const b = dailyIndex(30, new Date('2026-07-07'));
    expect((a + 1) % 30).toBe(b);
  });
});

describe('streak', () => {
  const entry = { questionId: 'q', stance: 'for' as const, guess: 50 };

  it('counts consecutive answered days including today', () => {
    const store: DailyStore = {
      [dateKey(new Date('2026-07-06'))]: entry,
      [dateKey(new Date('2026-07-05'))]: entry,
      [dateKey(new Date('2026-07-04'))]: entry,
    };
    expect(streak(store, new Date('2026-07-06'))).toBe(3);
  });

  it('keeps the streak alive if today is not answered yet', () => {
    const store: DailyStore = {
      [dateKey(new Date('2026-07-05'))]: entry,
      [dateKey(new Date('2026-07-04'))]: entry,
    };
    expect(streak(store, new Date('2026-07-06'))).toBe(2);
  });

  it('breaks on a gap', () => {
    const store: DailyStore = {
      [dateKey(new Date('2026-07-06'))]: entry,
      [dateKey(new Date('2026-07-03'))]: entry,
    };
    expect(streak(store, new Date('2026-07-06'))).toBe(1);
  });

  it('is 0 for an empty store', () => {
    expect(streak({}, new Date('2026-07-06'))).toBe(0);
  });
});
