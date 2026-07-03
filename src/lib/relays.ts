/**
 * Relay configuration — decentralization is only real if users can
 * choose their own infrastructure. The default set is a starting point,
 * not an authority: anyone can add relays or drop defaults, stored locally.
 */

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',       // US — large, reliable
  'wss://nos.lol',              // US — well-maintained
  'wss://relay.nostr.band',     // global indexer
  'wss://nostr.wine',           // EU — community
  'wss://relay.snort.social',   // EU — snort.social
  'wss://nostr-pub.wellorder.net', // global
];

const STORE_KEY = 'nk-relays';

type RelayConfig = { added: string[]; removed: string[] };

function readConfig(): RelayConfig {
  if (typeof window === 'undefined') return { added: [], removed: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '');
    return {
      added: Array.isArray(raw?.added) ? raw.added.filter((u: unknown) => typeof u === 'string') : [],
      removed: Array.isArray(raw?.removed) ? raw.removed.filter((u: unknown) => typeof u === 'string') : [],
    };
  } catch {
    return { added: [], removed: [] };
  }
}

function writeConfig(cfg: RelayConfig): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
}

export function normalizeRelayUrl(input: string): string | null {
  const s = input.trim().replace(/\/+$/, '');
  if (!/^wss:\/\/[a-z0-9.-]+(:\d+)?(\/[\w./-]*)?$/i.test(s)) return null;
  return s.toLowerCase();
}

/** The effective relay list: defaults minus removed, plus user-added. Never empty. */
export function getRelays(): string[] {
  const cfg = readConfig();
  const effective = [
    ...DEFAULT_RELAYS.filter((r) => !cfg.removed.includes(r)),
    ...cfg.added.filter((r) => !DEFAULT_RELAYS.includes(r)),
  ];
  return effective.length > 0 ? effective : [...DEFAULT_RELAYS];
}

/** Adds a relay (validated). Returns the new effective list, or null if invalid. */
export function addRelay(input: string): string[] | null {
  const url = normalizeRelayUrl(input);
  if (!url) return null;
  const cfg = readConfig();
  cfg.removed = cfg.removed.filter((r) => r !== url);
  if (!cfg.added.includes(url) && !DEFAULT_RELAYS.includes(url)) cfg.added.push(url);
  writeConfig(cfg);
  return getRelays();
}

/** Removes a relay. Refuses to drop the last one. Returns the new effective list. */
export function removeRelay(url: string): string[] {
  if (getRelays().length <= 1) return getRelays();
  const cfg = readConfig();
  cfg.added = cfg.added.filter((r) => r !== url);
  if (DEFAULT_RELAYS.includes(url) && !cfg.removed.includes(url)) cfg.removed.push(url);
  writeConfig(cfg);
  return getRelays();
}
