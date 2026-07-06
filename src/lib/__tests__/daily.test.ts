import { describe, it, expect } from 'vitest';
import { dailyIndex, dateKey, streak, type DailyStore } from '@/lib/daily';

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
