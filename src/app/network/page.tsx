'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DEMO_TWINS, DEMO_TWINS_TAGGED } from '@/data/demo-twins';
import { calculateNetworkAggregate } from '@/lib/twin-engine';
import { getMyTwin, getDemographics } from '@/lib/db';
import { MIN_AGGREGATE_PERSONS as RG_MIN } from '@/lib/network-policy';
import { groupByRegion } from '@/lib/network-policy';
import { regionName } from '@/data/regions';
import {
  subscribeToUniqueNetworkTwins,
  fetchCountryStats,
  checkRelayStatus,
  type NetworkTwin,
  type NetworkStats,
} from '@/lib/nostr-reader';
import { getRelays, addRelay, removeRelay, DEFAULT_RELAYS } from '@/lib/relays';
import { MIN_AGGREGATE_PERSONS, networkPhase, foundingProgress } from '@/lib/network-policy';
import { TwinProfile, TOPICS } from '@/types';
import dynamic from 'next/dynamic';
const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });
import { useLang } from '@/context/LangContext';
import { t, getTopicLabel, getTopicDesc } from '@/lib/i18n';
import NostrErrorBoundary from '@/components/NostrErrorBoundary';
import { NTX, ntx } from '@/components/NetworkTruth';

const nx = (lang: string, key: keyof typeof NTX) => ntx(lang, key);


// Per-country averages computed once from demo data (simulation view only)
const COUNTRY_AVERAGES: Record<string, { count: number } & Record<string, number>> = (() => {
  const map: Record<string, { count: number; sums: Record<string, number> }> = {};
  for (const { twin, country } of DEMO_TWINS_TAGGED) {
    if (!map[country]) map[country] = { count: 0, sums: Object.fromEntries(TOPICS.map(k => [k, 0])) };
    map[country].count++;
    for (const k of TOPICS) map[country].sums[k] += twin[k];
  }
  return Object.fromEntries(
    Object.entries(map).map(([code, { count, sums }]) => [
      code,
      { count, ...Object.fromEntries(TOPICS.map(k => [k, sums[k] / count])) },
    ])
  );
})();

function MiniHistogram({ buckets, userBucket }: { buckets: number[]; userBucket?: number }) {
  const max = Math.max(...buckets, 1);
  return (
    <div style={{ display: 'flex', gap: '1.5px', height: '28px', alignItems: 'flex-end', marginTop: '8px', marginBottom: '10px' }}>
      {buckets.map((count, i) => {
        const heightPct = (count / max) * 100;
        const isUser = i === userBucket;
        return (
          <div
            key={i}
            title={`${i * 10}–${(i + 1) * 10}%: ${count}`}
            style={{
              flex: 1,
              height: `${Math.max(6, heightPct)}%`,
              background: isUser ? 'var(--accent)' : '#1e1e1e',
              borderTop: isUser ? '2px solid var(--accent)' : '1px solid #2a2a2a',
              transition: 'height 0.8s ease',
            }}
          />
        );
      })}
    </div>
  );
}

function CompareBar({ networkValue, userValue }: { networkValue: number; userValue?: number }) {
  const networkPct = Math.round(networkValue * 100);
  const userPct = userValue !== undefined ? Math.round(userValue * 100) : null;

  return (
    <div style={{ position: 'relative', height: '3px', background: 'var(--divider)', marginTop: '12px', marginBottom: '6px' }}>
      {/* Network bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        width: `${networkPct}%`,
        background: 'var(--text-3)',
        transition: 'width 0.8s ease',
      }} />
      {/* User marker */}
      {userPct !== null && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: `${userPct}%`,
          transform: 'translateX(-50%)',
          width: '3px',
          height: '11px',
          background: 'var(--accent)',
        }} />
      )}
    </div>
  );
}

