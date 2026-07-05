import { finalizeEvent, getEventHash, type UnsignedEvent } from 'nostr-tools/pure';
import { getPow } from 'nostr-tools/nip13';
import { Relay } from 'nostr-tools/relay';
import { hexToBytes } from 'nostr-tools/utils';
import type { TwinProfile } from '@/types';

import { getRelays, DEFAULT_RELAYS } from './relays';

/** @deprecated use getRelays() from '@/lib/relays' — respects user config */
export const NK_RELAYS = DEFAULT_RELAYS;

// NIP-78 addressable event: relays keep exactly ONE event per (pubkey, kind, d-tag).
// This is what enforces "one twin per keypair" at the protocol level — an update
// replaces the previous record instead of adding a second voice.
export const TWIN_KIND = 30078;
export const TWIN_D_TAG = 'no-kings-twin';

// NIP-13 proof-of-work: makes mass-producing fake twins cost CPU time.
// 18 leading zero bits ≈ 260k hashes on average — seconds for a human,
// real money at scale for an attacker. Raise gradually as the network grows.
export const TWIN_POW_BITS = 18;

const RELAY_TIMEOUT_MS = 8_000;
const POW_YIELD_EVERY = 2_000; // hashes between yields so the UI stays responsive

/** Wraps a promise with a timeout; rejects with an Error on expiry. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Mines a NIP-13 nonce for the event without freezing the browser
 * (nostr-tools' minePow is synchronous). Mutates and returns the event.
 * onProgress receives the number of attempted hashes so far.
 */
export async function minePowAsync(
  unsigned: UnsignedEvent,
  difficulty: number,
  onProgress?: (hashes: number) => void,
): Promise<UnsignedEvent & { id: string }> {
  let count = 0;
  const nonceTag = ['nonce', '0', String(difficulty)];
  const tags = unsigned.tags.filter((t) => t[0] !== 'nonce');
  tags.push(nonceTag);
  const event = { ...unsigned, tags };

  while (true) {
    nonceTag[1] = String(++count);
    event.created_at = Math.floor(Date.now() / 1000);
    const id = getEventHash(event);
    if (getPow(id) >= difficulty) {
      return { ...event, id };
    }
    if (count % POW_YIELD_EVERY === 0) {
      onProgress?.(count);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

/** Publishes a signed event to all relays in parallel; success if ≥ 1 accepts. */
async function publishToRelays(
  signedEvent: ReturnType<typeof finalizeEvent>,
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const relays = getRelays();
  const results = await Promise.allSettled(
    relays.map(async (url) => {
      let relay: Relay | null = null;
      try {
        relay = new Relay(url);
        await withTimeout(relay.connect(), RELAY_TIMEOUT_MS);
        await withTimeout(relay.publish(signedEvent), RELAY_TIMEOUT_MS);
        return url;
      } finally {
        try { relay?.close(); } catch { /* ignore */ }
      }
    }),
  );

  const accepted = results.filter((r) => r.status === 'fulfilled');
  if (accepted.length > 0) return { success: true, eventId: signedEvent.id };

  const errors = results
    .map((r, i) => `${relays[i]}: ${r.status === 'rejected' ? String(r.reason) : 'ok'}`)
    .join('; ');
  return { success: false, error: errors };
}

/**
 * Publishes the twin as an addressable, proof-of-work-mined data event.
 * One keypair → one twin record on the network; republishing replaces it.
 */
export async function publishTwin(
  twin: TwinProfile,
  privkeyHex: string,
  countryCode?: string | null,
  onPowProgress?: (hashes: number) => void,
  regionCode?: string | null, // coarse ISO 3166-2 (e.g. DE-BY), opt-in, from the curated list only
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const { klimaschutz, sozialstaat, wirtschaft, bildung, gesundheit, migration, freiheit, europa } = twin;
  const values = { klimaschutz, sozialstaat, wirtschaft, bildung, gesundheit, migration, freiheit, europa };

  const privkeyBytes = hexToBytes(privkeyHex);
  const country = countryCode?.toUpperCase() ?? null;
  // region must belong to the stated country — never publish a mismatched pair
  const region =
    regionCode && country && regionCode.toUpperCase().startsWith(country + '-')
      ? regionCode.toUpperCase()
      : null;

  const unsigned: UnsignedEvent = {
    kind: TWIN_KIND,
    pubkey: '', // filled by finalizeEvent
    tags: [
      ['d', TWIN_D_TAG],
      ['t', TWIN_D_TAG],
      ['nk-twin', JSON.stringify(values)],
      ...(country ? [['g', country]] : []),
      ...(region ? [['nk-region', region]] : []),
    ],
    content: JSON.stringify(values),
    created_at: Math.floor(Date.now() / 1000),
  };

  const mined = await minePowAsync(unsigned, TWIN_POW_BITS, onPowProgress);
  const signedEvent = finalizeEvent(mined, privkeyBytes);
  return publishToRelays(signedEvent);
}

function makeBar(value: number): string {
  const filled = Math.round(value * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

/**
 * Optional, separate from the data record: a human-readable kind-1 note
 * for sharing the twin on Nostr social feeds. Never used for aggregation.
 */
export async function publishShareNote(
  twin: TwinProfile,
  privkeyHex: string,
  archetypeLabel?: string | null,
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const privkeyBytes = hexToBytes(privkeyHex);

  const lines = [
    archetypeLabel ? `🧬 My digital twin [${archetypeLabel}] — no kings` : '🧬 My digital twin — no kings',
    '',
    `Climate:    ${makeBar(twin.klimaschutz)} ${Math.round(twin.klimaschutz * 100)}%`,
    `Welfare:    ${makeBar(twin.sozialstaat)} ${Math.round(twin.sozialstaat * 100)}%`,
    `Economy:    ${makeBar(twin.wirtschaft)} ${Math.round(twin.wirtschaft * 100)}%`,
    `Education:  ${makeBar(twin.bildung)} ${Math.round(twin.bildung * 100)}%`,
    `Health:     ${makeBar(twin.gesundheit)} ${Math.round(twin.gesundheit * 100)}%`,
    `Migration:  ${makeBar(twin.migration)} ${Math.round(twin.migration * 100)}%`,
    `Freedom:    ${makeBar(twin.freiheit)} ${Math.round(twin.freiheit * 100)}%`,
    `Europe:     ${makeBar(twin.europa)} ${Math.round(twin.europa * 100)}%`,
    '',
    'no-kings.world/twin',
  ];

  const eventTemplate = {
    kind: 1,
    tags: [['t', 'no-kings']],
    content: lines.join('\n'),
    created_at: Math.floor(Date.now() / 1000),
  };

  const signedEvent = finalizeEvent(eventTemplate, privkeyBytes);
  return publishToRelays(signedEvent);
}
