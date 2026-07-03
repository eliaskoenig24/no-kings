import { Relay } from 'nostr-tools/relay';
import { getPow } from 'nostr-tools/nip13';
import type { TwinProfile } from '@/types';
import { NK_RELAYS, TWIN_KIND, TWIN_D_TAG, TWIN_POW_BITS } from './nostr';

const TWIN_FIELDS = [
  'klimaschutz',
  'sozialstaat',
  'wirtschaft',
  'bildung',
  'gesundheit',
  'migration',
  'freiheit',
  'europa',
] as const;

/**
 * A twin as seen on the network. `pubkey` is the person-identifier:
 * aggregation counts each pubkey exactly once, no matter how many
 * events it published. `tier` states how much the record cost to create —
 * we display this honestly instead of pretending every entry is a human.
 */
export type NetworkTwin = TwinProfile & {
  pubkey: string;
  powBits: number;
  tier: 'pow' | 'unverified';
};

export type NetworkStats = {
  events: number;   // raw events seen across relays (before dedup)
  persons: number;  // unique pubkeys after dedup
  verified: number; // of those, records carrying valid proof-of-work
};

type RawEvent = {
  id: string;
  pubkey: string;
  kind: number;
  content: string;
  created_at: number;
  tags: string[][];
};

function parseTwinEvent(event: RawEvent): NetworkTwin | null {
  try {
    let raw: Record<string, unknown> | null = null;

    const nkTag = event.tags?.find(t => t[0] === 'nk-twin');
    if (nkTag?.[1]) {
      try { raw = JSON.parse(nkTag[1]); } catch { /* fall through */ }
    }
    if (!raw) {
      try { raw = JSON.parse(event.content); } catch { return null; }
    }
    if (!raw) return null;

    for (const field of TWIN_FIELDS) {
      const v = raw[field];
      if (typeof v !== 'number' || v < 0 || v > 1) return null;
    }
    const values = {
      klimaschutz: raw.klimaschutz as number,
      sozialstaat: raw.sozialstaat as number,
      wirtschaft: raw.wirtschaft as number,
      bildung: raw.bildung as number,
      gesundheit: raw.gesundheit as number,
      migration: raw.migration as number,
      freiheit: raw.freiheit as number,
      europa: raw.europa as number,
    };
    const iso = new Date(event.created_at * 1000).toISOString();
    const powBits = getPow(event.id);
    return {
      id: event.id,
      pubkey: event.pubkey,
      powBits,
      tier: powBits >= TWIN_POW_BITS ? 'pow' : 'unverified',
      ...values,
      createdAt: iso,
      updatedAt: iso,
    };
  } catch {
    return null;
  }
}

type NostrFilter = {
  kinds: number[];
  limit: number;
  '#t'?: string[];
  '#d'?: string[];
  '#g'?: string[];
  authors?: string[];
};

/** Both generations of twin records: addressable (current) and kind-1 (legacy). */
function twinFilters(extra?: Partial<NostrFilter>): NostrFilter[] {
  return [
    { kinds: [TWIN_KIND], '#d': [TWIN_D_TAG], limit: 1000, ...extra },
    { kinds: [1], '#t': [TWIN_D_TAG], limit: 500, ...extra },
  ];
}

/**
 * One person, one entry: keeps a single event per pubkey, preferring the
 * addressable record over legacy notes, then the newest timestamp.
 */
export class PubkeyDeduper {
  private byPubkey = new Map<string, RawEvent>();
  private seenIds = new Set<string>();
  public events = 0;

  /** Returns true if this event changed the deduped set. */
  add(event: RawEvent): boolean {
    if (this.seenIds.has(event.id)) return false;
    this.seenIds.add(event.id);
    this.events++;

    const current = this.byPubkey.get(event.pubkey);
    if (current) {
      const preferNew =
        (event.kind === TWIN_KIND && current.kind !== TWIN_KIND) ||
        (event.kind === current.kind && event.created_at > current.created_at);
      if (!preferNew) return false;
    }
    this.byPubkey.set(event.pubkey, event);
    return true;
  }

  twins(): NetworkTwin[] {
    const out: NetworkTwin[] = [];
    for (const ev of this.byPubkey.values()) {
      const twin = parseTwinEvent(ev);
      if (twin) out.push(twin);
    }
    return out;
  }

  rawEvents(): RawEvent[] {
    return [...this.byPubkey.values()];
  }

  stats(twins?: NetworkTwin[]): NetworkStats {
    const list = twins ?? this.twins();
    return {
      events: this.events,
      persons: list.length,
      verified: list.filter(t => t.tier === 'pow').length,
    };
  }
}

function collectFromRelay(
  url: string,
  filters: NostrFilter[],
  timeoutMs: number,
  onEvent: (event: RawEvent) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let relay: Relay | null = null;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try { relay?.close(); } catch { /* ignore */ }
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);

    (async () => {
      try {
        relay = new Relay(url);
        await relay.connect();
        relay.subscribe(filters, {
          onevent(event) {
            onEvent(event as RawEvent);
          },
          oneose() {
            clearTimeout(timer);
            finish();
          },
        });
      } catch {
        clearTimeout(timer);
        finish();
      }
    })();
  });
}

