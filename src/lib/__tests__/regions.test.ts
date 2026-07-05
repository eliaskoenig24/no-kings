import { describe, it, expect } from 'vitest';
import { REGIONS, regionsForCountry, regionName, isValidRegion } from '@/data/regions';
import { groupByRegion, MIN_AGGREGATE_PERSONS } from '@/lib/network-policy';
import { PubkeyDeduper } from '@/lib/nostr-reader';
import { TWIN_KIND, TWIN_D_TAG } from '@/lib/nostr';

describe('region data integrity', () => {
  it('every code carries its country prefix and is unique', () => {
    const seen = new Set<string>();
    for (const [country, list] of Object.entries(REGIONS)) {
      for (const r of list) {
        expect(r.code.startsWith(country + '-')).toBe(true);
        expect(seen.has(r.code)).toBe(false);
        seen.add(r.code);
        expect(r.name.length).toBeGreaterThan(1);
      }
    }
  });

  it('German list has all 16 states, US list all 50', () => {
    expect(REGIONS.DE).toHaveLength(16);
    expect(REGIONS.US).toHaveLength(50);
  });

  it('resolves names and validates codes', () => {
    expect(regionName('DE-BY')).toBe('Bayern');
    expect(isValidRegion('DE-BY')).toBe(true);
    expect(isValidRegion('DE-XX')).toBe(false);
    expect(isValidRegion('XX-BY')).toBe(false);
    expect(regionsForCountry('de')).toHaveLength(16);
    expect(regionsForCountry('ZZ')).toHaveLength(0);
    expect(regionsForCountry(null)).toHaveLength(0);
  });
});

describe('groupByRegion — per-region k-anonymity', () => {
  const twin = (region?: string) => ({ region });

  it('groups by region and sorts by size', () => {
    const twins = [
      ...Array(5).fill(0).map(() => twin('DE-BY')),
      ...Array(3).fill(0).map(() => twin('DE-BE')),
      twin(undefined),
    ];
    const buckets = groupByRegion(twins);
    expect(buckets.map(b => b.code)).toEqual(['DE-BY', 'DE-BE']);
    expect(buckets[0].count).toBe(5);
  });

  it('unlocks a region only at its own threshold, regardless of network size', () => {
    const twins = [
      ...Array(MIN_AGGREGATE_PERSONS).fill(0).map(() => twin('DE-BY')),
      ...Array(MIN_AGGREGATE_PERSONS - 1).fill(0).map(() => twin('DE-BE')),
      ...Array(1000).fill(0).map(() => twin(undefined)), // huge network without regions
    ];
    const buckets = groupByRegion(twins);
    expect(buckets.find(b => b.code === 'DE-BY')?.unlocked).toBe(true);
    expect(buckets.find(b => b.code === 'DE-BE')?.unlocked).toBe(false);
  });
});

describe('region tag parsing on network twins', () => {
  const VALUES = JSON.stringify({
    klimaschutz: 0.5, sozialstaat: 0.5, wirtschaft: 0.5, bildung: 0.5,
    gesundheit: 0.5, migration: 0.5, freiheit: 0.5, europa: 0.5,
  });
  let n = 0;
  const ev = (tags: string[][]) => ({
    id: `e${String(++n).padStart(63, '0')}`,
    pubkey: `pk-${n}`,
    kind: TWIN_KIND,
    created_at: 1000,
    content: VALUES,
    tags: [['d', TWIN_D_TAG], ['nk-twin', VALUES], ...tags],
  });

  it('accepts a valid, country-matching region', () => {
    const d = new PubkeyDeduper();
    d.add(ev([['g', 'DE'], ['nk-region', 'DE-BY']]));
    expect(d.twins()[0].region).toBe('DE-BY');
    expect(d.twins()[0].country).toBe('DE');
  });

  it('drops regions that are not in the curated list', () => {
    const d = new PubkeyDeduper();
    d.add(ev([['g', 'DE'], ['nk-region', 'DE-MÜNCHEN-SCHWABING']]));
    expect(d.twins()[0].region).toBeUndefined();
  });

  it('drops regions that contradict the stated country', () => {
    const d = new PubkeyDeduper();
    d.add(ev([['g', 'FR'], ['nk-region', 'DE-BY']]));
    expect(d.twins()[0].region).toBeUndefined();
  });

  it('accepts a region without a country tag', () => {
    const d = new PubkeyDeduper();
    d.add(ev([['nk-region', 'AT-9']]));
    expect(d.twins()[0].region).toBe('AT-9');
  });
});
