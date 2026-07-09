'use client';

import { TX } from './page.tx';
import { useMemo } from 'react';
import Link from 'next/link';
import { makeTx } from '@/lib/tx';
import { notFound } from 'next/navigation';
import { AGENDA } from '@/data/agenda';
import { DEMO_TWINS_TAGGED } from '@/data/demo-twins';
import { aggregateForItem, inferPosition } from '@/lib/inference';
import { useLang } from '@/context/LangContext';
import { useNetworkTwins, SimulationBanner, FoundingNotice } from '@/components/NetworkTruth';
import { getTopicLabel } from '@/lib/i18n';
import type { AgendaItem, TwinValues } from '@/types';

const ARCHETYPE_ORDER = ['progressive', 'socialdem', 'liberal', 'conservative', 'libertarian', 'centrist'] as const;
type ArchetypeKey = typeof ARCHETYPE_ORDER[number];

function classifySimple(twin: TwinValues): ArchetypeKey {
  const { klimaschutz: k, sozialstaat: s, wirtschaft: w, freiheit: f, europa: e } = twin;
  if (k > 0.65 && s > 0.65 && f > 0.55) return 'progressive';
  if (k > 0.55 && s > 0.65 && w < 0.5) return 'socialdem';
  if (f > 0.65 && w > 0.55 && s < 0.5) return 'libertarian';
  if (k < 0.45 && w > 0.55) return 'conservative';
  if (e > 0.6 && k > 0.5 && w > 0.5) return 'liberal';
  return 'centrist';
}

const ARCHETYPE_COLORS: Record<ArchetypeKey, string> = {
  progressive: '#22c55e', socialdem: '#ef4444', liberal: '#f59e0b',
  conservative: '#94a3b8', libertarian: '#fb923c', centrist: 'var(--accent)'
};

const ARCHETYPE_LABELS: Record<ArchetypeKey, string> = {
  progressive: 'Progressive', socialdem: 'Social-Dem', liberal: 'Liberal',
  conservative: 'Conservative', libertarian: 'Libertarian', centrist: 'Centrist'
};

const ARCHETYPE_TWINS: Record<ArchetypeKey, TwinValues[]> = {
  progressive: [], socialdem: [], liberal: [], conservative: [], libertarian: [], centrist: []
};
for (const { twin } of DEMO_TWINS_TAGGED) {
  ARCHETYPE_TWINS[classifySimple(twin)].push(twin);
}

function archetypeSupport(item: AgendaItem): Record<ArchetypeKey, number> {
  const result = {} as Record<ArchetypeKey, number>;
  for (const key of ARCHETYPE_ORDER) {
    const twins = ARCHETYPE_TWINS[key];
    if (twins.length === 0) { result[key] = 0.5; continue; }
    result[key] = twins.reduce((s, t) => s + inferPosition(t, item).score, 0) / twins.length;
  }
  return result;
}

const t = makeTx(TX);

const ALL_TWINS = DEMO_TWINS_TAGGED.map(tt => tt.twin);

