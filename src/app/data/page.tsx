'use client';

/**
 * Open data for science — the same aggregates the product shows, as a
 * downloadable dataset. Computed client-side from the relays through the
 * ONE honesty pipeline (NetworkTruth): dedup per pubkey, k-anonymity ≥ 25,
 * no server, nothing here the relays don't already say publicly.
 */

import { TX } from './page.tx';
import { makeTx } from '@/lib/tx';
import { useLang } from '@/context/LangContext';
import { TOPICS } from '@/types';
import { AGENDA } from '@/data/agenda';
import { aggregateAll } from '@/lib/inference';
import { useNetworkTwins, FoundingNotice, ntx } from '@/components/NetworkTruth';
import { MIN_AGGREGATE_PERSONS } from '@/lib/network-policy';

const tx = makeTx(TX);

function buildDataset(
  live: boolean,
  twins: ReturnType<typeof useNetworkTwins>['twins'],
  stats: ReturnType<typeof useNetworkTwins>['stats'],
) {
  const dims = live
    ? Object.fromEntries(TOPICS.map((t) => {
        const mean = twins.reduce((s, tw) => s + tw[t], 0) / twins.length;
        return [t, { mean: Number(mean.toFixed(4)) }];
      }))
    : null;

  const questions = live
    ? aggregateAll(twins, AGENDA).map((a) => ({
        id: a.itemId,
        support: Number(a.support.toFixed(4)),
        mean_score: Number(a.meanScore.toFixed(4)),
        n: a.count,
      }))
    : null;

  // countries only above the same k-anonymity bar as everywhere else
  const byCountry = new Map<string, typeof twins>();
  for (const tw of twins) {
    if (!tw.country) continue;
    const list = byCountry.get(tw.country) ?? [];
    list.push(tw);
    byCountry.set(tw.country, list);
  }
  const countries = live
    ? [...byCountry.entries()]
        .filter(([, list]) => list.length >= MIN_AGGREGATE_PERSONS)
        .map(([code, list]) => ({
          country: code,
          n: list.length,
          dimensions: Object.fromEntries(TOPICS.map((t) => [
            t, Number((list.reduce((s, tw) => s + tw[t], 0) / list.length).toFixed(4)),
          ])),
        }))
    : null;

  return {
    dataset: 'no-kings-aggregates',
    version: 1,
    generated_at: new Date().toISOString(),
    source: 'https://no-kings.world/data',
    method: {
      person_definition: 'one Nostr keypair; addressable event kind 30078 (d=no-kings-twin), deduplicated by pubkey',
      k_anonymity_threshold: MIN_AGGREGATE_PERSONS,
      proof_of_work: 'NIP-13, 18 bits target; counted separately as n.with_proof_of_work',
      inference: 'question score = 0.5 + Σ (twin[topic] − 0.5) × weight[topic]; support = share of twins with score ≥ 0.5',
      caveat: 'a keypair is not necessarily one human; proof-of-work raises the cost of mass forgery but cannot rule it out',
    },
    n: { persons: stats.persons, with_proof_of_work: stats.verified, raw_events: stats.events },
    dimensions: dims,
    questions,
    countries,
  };
}

export default function DataPage() {
  const { lang } = useLang();
  const { twins, stats, eose, phase } = useNetworkTwins();
  const live = phase === 'live';

  function download() {
    const data = buildDataset(live, twins, stats);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `no-kings-aggregates-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const today = new Date().toISOString().slice(0, 10);
  const citation = `no kings (${new Date().getFullYear()}). Aggregate dataset of political twin positions. https://no-kings.world/data — n = ${stats.persons} persons (retrieved ${today}).`;

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 96px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '22px' }}>
          {tx(lang, 'd_label')}
        </p>
        <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.6rem)', fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: '20px' }}>
          {tx(lang, 'd_title')}
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--text-2)', maxWidth: '580px', marginBottom: '40px' }}>
          {tx(lang, 'd_intro')}
        </p>

        {/* current state — the same honest counter as everywhere */}
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', marginBottom: '28px' }}>
          {eose ? (
            <>{stats.persons} {ntx(lang, 'persons')} · {stats.verified} {ntx(lang, 'verified')} · {ntx(lang, 'dedup_note')} {stats.events} {ntx(lang, 'events_word')}</>
          ) : '…'}
        </p>

        {!live && eose && (
          <FoundingNotice lang={lang} persons={stats.persons} />
        )}

        <button
          onClick={download}
          disabled={!eose}
          style={{
            background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
            padding: '15px 30px', fontSize: '13px', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: eose ? 'pointer' : 'default', opacity: eose ? 1 : 0.5,
            fontFamily: 'var(--font-sans)', marginBottom: '56px',
          }}
        >
          {tx(lang, 'd_dl')} ↓
        </button>

        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '40px', marginBottom: '48px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '24px' }}>
            {tx(lang, 'd_meth_t')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(['d_m1', 'd_m2', 'd_m3', 'd_m4'] as const).map((k) => (
              <p key={k} style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-2)', paddingLeft: '18px', borderLeft: '2px solid var(--accent)', maxWidth: '560px' }}>
                {tx(lang, k)}
              </p>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '40px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '18px' }}>
            {tx(lang, 'd_cite_t')}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.8, color: 'var(--text-1)', background: 'var(--raised)', border: '1px solid var(--border)', padding: '16px 20px', marginBottom: '14px', overflowWrap: 'anywhere' }}>
            {citation}
          </p>
          <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-3)', maxWidth: '560px' }}>
            {tx(lang, 'd_cite_note')}
          </p>
        </div>

      </div>
    </div>
  );
}
