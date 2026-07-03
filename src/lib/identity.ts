import { schnorr } from '@noble/curves/secp256k1.js';
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