export default function QuestionPage({ params }: { params: { id: string } }) {
  const { lang } = useLang();
  const item = AGENDA.find(a => a.id === params.id);
  if (!item) notFound();

  const aggregate = useMemo(() => aggregateForItem(ALL_TWINS, item), [item]);
  const pct = Math.round(aggregate.support * 100);
  const isSupport = aggregate.support >= 0.5;
  const barColor = isSupport ? 'var(--positive)' : 'var(--negative)';

  const archetypeData = useMemo(() => archetypeSupport(item), [item]);
  const { stats, simView, setSimView } = useNetworkTwins();

  const shareText = encodeURIComponent(
    `"${(item.text['en'] ?? '').slice(0, 120)}"\n\nno-kings.world/question/${item.id} #democracy #augmenteddemocracy`
  );

  return (
    <div style={{ padding: 'clamp(60px, 8vw, 100px) 0', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '760px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', textDecoration: 'none', letterSpacing: '0.06em' }}>
            {t(lang, 'back')}
          </Link>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.06em' }}>
            {t(lang, 'category')}: {getTopicLabel(item.category, lang)}
          </span>
        </div>

        {/* Question */}
        <h1 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: 400, lineHeight: 1.35, marginBottom: '40px', color: 'var(--text-1)' }}>
          {item.text[lang] ?? item.text['en']}
        </h1>

        {simView && <SimulationBanner lang={lang} onExit={() => setSimView(false)} />}
        {!simView && (
          <FoundingNotice lang={lang} persons={stats.persons} onSimulate={() => setSimView(true)} />
        )}
        {simView && (<>
        {/* Result */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '32px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '20px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '48px', fontWeight: 700, color: barColor, lineHeight: 1 }}>
              {pct}%
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: barColor, letterSpacing: '0.06em' }}>
              {t(lang, isSupport ? 'support' : 'oppose')}
            </span>
          </div>
          <div style={{ height: '6px', background: 'var(--raised)', marginBottom: '16px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: barColor, transition: 'width 0.8s ease' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
            {aggregate.count.toLocaleString()} {t(lang, 'voices')} · demo data
          </span>
        </div>

        {/* By archetype */}
        <div style={{ marginBottom: '40px' }}>
          <p className="label" style={{ marginBottom: '20px' }}>{t(lang, 'by_archetype')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ARCHETYPE_ORDER.map(key => {
              const s = archetypeData[key];
              const pctA = Math.round(s * 100);
              const color = ARCHETYPE_COLORS[key];
              return (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', width: '88px', flexShrink: 0 }}>
                      {ARCHETYPE_LABELS[key]}
                    </span>
                    <div style={{ flex: 1, height: '4px', background: 'var(--raised)', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pctA}%`, background: color, opacity: 0.85 }} />
                      <div style={{ position: 'absolute', left: '50%', top: '-3px', width: '1px', height: '10px', background: 'var(--border)' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: s >= 0.5 ? color : 'var(--text-3)', width: '36px', textAlign: 'right', flexShrink: 0 }}>
                      {pctA}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        </>)}

        {/* Context */}
        {item.description?.['en'] && (
          <div style={{ marginBottom: '40px' }}>
            <p className="label" style={{ marginBottom: '16px' }}>{t(lang, 'context')}</p>
            <p style={{ fontSize: '14px', lineHeight: 1.85, color: 'var(--text-2)', maxWidth: '660px' }}>
              {item.description[lang] ?? item.description['en']}
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <a
            href={`https://x.com/intent/tweet?text=${shareText}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'var(--text-1)', color: 'var(--bg)',
              padding: '12px 24px', fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            ↗ X
          </a>
          <Link href="/twin" style={{
            display: 'inline-block',
            border: '1px solid var(--border)', color: 'var(--text-2)',
            padding: '12px 24px', fontSize: '12px', letterSpacing: '0.06em',
            textDecoration: 'none',
          }}>
            {t(lang, 'train_cta')}
          </Link>
          <Link href="/" style={{
            display: 'inline-block',
            border: 'none', color: 'var(--text-3)',
            padding: '12px 0', fontSize: '12px', letterSpacing: '0.06em',
            fontFamily: 'var(--font-mono)', textDecoration: 'none',
          }}>
            {t(lang, 'all_q')}
          </Link>
        </div>

        {/* Related questions */}
        {(() => {
          const related = AGENDA.filter(a => a.id !== item.id && a.category === item.category).slice(0, 3);
          if (related.length === 0) return null;
          const relLabel = ({ de: 'Ähnliche Fragen', en: 'Related questions', es: 'Preguntas relacionadas', fr: 'Questions similaires', pt: 'Perguntas relacionadas', ar: 'أسئلة ذات صلة', zh: '相关问题', ja: '関連する質問', hi: 'संबंधित प्रश्न', ru: 'Похожие вопросы', id: 'Pertanyaan terkait', tr: 'İlgili sorular', ko: '관련 질문', it: 'Domande correlate', nl: 'Gerelateerde vragen', pl: 'Powiązane pytania', uk: 'Пов\'язані питання', vi: 'Câu hỏi liên quan', bn: 'সম্পর্কিত প্রশ্ন', fa: 'سؤالات مرتبط' } as Record<string, string>)[lang] ?? 'Related questions';
          return (
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '40px', marginTop: '16px' }}>
              <p className="label" style={{ marginBottom: '24px' }}>{relLabel}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {related.map(rel => (
                  <Link key={rel.id} href={`/question/${rel.id}`} style={{
                    display: 'block',
                    padding: '16px 0',
                    borderTop: '1px solid var(--divider)',
                    color: 'var(--text-2)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    textDecoration: 'none',
                  }}>
                    {rel.text[lang] ?? rel.text['en']}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', marginLeft: '8px' }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
