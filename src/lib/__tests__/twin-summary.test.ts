import { describe, it, expect } from 'vitest';
import { summarizeTwin, poleText, STRONG_AT, LEAN_AT } from '../twin-summary';
import { TOPICS, type TopicKey } from '@/types';

const mid = () => Object.fromEntries(TOPICS.map(k => [k, 50])) as Record<TopicKey, number>;

describe('summarizeTwin', () => {
  it('everything at 50 is fully balanced', () => {
    const { leans, balanced } = summarizeTwin(mid());
    expect(leans).toEqual([]);
    expect(balanced).toEqual([...TOPICS]);
  });

  it('classifies strong, lean and balanced by distance from center', () => {
    const v = mid();
    v.klimaschutz = 50 + STRONG_AT;      // strong right
    v.migration = 50 - (LEAN_AT + 1);    // lean left
    v.bildung = 50 + (LEAN_AT - 1);      // balanced
    const { leans, balanced } = summarizeTwin(v);
    expect(leans).toEqual([
      { key: 'klimaschutz', pole: 'right', strength: 'strong' },
      { key: 'migration', pole: 'left', strength: 'lean' },
    ]);
    expect(balanced).toContain('bildung');
  });

  it('sorts leans by decisiveness, most decisive first', () => {
    const v = mid();
    v.freiheit = 95;
    v.europa = 62;
    v.sozialstaat = 20;
    const { leans } = summarizeTwin(v);
    expect(leans.map(l => l.key)).toEqual(['freiheit', 'sozialstaat', 'europa']);
  });

  it('poleText flattens the two-line slider captions', () => {
    expect(poleText('CO₂-Steuer +\nVerbrenner-Verbot 2035')).toBe('CO₂-Steuer + Verbrenner-Verbot 2035');
    expect(poleText('  End mass \n surveillance ')).toBe('End mass surveillance');
  });
});
