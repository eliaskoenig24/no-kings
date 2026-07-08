'use client';

import { TX } from './page.tx';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { makeTx } from '@/lib/tx';
import { DEMO_TWINS_TAGGED } from '@/data/demo-twins';

const WorldGlobe = dynamic(() => import('@/components/WorldGlobe'), { ssr: false });
const QuestionSearch = dynamic(() => import('@/components/QuestionSearch'), { ssr: false });
import { useLang } from '@/context/LangContext';
import { AGENDA } from '@/data/agenda';
import { aggregateForItem, inferPosition } from '@/lib/inference';
import { getMyTwin } from '@/lib/db';
import { useNetworkTwins, SimulationBanner, FoundingNotice, ntx } from '@/components/NetworkTruth';
import { dailyIndex, dateKey, readDaily, saveDailyEntry, streak, aggregateDailyEntries, type DailyStore } from '@/lib/daily';
import { getOrCreateIdentity } from '@/lib/identity';
import { publishDailyAnswer } from '@/lib/nostr';
import { fetchDailyEntries } from '@/lib/nostr-reader';
import { MIN_AGGREGATE_PERSONS, DAILY_MIN_PERSONS, groupByRegion } from '@/lib/network-policy';
import { regionName } from '@/data/regions';
import type { TwinProfile } from '@/types';

const tx = makeTx(TX);

