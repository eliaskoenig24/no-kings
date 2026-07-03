# no kings

**A permanent, visible expression of collective political will — with no one in
the middle.**

You train a **digital twin**: a private model of how you weigh climate against
economy, liberty against welfare, present against future — across 8 dimensions.
The network aggregates millions of twins into a continuous, auditable map of
what people actually want. No accounts, no tracking, no editors.

## How it works

```
Your device                     Public Nostr relays              Every visitor's browser
┌─────────────────────┐         ┌──────────────────┐            ┌──────────────────────┐
│ answers + twin +    │ publish │ one addressable  │  subscribe │ fetches all twins,   │
│ keypair live in     │────────▶│ twin event per   │───────────▶│ dedupes by person,   │
│ IndexedDB (local)   │  + PoW  │ keypair (30078)  │            │ computes aggregates  │
└─────────────────────┘         └──────────────────┘            │ CLIENT-SIDE          │
                                                                └──────────────────────┘
```

There is no server that computes "the result". Every browser recomputes it from
the raw events — that is what makes the result impossible to edit.

## Integrity model (read this before quoting our numbers)

We only claim what we verify. The honesty ladder:

| Guarantee | Status |
|---|---|
| One twin per keypair | ✅ enforced by the Nostr protocol (addressable events: an update *replaces* the record) |
| Every keypair counted once | ✅ enforced by pubkey-deduplication in every reader |
| Twins cost something to create | ✅ NIP-13 proof-of-work (18 bits) per twin event |
| Aggregates only above n = 25 persons | ✅ k-anonymity threshold (`src/lib/network-policy.ts`) |
| Same human on two devices = one person | ⚠️ only if they transfer their key (Identity → Transfer) |
| One keypair per human | ❌ **not guaranteed** — requires proof of personhood (planned: web of trust, later eIDAS/EUDI as optional tiers) |

Demo data exists for showcasing the UI and is **always labeled as simulation** —
it never feeds into real aggregates.

## Decentralization status — honest version

- ✅ Data: public Nostr relays + your local device. No database of ours.
- ✅ Identity: your keys, generated and stored locally.
- ✅ Aggregation: computed in every visitor's browser.
- ⚠️ Frontend hosting: currently centralized (IPFS mirror planned).
- ⚠️ Relay list: hardcoded default set (user-configurable list planned).
- ⚠️ The questionnaire: governed by rules, not yet by the network — see
  [docs/QUESTION-CONSTITUTION.md](docs/QUESTION-CONSTITUTION.md).

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest — twin engine, dedup, policy, identity
npm run lint
npm run build
```

Key modules:

| Path | What it does |
|---|---|
| `src/lib/twin-engine.ts` | answers → twin profile; network aggregates; archetypes |
| `src/lib/nostr.ts` | publish twin (kind 30078 + PoW); optional share note |
| `src/lib/nostr-reader.ts` | fetch/subscribe with per-person dedup (`PubkeyDeduper`) |
| `src/lib/network-policy.ts` | founding phase / k-anonymity threshold |
| `src/lib/identity.ts` | keypair create, export (nsec), import |
| `src/data/questions.ts` | training questions — changes governed by the Question Constitution |

## License

Not yet licensed (all rights reserved until a license is chosen). The intent is
an open-source license — the platform's "auditable by anyone" claim depends on it.
