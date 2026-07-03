import { describe, it, expect, vi } from 'vitest';

// identity.ts pulls in Dexie via @/lib/db — mock it out for node tests
vi.mock('@/lib/db', () => ({
  getIdentity: vi.fn(async () => undefined),
  saveIdentity: vi.fn(async () => undefined),
}));

import { normalizeSecretKey, encodeSecretKey, importIdentity } from '@/lib/identity';
import { schnorr } from '@noble/curves/secp256k1.js';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';

const HEX_KEY = '67dea2ed018072d675f5415ecfaed7d2597555e202d85b3d65ea4e58d2d92ffa';

describe('normalizeSecretKey', () => {
  it('accepts 64-char hex and lowercases it', () => {
    expect(normalizeSecretKey(HEX_KEY.toUpperCase())).toBe(HEX_KEY);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeSecretKey(`  ${HEX_KEY}\n`)).toBe(HEX_KEY);
  });

  it('round-trips through nsec encoding', () => {
    const nsec = encodeSecretKey(HEX_KEY);
    expect(nsec.startsWith('nsec1')).toBe(true);
    expect(normalizeSecretKey(nsec)).toBe(HEX_KEY);
  });

  it('rejects garbage input', () => {
    expect(normalizeSecretKey('')).toBeNull();
    expect(normalizeSecretKey('hello world')).toBeNull();
    expect(normalizeSecretKey(HEX_KEY.slice(0, 32))).toBeNull();
    expect(normalizeSecretKey('nsec1invalidinvalidinvalid')).toBeNull();
  });

  it('rejects an npub (public key) — importing it would be a silent identity loss', () => {
    expect(normalizeSecretKey('npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6')).toBeNull();
  });
});

describe('importIdentity', () => {
  it('derives the correct pubkey from an imported secret', async () => {
    const expectedPubkey = bytesToHex(schnorr.getPublicKey(hexToBytes(HEX_KEY)));
    const identity = await importIdentity(encodeSecretKey(HEX_KEY));
    expect(identity).not.toBeNull();
    expect(identity!.privkey).toBe(HEX_KEY);
    expect(identity!.pubkey).toBe(expectedPubkey);
  });

  it('returns null for invalid input instead of corrupting the identity', async () => {
    expect(await importIdentity('not-a-key')).toBeNull();
  });
});