/**
 * Fetches the deduplicated network: every pubkey counted once,
 * with honest stats about how many raw events that collapsed from.
 */
export async function fetchUniqueNetworkTwins(
  timeoutMs = 6000,
  countryCode?: string | null,
): Promise<{ twins: NetworkTwin[]; stats: NetworkStats }> {
  const dedup = new PubkeyDeduper();
  const extra: Partial<NostrFilter> = countryCode
    ? { '#g': [countryCode.toUpperCase()] }
    : {};

  try {
    await Promise.all(
      NK_RELAYS.map((url) =>
        collectFromRelay(url, twinFilters(extra), timeoutMs, (ev) => dedup.add(ev)),
      ),
    );
  } catch {
    // fall through with whatever arrived
  }

  const twins = dedup.twins();
  return { twins, stats: dedup.stats(twins) };
}

/**
 * Live-streaming variant: calls onUpdate with the full deduplicated set
 * whenever it changes. Use this for the network page so arriving twins
 * animate in without ever double-counting a person.
 */
export function subscribeToUniqueNetworkTwins(
  onUpdate: (twins: NetworkTwin[], stats: NetworkStats) => void,
  onEose: () => void,
  timeoutMs: number = 30000,
): () => void {
  const dedup = new PubkeyDeduper();
  const relays: Relay[] = [];
  let eoseCount = 0;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    for (const relay of relays) {
      try { relay.close(); } catch { /* ignore */ }
    }
  };

  const timer = setTimeout(cleanup, timeoutMs);

  const settleEose = () => {
    eoseCount++;
    if (eoseCount >= NK_RELAYS.length) {
      clearTimeout(timer);
      onEose();
      cleanup();
    }
  };

  for (const url of NK_RELAYS) {
    (async () => {
      let relay: Relay | null = null;
      try {
        relay = new Relay(url);
        relays.push(relay);
        await relay.connect();

        if (cleaned) {
          relay.close();
          return;
        }

        relay.subscribe(twinFilters(), {
          onevent(event) {
            if (cleaned) return;
            if (dedup.add(event as RawEvent)) {
              const twins = dedup.twins();
              onUpdate(twins, dedup.stats(twins));
            }
          },
          oneose() {
            settleEose();
          },
        });
      } catch {
        // This relay failed — count it toward EOSE so we don't block indefinitely
        settleEose();
      }
    })();
  }

  return () => {
    clearTimeout(timer);
    cleanup();
  };
}

/** Fetches one person's current twin record (addressable preferred, legacy fallback). */
export async function fetchTwinByPubkey(
  pubkey: string,
  timeoutMs: number = 8000,
): Promise<TwinProfile | null> {
  const dedup = new PubkeyDeduper();
  try {
    await Promise.all(
      NK_RELAYS.map((url) =>
        collectFromRelay(url, twinFilters({ authors: [pubkey], limit: 5 }), timeoutMs, (ev) =>
          dedup.add(ev),
        ),
      ),
    );
  } catch {
    // fall through
  }
  return dedup.twins()[0] ?? null;
}

export async function checkRelayStatus(
  timeoutMs: number = 5000,
): Promise<Record<string, 'online' | 'offline'>> {
  function checkOne(url: string): Promise<readonly [string, 'online' | 'offline']> {
    return new Promise((resolve) => {
      let relay: Relay | null = null;
      let settled = false;

      const finish = (status: 'online' | 'offline') => {
        if (settled) return;
        settled = true;
        try { relay?.close(); } catch { /* ignore */ }
        resolve([url, status] as const);
      };

      const timer = setTimeout(() => finish('offline'), timeoutMs);

      (async () => {
        try {
          relay = new Relay(url);
          await relay.connect();
          clearTimeout(timer);
          finish('online');
        } catch {
          clearTimeout(timer);
          finish('offline');
        }
      })();
    });
  }

  const results = await Promise.all(NK_RELAYS.map(checkOne));
  return Object.fromEntries(results);
}

/** Country counts over deduplicated persons — one pubkey, one vote per country. */
export async function fetchCountryStats(
  timeoutMs: number = 5000,
): Promise<Record<string, number>> {
  const dedup = new PubkeyDeduper();
  try {
    await Promise.all(
      NK_RELAYS.map((url) =>
        collectFromRelay(url, twinFilters(), timeoutMs, (ev) => dedup.add(ev)),
      ),
    );
  } catch {
    return {};
  }

  const counts: Record<string, number> = {};
  for (const ev of dedup.rawEvents()) {
    for (const tag of ev.tags) {
      if (tag[0] === 'g' && tag[1]) {
        const code = tag[1].toUpperCase();
        counts[code] = (counts[code] ?? 0) + 1;
        break; // one country per person
      }
    }
  }
  return counts;
}