export default function HomePage() {
  const { lang } = useLang();
  const [myTwin, setMyTwin] = useState<TwinProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { twins, stats, eose, phase, simView, setSimView, displayTwins } = useNetworkTwins();

  // ---- Question of the day: answer → guess the network → reveal ----
  const dq = AGENDA[dailyIndex(AGENDA.length)];
  const [dailyStore, setDailyStore] = useState<DailyStore>({});
  const [dqStance, setDqStance] = useState<'for' | 'against' | null>(null);
  const [dqGuess, setDqGuess] = useState(50);
  const todayEntry = dailyStore[dateKey()];
  const dqStreak = streak(dailyStore);
  const [dqPublish, setDqPublish] = useState(false);
  const [dailyAgg, setDailyAgg] = useState<{ n: number; support: number; meanGuess: number; gap: number } | null>(null);

  function lockDaily() {
    if (!dqStance) return;
    setDailyStore(saveDailyEntry({ questionId: dq.id, stance: dqStance, guess: dqGuess }));
    if (dqPublish) {
      // fire-and-forget: the local entry is the source of truth for the UI
      getOrCreateIdentity()
        .then(id => publishDailyAnswer({ questionId: dq.id, stance: dqStance!, guess: dqGuess }, id.privkey, dateKey()))
        .catch(() => { /* network unavailable — local entry stands */ });
    }
  }

  // Perception gap: real published answers vs. what people guessed
  useEffect(() => {
    if (!todayEntry || simView) return;
    let cancelled = false;
    const knownPubkeys = new Set(twins.map(t => t.pubkey));
    fetchDailyEntries(dateKey()).then(entries => {
      if (!cancelled) setDailyAgg(aggregateDailyEntries(entries, knownPubkeys));
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!todayEntry, simView, twins.length]);

  useEffect(() => {
    getMyTwin().then(t => { setMyTwin(t ?? null); setLoaded(true); });
    // deferred: keeps SSR markup and first client render identical
    queueMicrotask(() => setDailyStore(readDaily()));
  }, []);

  // Per-country data for the globe: how each country leans on today's question.
  // Real twins by default; the labeled simulation shows the fully lit world.
  const countryData = useMemo(() => {
    const acc: Record<string, { count: number; sum: number }> = {};
    if (simView) {
      for (const { twin, country } of DEMO_TWINS_TAGGED) {
        (acc[country] ??= { count: 0, sum: 0 });
        acc[country].count++;
        acc[country].sum += inferPosition(twin, dq).score;
      }
    } else {
      for (const t of twins) {
        if (!t.country) continue;
        (acc[t.country] ??= { count: 0, sum: 0 });
        acc[t.country].count++;
        acc[t.country].sum += inferPosition(t, dq).score;
      }
    }
    return Object.fromEntries(
      Object.entries(acc).map(([a2, { count, sum }]) => [a2, { count, support: sum / count }]),
    );
  }, [simView, twins, dq]);

  // Zoom level 2 for the globe: regions per country, each with its own gate.
  const regionsByCountry = useMemo(() => {
    if (simView) return {};
    const out: Record<string, { code: string; name: string; count: number; unlocked: boolean }[]> = {};
    for (const b of groupByRegion(twins)) {
      const a2 = b.code.split('-')[0];
      (out[a2] ??= []).push({ code: b.code, name: regionName(b.code), count: b.count, unlocked: b.unlocked });
    }
    return out;
  }, [simView, twins]);

  // Reveal rules ("answer first, see later"):
  //  - simulation: numbers visible, loudly labeled as fake
  //  - live network + own twin: real numbers, own position marked
  //  - live network, no twin yet: questions visible, numbers locked
  //  - founding phase: no numbers at all — the notice explains why
  const reveal = simView || (phase === 'live' && !!myTwin);
  const locked = !simView && phase === 'live' && !myTwin;

  const items = useMemo(() => {
    if (!reveal) return AGENDA.map(item => ({ item, support: null as number | null }));
    return AGENDA
      .map(item => ({ item, support: aggregateForItem(displayTwins, item).support as number | null }))
      .sort((a, b) => Math.abs((a.support ?? 0.5) - 0.5) - Math.abs((b.support ?? 0.5) - 0.5));
  }, [reveal, displayTwins]);

  const headCount = simView ? displayTwins.length : stats.persons;

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0' }}>
      <div className="container" style={{ maxWidth: '780px' }}>

        {simView && <SimulationBanner lang={lang} onExit={() => setSimView(false)} />}

        {/* The vision, first — visitors must know WHY before anything else */}
        {loaded && !myTwin && (
          <div style={{ padding: '24px 0 56px', borderBottom: '1px solid var(--divider)', marginBottom: '56px' }}>
            <h1 style={{ fontSize: 'clamp(1.9rem, 5.5vw, 3.2rem)', fontWeight: 600, lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: '18px', maxWidth: '16ch' }}>
              {tx(lang, 'hero_title')}
            </h1>
            <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'var(--text-2)', maxWidth: '580px', marginBottom: '26px' }}>
              {tx(lang, 'hero_body')}
            </p>
            <Link href="/training" style={{
              display: 'inline-block',
              background: 'var(--text-1)', color: 'var(--bg)',
              padding: '15px 34px', fontSize: '13px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textDecoration: 'none',
            }}>
              {tx(lang, 'cta')}
            </Link>
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '48px',
          paddingBottom: '32px',
          borderBottom: '1px solid var(--divider)',
        }}>
          <div>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              letterSpacing: '0.2em', color: 'var(--text-3)',
              textTransform: 'uppercase', marginBottom: '14px',
            }}>
              {tx(lang, 'label')}
            </p>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', fontWeight: 400, lineHeight: 1.1 }}>
              {tx(lang, 'title')}
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', fontWeight: 300, color: 'var(--text-1)', lineHeight: 1 }}>
              {eose || simView ? headCount.toLocaleString() : '…'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', marginTop: '4px' }}>
              {ntx(lang, 'persons')}
            </div>
          </div>
        </div>

        {/* The world, lit country by country — dark until enough persons per country */}
        <div style={{ marginBottom: '72px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '18px' }}>
            {tx(lang, 'wg_title')}
          </p>
          <WorldGlobe
            data={countryData}
            lang={lang}
            hint={tx(lang, 'wg_hint')}
            lockedLabel={ntx(lang, 'rg_until')}
            supportLabel={`${tx(lang, 'support')} · ${tx(lang, 'dq_label')}`}
            regions={regionsByCountry}
          />
        </div>

        {/* Question of the day — answer first, then guess the network, then the truth */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '28px 26px', marginBottom: '72px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--accent)', textTransform: 'uppercase' }}>
              {tx(lang, 'dq_label')}
            </span>
            {dqStreak > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                {tx(lang, 'dq_streak')}: {dqStreak} {tx(lang, 'dq_days')}
              </span>
            )}
          </div>
          <p style={{ fontSize: '17px', lineHeight: 1.5, color: 'var(--text-1)', marginBottom: '20px', maxWidth: '640px' }}>
            {dq.text[lang] ?? dq.text['en']}
          </p>

          {!todayEntry && dqStance === null && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setDqStance('for')} style={{
                background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                padding: '13px 32px', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                {tx(lang, 'support')}
              </button>
              <button onClick={() => setDqStance('against')} style={{
                background: 'transparent', color: 'var(--text-1)', border: '1px solid var(--text-1)',
                padding: '13px 32px', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                {tx(lang, 'oppose')}
              </button>
            </div>
          )}

          {!todayEntry && dqStance !== null && (
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', marginBottom: '10px' }}>
                {tx(lang, 'dq_guess')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <input
                  type="range" min={0} max={100} value={dqGuess}
                  onChange={e => setDqGuess(Number(e.target.value))}
                  className="spectrum-slider"
                  style={{ flex: 1 }}
                  aria-label={tx(lang, 'dq_guess')}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', minWidth: '52px', textAlign: 'right' }}>
                  {dqGuess}%
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px', cursor: 'pointer', maxWidth: '520px' }}>
                <input
                  type="checkbox"
                  checked={dqPublish}
                  onChange={e => setDqPublish(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: 'var(--accent)' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.6 }}>
                  {tx(lang, 'dq_publish')}
                </span>
              </label>
              <button onClick={lockDaily} style={{
                background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                padding: '12px 28px', fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                {tx(lang, 'dq_lock')}
              </button>
            </div>
          )}

          {todayEntry && (() => {
            const canReveal = simView || (dailyAgg !== null && dailyAgg.n >= DAILY_MIN_PERSONS);
            const item = AGENDA.find(a => a.id === todayEntry.questionId) ?? dq;
            if (!canReveal) {
              return (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.8, margin: 0 }}>
                  {tx(lang, 'dq_wait')}<br />
                  {tx(lang, 'you')}: {todayEntry.stance === 'for' ? tx(lang, 'support') : tx(lang, 'oppose')} · {tx(lang, 'dq_yourguess')}: {todayEntry.guess}%
                </p>
              );
            }
            const net = Math.round(
              (simView ? aggregateForItem(displayTwins, item).support : dailyAgg!.support) * 100,
            );
            const diff = Math.abs(net - todayEntry.guess);
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                    {net}%
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {tx(lang, 'dq_net')} · {tx(lang, 'support')}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', margin: 0 }}>
                  {tx(lang, 'dq_yourguess')}: {todayEntry.guess}% · {diff} {tx(lang, 'dq_off')} · {tx(lang, 'you')}: {todayEntry.stance === 'for' ? tx(lang, 'support') : tx(lang, 'oppose')}
                </p>

                {/* The perception gap — what nobody else can show: reality vs. what
                    people believed the majority thinks. Gated at 25 real answers. */}
                {!simView && dailyAgg && dailyAgg.n >= DAILY_MIN_PERSONS && (() => {
                  const real = Math.round(dailyAgg.support * 100);
                  const guessed = Math.round(dailyAgg.meanGuess);
                  return (
                    <div style={{ marginTop: '24px', borderTop: '1px solid var(--divider)', paddingTop: '18px' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '14px' }}>
                        {tx(lang, 'dq_gap')} · n={dailyAgg.n}
                      </p>
                      {[{ label: tx(lang, 'dq_gap_real'), v: real, strong: true }, { label: tx(lang, 'dq_gap_guessed'), v: guessed, strong: false }].map(({ label, v, strong }) => (
                        <div key={label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 44px', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                          <div style={{ height: strong ? '8px' : '5px', background: 'var(--raised)', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${v}%`, background: strong ? 'var(--text-1)' : 'var(--text-3)' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: strong ? 700 : 400, color: strong ? 'var(--text-1)' : 'var(--text-3)', textAlign: 'right' }}>{v}%</span>
                        </div>
                      ))}
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', margin: '10px 0 0' }}>
                        Δ {dailyAgg.gap > 0 ? '+' : ''}{dailyAgg.gap}
                      </p>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>

        {/* Analysis search — ask the network anything it can answer */}
        <div style={{ marginBottom: '72px' }}>
          <QuestionSearch
            lang={lang}
            myTwin={myTwin}
            revealNumbers={simView || phase === 'live'}
            displayTwins={displayTwins}
          />
        </div>

        {/* Founding phase — the honest cold start, right on the front door */}
        {!simView && eose && phase === 'founding' && (
          <FoundingNotice lang={lang} persons={stats.persons} onSimulate={() => setSimView(true)} />
        )}

        {/* Twin status bar */}
        {loaded && (
          <div style={{
            padding: '14px 20px',
            marginBottom: '40px',
            background: myTwin ? 'rgba(150,98,27,0.06)' : 'var(--surface)',
            border: myTwin ? '1px solid rgba(150,98,27,0.2)' : '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            {myTwin ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%', boxShadow: '0 0 6px var(--accent)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent)', letterSpacing: '0.06em' }}>
                    {tx(lang, 'active')}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                  {tx(lang, 'active_sub')}
                </span>
              </>
            ) : (
              <>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', letterSpacing: '0.04em' }}>
                  {ntx(lang, 'locked_hint')}
                </span>
                <Link href="/training" style={{
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  color: 'var(--text-1)', letterSpacing: '0.06em',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}>
                  {tx(lang, 'cta')}
                </Link>
              </>
            )}
          </div>
        )}

        {/* Question list */}
        <div>
          {items.map(({ item, support }) => {
            const pct = support !== null ? Math.round(support * 100) : null;
            const myScore = reveal && myTwin ? inferPosition(myTwin, item).score : null;
            const myPct = myScore !== null ? Math.round(myScore * 100) : null;
            const isSupport = pct !== null && pct >= 50;

            return (
              <div key={item.id} style={{
                padding: '28px 0',
                borderBottom: '1px solid var(--divider)',
              }}>
                <p style={{
                  fontSize: '15px', lineHeight: 1.55,
                  color: 'var(--text-1)', fontWeight: 400,
                  marginBottom: pct !== null || locked ? '20px' : 0, maxWidth: '680px',
                }}>
                  {item.text[lang] ?? item.text['en']}
                </p>

                {/* Numbers only after the network is live AND you positioned yourself
                    — one neutral color: a majority is a fact, not a victory */}
                {pct !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, height: '5px', background: 'var(--raised)', position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, height: '100%',
                        width: `${pct}%`, background: 'var(--text-2)',
                      }} />
                      <div style={{
                        position: 'absolute', left: '50%', top: '-3px',
                        width: '1px', height: '11px', background: 'var(--border)',
                      }} />
                      {myPct !== null && (
                        <div style={{
                          position: 'absolute', left: `${myPct}%`,
                          top: '-4px', transform: 'translateX(-50%)',
                          width: '3px', height: '13px', background: 'var(--accent)',
                        }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '15px',
                        fontWeight: 700, color: 'var(--text-1)', minWidth: '40px', textAlign: 'right',
                      }}>
                        {pct}%
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                        color: 'var(--text-3)', minWidth: '48px',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {isSupport ? tx(lang, 'support') : tx(lang, 'oppose')}
                      </span>
                      {myPct !== null && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)',
                          whiteSpace: 'nowrap',
                        }}>
                          {tx(lang, 'you')}: {myPct}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {locked && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>
                    {ntx(lang, 'locked_hint')}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        {loaded && !myTwin && (
          <div style={{ marginTop: '64px', paddingTop: '48px', borderTop: '1px solid var(--divider)' }}>
            <Link href="/training" style={{
              display: 'inline-block',
              background: 'var(--text-1)', color: 'var(--bg)',
              padding: '16px 36px', fontSize: '13px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textDecoration: 'none',
            }}>
              {tx(lang, 'cta')}
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
