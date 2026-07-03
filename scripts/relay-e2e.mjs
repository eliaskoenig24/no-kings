// End-to-end check of the twin integrity layer against a real relay.
// Uses a throwaway key and a TEST d-tag, so it never pollutes the real network.
//
//   node scripts/relay-e2e.mjs
//
// Verifies: PoW mining, publish, replaceable semantics (2nd publish replaces
// the 1st), and read-back with PoW validation. Requires Node >= 22 (WebSocket).

import { finalizeEvent, getEventHash, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { getPow } from 'nostr-tools/nip13';
import { Relay } from 'nostr-tools/relay';

const BITS = 18;
const D = 'no-kings-twin-test'; // never the production d-tag
const RELAY = process.argv[2] ?? 'wss://relay.damus.io';

const sk = generateSecretKey();
const pk = getPublicKey(sk);
const values = { klimaschutz: .8, sozialstaat: .7, wirtschaft: .4, bildung: .9, gesundheit: .8, migration: .6, freiheit: .7, europa: .75 };

// same mining loop as src/lib/nostr.ts minePowAsync
async function mine(unsigned, difficulty) {
  let count = 0;
  const nonceTag = ['nonce', '0', String(difficulty)];
  const tags = unsigned.tags.filter(t => t[0] !== 'nonce');
  tags.push(nonceTag);
  const event = { ...unsigned, tags };
  const t0 = Date.now();
  while (true) {
    nonceTag[1] = String(++count);
    event.created_at = Math.floor(Date.now() / 1000);
    const id = getEventHash(event);
    if (getPow(id) >= difficulty) {
      console.log(`mined: ${count} hashes in ${(Date.now() - t0) / 1000}s, pow=${getPow(id)}`);
      return event;
    }
    if (count % 2000 === 0) await new Promise(r => setTimeout(r, 0));
  }
}

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

const base = { kind: 30078, pubkey: pk, tags: [['d', D], ['t', D], ['nk-twin', JSON.stringify(values)]], content: JSON.stringify(values), created_at: 0 };

const relay = new Relay(RELAY);
await relay.connect();
console.log('connected:', RELAY);

const first = finalizeEvent(await mine(base, BITS), sk);
await relay.publish(first);
console.log('published:', first.id.slice(0, 16));

const v2 = { ...values, europa: .9 };
const second = finalizeEvent(await mine({ ...base, content: JSON.stringify(v2), tags: [['d', D], ['t', D], ['nk-twin', JSON.stringify(v2)]] }, BITS), sk);
await relay.publish(second);
console.log('published update:', second.id.slice(0, 16));

await new Promise(r => setTimeout(r, 1500));
const got = [];
await new Promise((resolve) => {
  relay.subscribe([{ kinds: [30078], '#d': [D], authors: [pk] }], {
    onevent(e) { got.push(e); },
    oneose() { resolve(); },
  });
  setTimeout(resolve, 8000);
});
relay.close();

if (got.length !== 1) fail(`expected exactly 1 event after replacement, got ${got.length}`);
if (got[0].id !== second.id) fail('relay kept the OLD event — replaceable semantics broken');
if (getPow(got[0].id) < BITS) fail('read-back event has insufficient PoW');
if (JSON.parse(got[0].content).europa !== 0.9) fail('read-back content is not the updated twin');
console.log('✓ replaceable semantics, PoW, and read-back all verified');
