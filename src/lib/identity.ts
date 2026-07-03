import { schnorr } from '@noble/curves/secp256k1.js';
import * as nip19 from 'nostr-tools/nip19';
import { hexToBytes, bytesToHex } from 'nostr-tools/utils';
import { getIdentity, saveIdentity } from '@/lib/db';
import type { Identity } from '@/lib/db';

export type { Identity };

export async function getOrCreateIdentity(): Promise<Identity> {
  const existing = await getIdentity();
  if (existing) return existing;

  const privkeyBytes = schnorr.utils.randomSecretKey();
  const pubkeyBytes = schnorr.getPublicKey(privkeyBytes);

  const privkey = Buffer.from(privkeyBytes).toString('hex');
  const pubkey = Buffer.from(pubkeyBytes).toString('hex');

  const identity: Identity = {
    id: 1,
    privkey,
    pubkey,
    createdAt: new Date().toISOString(),
  };

  await saveIdentity(identity);
  return identity;
}

/**
 * Accepts a secret key as 64-char hex or as standard nsec1… (NIP-19)
 * and returns normalized hex — or null if the input is neither.
 * Pure function, no side effects.
 */
export function normalizeSecretKey(input: string): string | null {
  const s = input.trim();
  if (/^[0-9a-f]{64}$/i.test(s)) return s.toLowerCase();
  if (s.toLowerCase().startsWith('nsec1')) {
    try {
      const decoded = nip19.decode(s);
      if (decoded.type === 'nsec') return bytesToHex(decoded.data as Uint8Array);
    } catch {
      return null;
    }
  }
  return null;
}

/** Encodes the stored hex secret as standard nsec1… for transfer between devices. */
export function encodeSecretKey(privkeyHex: string): string {
  return nip19.nsecEncode(hexToBytes(privkeyHex));
}

/**
 * Replaces this device's identity with an imported secret key.
 * This is how the same human stays ONE person in the network across
 * phone and laptop instead of counting twice.
 * Returns the new identity, or null if the secret is invalid.
 */
export async function importIdentity(secret: string): Promise<Identity | null> {
  const privkey = normalizeSecretKey(secret);
  if (!privkey) return null;

  const pubkey = bytesToHex(schnorr.getPublicKey(hexToBytes(privkey)));
  const identity: Identity = {
    id: 1,
    privkey,
    pubkey,
    createdAt: new Date().toISOString(),
  };
  await saveIdentity(identity);
  return identity;
}
