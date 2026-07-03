import { describe, it, expect } from 'vitest';
import { PubkeyDeduper } from '@/lib/nostr-reader';
import { TWIN_KIND, TWIN_D_TAG } from '@/lib/nostr';

const VALUES = JSON.stringify({
  klimaschutz: 0.8, sozialstaat: 0.7, wirtschaft: 0.4, bildung: 0.9,
  gesundheit: 0.8, migration: 0.6, freiheit: 0.7, europa: 0.75,
});

let idCounter = 0;
function makeEvent(overrides: Partial<{
  id: string; pubkey: string; kind: number; created_at: number; content: string; tags: string[][];
}> = {}) {
  idCounter++;
  return {
    id: overrides.id ?? `ffff${String(idCounter).padStart(60, 'a')}`,
    pubkey: overrides.pubkey ?? 'pubkey-A',
    kind: overrides.kind ?? TWIN_KIND,
    created_at: overrides.created_at ?? 1_000,
    content: overrides.content ?? VALUES,
    tags: overrides.tags ?? [['d', TWIN_D_TAG], ['nk-twin', VALUES]],
  };
}

describe('PubkeyDeduper — one person, one entry', () => {
  it('counts the same pubkey only once across multiple events', () => {
    const d = new PubkeyDeduper();
    d.add(makeEvent({ pubkey: 'A', created_at: 100 }));
    d.add(makeEvent({ pubkey: 'A', created_at: 200 }));
    d.add(makeEvent({ pubkey: 'A', created_at: 300 }));
    expect(d.twins()).toHaveLength(1);
    expect(d.stats().persons).toBe(1);
    expect(d.stats().events).toBe(3);
  });

  it('keeps the newest event per pubkey', () => {
    const d = new PubkeyDeduper();
    d.add(makeEvent({ pubkey: 'A', created_at: 100 }));
    d.add(makeEvent({ pubkey: 'A', created_at: 300 }));
    d.add(makeEvent({ pubkey: 'A', created_at: 200 }));
    const twin = d.twins()[0];
    expect(new Date(twin.createdAt).getTime()).toBe(300 * 1000);
  });

  it('prefers the addressable record over a newer legacy kind-1 note', () => {
    const d = new PubkeyDeduper();
    d.add(makeEvent({ pubkey: 'A', kind: TWIN_KIND, created_at: 100 }));
    d.add(makeEvent({ pubkey: 'A', kind: 1, created_at: 999 }));
    const twin = d.twins()[0];
    expect(new Date(twin.createdAt).getTime()).toBe(100 * 1000);
  });

  it('upgrades from legacy kind-1 to addressable record', () => {
    const d = new PubkeyDeduper();
    d.add(makeEvent({ pubkey: 'A', kind: 1, created_at: 999 }));
    d.add(makeEvent({ pubkey: 'A', kind: TWIN_KIND, created_at: 100 }));
    const twin = d.twins()[0];
    expect(new Date(twin.createdAt).getTime()).toBe(100 * 1000);
  });

  it('ignores exact duplicate events (same id from multiple relays)', () => {
    const d = new PubkeyDeduper();
    const ev = makeEvent({ pubkey: 'A' });
    expect(d.add(ev)).toBe(true);
    expect(d.add(ev)).toBe(false);
    expect(d.stats().events).toBe(1);
  });

  it('counts different pubkeys separately', () => {
    const d = new PubkeyDeduper();
    d.add(makeEvent({ pubkey: 'A' }));
    d.add(makeEvent({ pubkey: 'B' }));
    d.add(makeEvent({ pubkey: 'C' }));
    expect(d.stats().persons).toBe(3);
  });

  it('rejects events with out-of-range or missing twin values', () => {
    const d = new PubkeyDeduper();
    const bad = JSON.stringify({ klimaschutz: 1.5 });
    d.add(makeEvent({ pubkey: 'A', content: bad, tags: [['nk-twin', bad]] }));
    expect(d.twins()).toHaveLength(0);
  });

  it('marks proof-of-work events as verified, others as unverified', () => {
    const d = new PubkeyDeduper();
    // 6 leading zero hex chars = 24 bits >= TWIN_POW_BITS (18)
    d.add(makeEvent({ pubkey: 'A', id: '000000' + 'b'.repeat(58) }));
    d.add(makeEvent({ pubkey: 'B', id: 'ffff' + 'c'.repeat(60) }));
    const stats = d.stats();
    expect(stats.persons).toBe(2);
    expect(stats.verified).toBe(1);
    const tiers = Object.fromEntries(d.twins().map((t) => [t.pubkey, t.tier]));
    expect(tiers['A']).toBe('pow');
    expect(tiers['B']).toBe('unverified');
  });
});
