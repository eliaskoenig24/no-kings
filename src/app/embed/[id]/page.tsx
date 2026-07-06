'use client';

/**
 * Embeddable live answer — meant for <iframe> in articles and blogs:
 *
 *   <iframe src="https://no-kings.world/embed/<question-id>"
 *           width="100%" height="180" style="border:0"></iframe>
 *
 * Shows the network's live answer to one question, under the same honesty
 * rules as everywhere: real deduped persons, numbers only above the
 * threshold, founding progress below it. Never demo data.
 */

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { AGENDA } from '@/data/agenda';
import { aggregateForItem } from '@/lib/inference';
import { useNetworkTwins, ntx } from '@/components/NetworkTruth';
import { MIN_AGGREGATE_PERSONS } from '@/lib/network-policy';
import { useLang } from '@/context/LangContext';

export default function EmbedPage() {
  const params = useParams<{ id: string }>();
  const { lang } = useLang();
  const { twins, stats, eose, phase } = useNetworkTwins();

  const item = AGENDA.find(a => a.id === params.id);
  const support = useMemo(
    () => (item && phase === 'live' ? aggregateForItem(twins, item).support : null),
    [item, phase, twins],
  );

  if (!item) {
    return <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', padding: '16px' }}>unknown question</p>;
  }

  return (
    <div style={{ padding: '18px 20px', maxWidth: '640px' }}>
      {/* an embed must be chrome-free — hide the app shell */}
      <style>{`header, footer, .bottom-nav, .onboarding-banner { display: none !important; } main { padding-bottom: 0 !important; }`}</style>

      <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-1)', margin: '0 0 14px' }}>
        {item.text[lang] ?? item.text['en']}
      </p>

      {!eose && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>…</p>
      )}

      {eose && support !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
            {Math.round(support * 100)}%
          </span>
          <div style={{ flex: 1, height: '5px', background: 'var(--raised, #1a1a1a)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.round(support * 100)}%`, background: 'var(--text-2, #ccc)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}>
            n={stats.persons}
          </span>
        </div>
      )}

      {eose && support === null && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>
          {stats.persons} / {MIN_AGGREGATE_PERSONS} · {ntx(lang, 'founding_progress')}
        </p>
      )}

      <a
        href={`/question/${item.id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-block', marginTop: '14px', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--accent, #4B9EFF)', textDecoration: 'none' }}
      >
        no-kings.world →
      </a>
    </div>
  );
}
