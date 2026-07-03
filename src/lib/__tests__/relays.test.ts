import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_RELAYS, getRelays, addRelay, removeRelay, normalizeRelayUrl } from '@/lib/relays';

// minimal localStorage shim for node
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  (globalThis as Record<string, unknown>).window = globalThis;
});

describe('normalizeRelayUrl', () => {
  it('accepts wss urls and strips trailing slashes', () => {
    expect(normalizeRelayUrl('wss://relay.example.com/')).toBe('wss://relay.example.com');
    expect(normalizeRelayUrl('  WSS://Relay.Example.com  ')).toBe('wss://relay.example.com');
  });

  it('rejects non-websocket and garbage urls', () => {
    expect(normalizeRelayUrl('https://example.com')).toBeNull();
    expect(normalizeRelayUrl('relay.example.com')).toBeNull();
    expect(normalizeRelayUrl('wss://not a url')).toBeNull();
    expect(normalizeRelayUrl('')).toBeNull();
  });
});

describe('relay configuration', () => {
  it('returns defaults with no stored config', () => {
    expect(getRelays()).toEqual(DEFAULT_RELAYS);
  });

  it('adds a custom relay and persists it', () => {
    const next = addRelay('wss://my.relay.org');
    expect(next).toContain('wss://my.relay.org');
    expect(getRelays()).toContain('wss://my.relay.org');
  });

  it('rejects invalid relay input', () => {
    expect(addRelay('http://nope.com')).toBeNull();
    expect(getRelays()).toEqual(DEFAULT_RELAYS);
  });

  it('removes a default relay persistently', () => {
    const victim = DEFAULT_RELAYS[0];
    const next = removeRelay(victim);
    expect(next).not.toContain(victim);
    expect(getRelays()).not.toContain(victim);
  });

  it('re-adding a removed default restores it', () => {
    const victim = DEFAULT_RELAYS[0];
    removeRelay(victim);
    addRelay(victim);
    expect(getRelays()).toContain(victim);
  });

  it('never drops the last relay', () => {
    let list = getRelays();
    for (const url of [...list]) list = removeRelay(url);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});