export default function NetworkPage() {
  const { lang } = useLang();
  const [myTwin, setMyTwin] = useState<TwinProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [networkTwins, setNetworkTwins] = useState<NetworkTwin[]>([]);
  const [stats, setStats] = useState<NetworkStats>({ events: 0, persons: 0, verified: 0 });
  const [eose, setEose] = useState(false);
  const [simView, setSimView] = useState(false);
  const [countryStats, setCountryStats] = useState<Record<string, number>>({});
  const [relayStatus, setRelayStatus] = useState<Record<string, 'online' | 'offline' | 'checking'>>({});
  const [relayList, setRelayList] = useState<string[]>(DEFAULT_RELAYS);
  const [relayInput, setRelayInput] = useState('');
  const [relayInvalid, setRelayInvalid] = useState(false);
  const [myRegion, setMyRegion] = useState<string | null>(null);
  const relayKey = relayList.join('|');

  useEffect(() => {
    // deferred: SSR markup renders the defaults, then the user's list takes over
    queueMicrotask(() => setRelayList(getRelays()));
  }, []);

  useEffect(() => {
    getMyTwin().then((result) => {
      setMyTwin(result ?? null);
      setLoaded(true);
    });
    getDemographics().then((d) => setMyRegion(d?.region ?? null));
  }, []);

  useEffect(() => {
    const cleanup = subscribeToUniqueNetworkTwins(
      (twins, s) => {
        setNetworkTwins(twins);
        setStats(s);
      },
      () => setEose(true),
      30000,
    );
    // After 8s treat the network as settled even if a relay never answers
    const fallback = setTimeout(() => setEose(true), 8000);
    return () => { cleanup(); clearTimeout(fallback); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayKey]);

  useEffect(() => {
    fetchCountryStats(5000).then((s) => {
      if (Object.keys(s).length > 0) setCountryStats(s);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayKey]);

  useEffect(() => {
    checkRelayStatus(4000).then(setRelayStatus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayKey]);

  function handleAddRelay() {
    const next = addRelay(relayInput);
    if (!next) {
      setRelayInvalid(true);
      setTimeout(() => setRelayInvalid(false), 1600);
      return;
    }
    setRelayInput('');
    setRelayList(next);
  }

  const phase = networkPhase(stats.persons);
  const showAggregates = simView || phase === 'live';
  const displayTwins: TwinProfile[] = simView ? DEMO_TWINS : networkTwins;

  const aggregate = useMemo(() => calculateNetworkAggregate(displayTwins), [displayTwins]);

  const histograms = useMemo(() => {
    return Object.fromEntries(
      TOPICS.map(topic => {
        const buckets = Array(10).fill(0) as number[];
        for (const twin of displayTwins) {
          const idx = Math.min(9, Math.floor(twin[topic] * 10));
          buckets[idx]++;
        }
        return [topic, buckets];
      })
    ) as Record<string, number[]>;
  }, [displayTwins]);

  // Animated counter: smoothly count up when new twins arrive
  const headCount = simView ? DEMO_TWINS.length : stats.persons;
  const [displayCount, setDisplayCount] = useState(0);
  const [flashNew, setFlashNew] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  useEffect(() => {
    const target = headCount;
    if (target === displayCount) return;
    const shouldFlash = target > displayCount && !simView;
    const start = displayCount;
    const duration = Math.min(800, Math.abs(target - start) * 40);
    const startTime = performance.now();
    let flashed = false;
    function tick(now: number) {
      if (shouldFlash && !flashed) {
        flashed = true;
        setFlashNew(true);
        setTimeout(() => setFlashNew(false), 600);
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(start + (target - start) * eased));
      if (progress < 1) animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headCount]);

  const topTopics = [...TOPICS]
    .sort((a, b) => aggregate.averages[b] - aggregate.averages[a])
    .slice(0, 3);

  return (
    <NostrErrorBoundary>
    <div style={{ padding: 'clamp(60px, 8vw, 100px) 0' }}>
      <div className="container">

        {/* Simulation banner */}
        {simView && (
          <div style={{
            border: '1px solid rgba(250,180,50,0.45)',
            background: 'rgba(250,180,50,0.06)',
            padding: '14px 20px',
            marginBottom: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', color: 'rgb(250,180,50)' }}>
              {nx(lang, 'sim_badge')}
            </span>
            <button
              onClick={() => setSimView(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {nx(lang, 'sim_off')}
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <p className="label" style={{ margin: 0 }}>{t(lang, 'net_label')}</p>
            {!eose && !simView && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                {t(lang, 'net_loading')}
              </span>
            )}
            {eose && !simView && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--positive)' }}>
                {stats.persons.toLocaleString()} {nx(lang, 'persons')} · {stats.verified.toLocaleString()} {nx(lang, 'verified')}
              </span>
            )}
            {eose && !simView && stats.events > stats.persons && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}>
                {nx(lang, 'dedup_note')} {stats.events.toLocaleString()} {nx(lang, 'events_word')}
              </span>
            )}
          </div>
          {/* Relay status bar — user-configurable: your relays, your network */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.08em' }}>
              {t(lang, 'net_relays')}
            </span>
            {relayList.map((url) => {
              const status = relayStatus[url] ?? 'checking';
              const label = url.replace('wss://', '').replace(/\/$/, '');
              const color =
                status === 'online' ? 'var(--positive)' :
                status === 'offline' ? 'var(--negative)' :
                'var(--text-3)';
              const dot = status === 'offline' ? '○' : '●';
              return (
                <span key={url} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {dot} {label}
                  {relayList.length > 1 && (
                    <button
                      onClick={() => setRelayList(removeRelay(url))}
                      aria-label={`remove ${label}`}
                      style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '10px', padding: '0 2px', lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  )}
                </span>
              );
            })}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <input
                value={relayInput}
                onChange={(e) => setRelayInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && relayInput.trim()) handleAddRelay(); }}
                placeholder="wss://…"
                spellCheck={false}
                style={{
                  width: '140px', background: 'var(--raised, #111)',
                  border: `1px solid ${relayInvalid ? 'var(--negative, #ef4444)' : 'var(--border)'}`,
                  color: 'var(--text-2)', padding: '3px 8px',
                  fontFamily: 'var(--font-mono)', fontSize: '10px', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              <button
                onClick={handleAddRelay}
                disabled={!relayInput.trim()}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '3px 8px' }}
              >
                +
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '24px' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
              {t(lang, 'net_title')}
            </h1>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '32px',
                fontWeight: 400,
                color: flashNew ? 'var(--positive)' : 'var(--text-1)',
                transition: 'color 0.3s',
              }}>
                {displayCount.toLocaleString()}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                {simView ? t(lang, 'net_twins_demo') : t(lang, 'net_twins_real')}
              </div>
            </div>
          </div>
        </div>

        {/* Founding phase — the honest cold start */}
        {!simView && eose && phase === 'founding' && (
          <div style={{
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: '48px 40px',
            marginBottom: '64px',
          }}>
            <p className="label" style={{ marginBottom: '20px' }}>{nx(lang, 'founding_title')}</p>
            <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '620px', marginBottom: '32px', color: 'var(--text-2)' }}>
              {nx(lang, 'founding_body')} <strong style={{ color: 'var(--text-1)' }}>{MIN_AGGREGATE_PERSONS}</strong> {nx(lang, 'founding_body2')}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '40px', color: 'var(--text-1)' }}>
                {stats.persons}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)' }}>
                / {MIN_AGGREGATE_PERSONS} {nx(lang, 'founding_progress')}
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--divider)', marginBottom: '32px', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${Math.round(foundingProgress(stats.persons) * 100)}%`,
                background: 'var(--accent)',
                transition: 'width 0.8s ease',
              }} />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '28px', maxWidth: '520px' }}>
              {nx(lang, 'founding_cta')}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href={myTwin ? '/twin' : '/training'} style={{
                display: 'inline-block',
                background: 'var(--text-1)',
                color: 'var(--bg)',
                padding: '14px 32px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}>
                {myTwin ? t(lang, 'twin_action_network') : t(lang, 'twin_create')}
              </Link>
              <button
                onClick={() => setSimView(true)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', padding: '13px 24px', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}
              >
                {nx(lang, 'sim_on')}
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '20px', maxWidth: '520px' }}>
              {nx(lang, 'sim_why')}
            </p>
          </div>
        )}

        {/* User notice */}
        {showAggregates && loaded && myTwin && (
          <div style={{
            border: '1px solid var(--border)',
            padding: '20px 24px',
            marginBottom: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--surface)',
          }}>
            <div style={{ width: '3px', height: '40px', background: 'var(--accent)', flexShrink: 0 }} />
            <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>
              {t(lang, 'net_hint_user')}
            </p>
          </div>
        )}
        {showAggregates && loaded && !myTwin && (
          <div style={{
            border: '1px solid var(--border)',
            padding: '20px 24px',
            marginBottom: '48px',
            background: 'var(--surface)',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>
              <Link href="/training" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                {t(lang, 'net_hint_create_link')}
              </Link>{' '}
              {t(lang, 'net_hint_create')}
            </p>
          </div>
        )}

        {/* Aggregates: only live (n >= threshold) or clearly-labeled simulation */}
        {showAggregates && (
          <>
            {/* Radar Chart */}
            <div style={{ marginBottom: '56px' }}>
              <div style={{ maxWidth: '200px', margin: '0 auto' }}>
                <RadarChart
                  values={aggregate.averages}
                  compare={myTwin ?? undefined}
                  size={200}
                  animated
                />
              </div>
              {myTwin && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '24px',
                  marginTop: '16px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: '#4B9EFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#4B9EFF' }} />
                    {t(lang, 'nav_twin')}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '2px', background: 'var(--text-3)', borderBottom: '1px dashed var(--text-3)' }} />
                    {t(lang, 'net_label')}
                  </span>
                </div>
              )}
            </div>

            {/* Topic rows */}
            <div style={{ marginBottom: '80px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '40px', flexWrap: 'wrap', gap: '12px' }}>
                <p className="label" style={{ margin: 0 }}>{t(lang, 'net_dimensions')}</p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                  {({ de: 'Verteilung aller Zwillinge · blau = deine Position', en: 'distribution of all twins · blue = your position', es: 'distribución de todos los gemelos · azul = tu posición', fr: 'répartition de tous les jumeaux · bleu = ta position', pt: 'distribuição de todos os gêmeos · azul = sua posição', ar: 'توزيع كل التوائم · أزرق = موضعك', zh: '所有双胞胎的分布 · 蓝色 = 你的位置', ja: 'すべてのツインの分布 · 青 = あなたの位置', hi: 'सभी जुड़वाँ का वितरण · नीला = आपकी स्थिति', ru: 'распределение всех двойников · синий = ваша позиция', id: 'distribusi semua kembar · biru = posisi Anda', tr: 'tüm ikizlerin dağılımı · mavi = sizin konumunuz', ko: '모든 트윈 분포 · 파란색 = 당신의 위치', it: 'distribuzione di tutti i gemelli · blu = la tua posizione', nl: 'verdeling van alle twins · blauw = jouw positie', pl: 'rozkład wszystkich bliźniąt · niebieski = twoja pozycja', uk: 'розподіл усіх двійників · синій = ваша позиція', vi: 'phân bổ của tất cả các cặp sinh đôi · xanh = vị trí của bạn', bn: 'সকল যমজের বিতরণ · নীল = আপনার অবস্থান', fa: 'توزیع همه دوقلوها · آبی = موقعیت شما' } as Record<string, string>)[lang] ?? 'distribution of all twins · blue = your position'}
                </span>
              </div>
              <div>
                {TOPICS.map((topic) => {
                  const networkVal = aggregate.averages[topic];
                  const userVal = myTwin ? myTwin[topic] : undefined;
                  const networkPct = Math.round(networkVal * 100);
                  const desc = getTopicDesc(topic, lang);

                  return (
                    <div key={topic} style={{
                      padding: '28px 0',
                      borderTop: '1px solid var(--divider)',
                    }}>
                      <div className="network-topic-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-1)', flexShrink: 0 }}>
                          {getTopicLabel(topic, lang)}
                        </span>
                        <div className="network-pct-group" style={{ display: 'flex', gap: '24px', alignItems: 'center', flexShrink: 0 }}>
                          {userVal !== undefined && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                              {({ de: 'Du', en: 'You', es: 'Tú', fr: 'Toi', pt: 'Tu', ar: 'أنت', zh: '你', ja: 'あなた', hi: 'आप', ru: 'Вы', id: 'Anda', tr: 'Sen', ko: '당신', it: 'Tu', nl: 'Jij', pl: 'Ty', uk: 'Ви', vi: 'Bạn', bn: 'আপনি', fa: 'شما' } as Record<string, string>)[lang] ?? 'You'}: {Math.round(userVal * 100)}%
                            </span>
                          )}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                            Ø {networkPct}%
                          </span>
                        </div>
                      </div>
                      <CompareBar networkValue={networkVal} userValue={userVal} />
                      {histograms[topic] && (
                        <MiniHistogram
                          buckets={histograms[topic]}
                          userBucket={userVal !== undefined ? Math.min(9, Math.floor(userVal * 10)) : undefined}
                        />
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', maxWidth: '45%' }}>{desc.low}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', maxWidth: '45%', textAlign: 'right' }}>{desc.high}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interpretation */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '40px',
              marginBottom: '64px',
            }}>
              <p className="label" style={{ marginBottom: '24px' }}>{t(lang, 'net_interpretation')}</p>
              <p style={{ fontSize: '15px', lineHeight: 1.9, marginBottom: '16px', maxWidth: '620px' }}>
                {t(lang, 'net_top_topics')}{' '}
                <span style={{ color: 'var(--text-1)' }}>
                  {topTopics.map((topic) => getTopicLabel(topic, lang)).join(', ')}.
                </span>
              </p>
              {simView && (
                <p style={{ fontSize: '14px', lineHeight: 1.9, color: 'var(--text-3)', maxWidth: '620px' }}>
                  {t(lang, 'net_demo_note')}
                </p>
              )}
            </div>
          </>
        )}

        {/* Country Stats — real network only */}
        {!simView && Object.keys(countryStats).length > 0 && (() => {
          const sorted = Object.entries(countryStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
          const max = sorted[0]?.[1] ?? 1;
          const totalCountries = Object.keys(countryStats).length;
          const flagOf = (code: string) =>
            code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
          return (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '40px',
              marginBottom: '64px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '32px', flexWrap: 'wrap', gap: '8px' }}>
                <p className="label" style={{ margin: 0 }}>{t(lang, 'net_by_country')}</p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                  {totalCountries} {totalCountries === 1
                    ? (({ de: 'Land', en: 'country', es: 'país', fr: 'pays', pt: 'país', ar: 'دولة', zh: '个国家', ja: 'か国', hi: 'देश', ru: 'страна', id: 'negara', tr: 'ülke', ko: '개국', it: 'paese', nl: 'land', pl: 'kraj', uk: 'країна', vi: 'quốc gia', bn: 'দেশ', fa: 'کشور' } as Record<string, string>)[lang] ?? 'country')
                    : (({ de: 'Länder', en: 'countries', es: 'países', fr: 'pays', pt: 'países', ar: 'دول', zh: '个国家', ja: 'か国', hi: 'देश', ru: 'страны', id: 'negara', tr: 'ülke', ko: '개국', it: 'paesi', nl: 'landen', pl: 'kraje', uk: 'країни', vi: 'quốc gia', bn: 'দেশ', fa: 'کشور' } as Record<string, string>)[lang] ?? 'countries')
                  }
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sorted.map(([code, count]) => (
                  <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '18px', minWidth: '28px', flexShrink: 0 }} aria-hidden="true">
                      {flagOf(code)}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-3)',
                      minWidth: '28px',
                      flexShrink: 0,
                    }}>
                      {code}
                    </span>
                    <div style={{ flex: 1, height: '4px', background: 'var(--divider)', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${Math.round((count / max) * 100)}%`,
                        background: 'var(--accent)',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--text-3)',
                      minWidth: '48px',
                      textAlign: 'right',
                      flexShrink: 0,
                    }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Regions — real network only; each region unlocks at its OWN 25-person threshold */}
        {!simView && eose && (() => {
          const buckets = groupByRegion(networkTwins);
          const hasAny = buckets.length > 0 || !!myRegion;
          if (!hasAny) return null;
          const globalAvg = calculateNetworkAggregate(networkTwins).averages;
          const myBucket = myRegion ? buckets.find(b => b.code === myRegion) : undefined;
          const rows = [
            ...(myRegion ? [{ code: myRegion, count: myBucket?.count ?? 0, unlocked: myBucket?.unlocked ?? false, twins: myBucket?.twins ?? [], mine: true }] : []),
            ...buckets.filter(b => b.code !== myRegion).map(b => ({ ...b, mine: false })),
          ];
          return (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '40px',
              marginBottom: '64px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '28px', flexWrap: 'wrap', gap: '8px' }}>
                <p className="label" style={{ margin: 0 }}>{nx(lang, 'rg_title')}</p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                  {nx(lang, 'rg_vs')}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {rows.map((row) => {
                  const deviations = row.unlocked
                    ? TOPICS.map((topicKey) => ({
                        topicKey,
                        diff: Math.round((row.twins.reduce((s, tw) => s + tw[topicKey], 0) / row.count - globalAvg[topicKey]) * 100),
                      }))
                        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
                        .slice(0, 3)
                    : [];
                  return (
                    <div key={row.code} style={{
                      border: row.mine ? '1px solid rgba(96,165,250,0.3)' : '1px solid var(--divider)',
                      background: row.mine ? 'rgba(96,165,250,0.04)' : 'transparent',
                      padding: '16px 18px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-1)', fontWeight: 500 }}>
                          {regionName(row.code)}
                          {row.mine && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#60a5fa', marginLeft: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              {nx(lang, 'rg_yours')}
                            </span>
                          )}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                          {row.count} {nx(lang, 'persons')}
                        </span>
                      </div>
                      <div style={{ height: '3px', background: 'var(--divider)', position: 'relative', marginBottom: row.unlocked ? '12px' : 0 }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, height: '100%',
                          width: `${Math.min(100, Math.round((row.count / RG_MIN) * 100))}%`,
                          background: row.unlocked ? 'var(--positive)' : 'var(--accent)',
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                      {row.unlocked && (
                        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                          {deviations.map(({ topicKey, diff }) => (
                            <span key={topicKey} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-2)' }}>
                              {getTopicLabel(topicKey, lang)} {diff > 0 ? '+' : ''}{diff}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {buckets.length === 0 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '16px' }}>
                  {nx(lang, 'rg_none')}
                </p>
              )}
            </div>
          );
        })()}

        {/* Demo country breakdown — simulation view only */}
        {simView && (() => {
          const flagOf = (code: string) =>
            code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
          const sorted = Object.entries(COUNTRY_AVERAGES)
            .filter(([, d]) => d.count >= 20)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 12);
          const countryLabel = ({ de: 'Länder im Demo-Netzwerk', en: 'Countries in demo network', es: 'Países en la red demo', fr: 'Pays dans le réseau démo', pt: 'Países na rede demo', ar: 'الدول في الشبكة التجريبية', zh: '演示网络中的国家', ja: 'デモネットワークの国', hi: 'डेमो नेटवर्क में देश', ru: 'Страны в демо-сети', id: 'Negara di jaringan demo', tr: 'Demo ağındaki ülkeler', ko: '데모 네트워크의 국가', it: 'Paesi nella rete demo', nl: 'Landen in het demonetwerk', pl: 'Kraje w sieci demo', uk: 'Країни в демо-мережі', vi: 'Quốc gia trong mạng lưới demo', bn: 'ডেমো নেটওয়ার্কে দেশ', fa: 'کشورها در شبکه نمایشی' } as Record<string, string>)[lang] ?? 'Countries in demo network';
          const climateLabel = getTopicLabel('klimaschutz', lang);
          const socialLabel = getTopicLabel('sozialstaat', lang);
          return (
            <div style={{ marginBottom: '64px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
                <p className="label" style={{ margin: 0 }}>{countryLabel}</p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                  {climateLabel} · {socialLabel}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {sorted.map(([code, data]) => {
                  const klimaPct = Math.round((data['klimaschutz'] as number) * 100);
                  const sozialPct = Math.round((data['sozialstaat'] as number) * 100);
                  return (
                    <div key={code} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '16px' }} aria-hidden="true">{flagOf(code)}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-1)', letterSpacing: '0.08em' }}>{code}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', marginLeft: 'auto' }}>{data.count}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', minWidth: '40px' }}>🌍 {klimaPct}%</span>
                          <div style={{ flex: 1, height: '2px', background: 'var(--divider)', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${klimaPct}%`, background: '#22c55e' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', minWidth: '40px' }}>🤝 {sozialPct}%</span>
                          <div style={{ flex: 1, height: '2px', background: 'var(--divider)', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${sozialPct}%`, background: '#ef4444' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* CTA */}
        {!myTwin && loaded && showAggregates && (
          <Link href="/training" style={{
            display: 'inline-block',
            background: 'var(--text-1)',
            color: 'var(--bg)',
            padding: '14px 32px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {t(lang, 'twin_create')}
          </Link>
        )}

      </div>
    </div>
    </NostrErrorBoundary>
  );
}
