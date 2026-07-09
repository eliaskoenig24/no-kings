'use client';

/**
 * ONE page for the whole personal side of the platform:
 * tell it what moves you (voice-first) → the twin forms live → publish.
 * Every stance auto-saves — the twin IS the state, there is no save button.
 */

import { ARCHETYPE_NAMES } from '@/data/archetypes';
import { TX as TWIN_TX } from './page.tx';
import { TX as TRAIN_TX } from './training.tx';
import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { makeTx } from '@/lib/tx';
import { useLang } from '@/context/LangContext';
import { SPECTRUM, getTopicLabel } from '@/lib/i18n';
import { TOPICS, TopicKey } from '@/types';
import type { AgendaItem } from '@/types';
import { createTwinFromValues, classifyTwin } from '@/lib/twin-engine';
import { summarizeTwin, poleText } from '@/lib/twin-summary';
import { getMyTwin, saveMyTwin, getDemographics, saveDemographics, type TwinDemographics } from '@/lib/db';
import { getOrCreateIdentity } from '@/lib/identity';
import { publishTwin } from '@/lib/nostr';
import { generateShareCard, shareOrDownloadCard } from '@/lib/share-card';
import { regionsForCountry } from '@/data/regions';
import { AGENDA } from '@/data/agenda';
import { speak, stopSpeaking, ttsAvailable } from '@/lib/voice';
import { speechSupported, loadRecognizer, recognizerReady, recordUtterance, transcribe, type Recording } from '@/lib/speech';
import { loadEmbedder, embedderReady, matchAgenda, understandSupported, type AgendaMatch } from '@/lib/understand';

const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });

const tx = makeTx({ ...TWIN_TX, ...TRAIN_TX });

// 10 concrete statements covering all 8 dimensions — the no-download fallback.
const TRAINING_ITEMS: AgendaItem[] = (() => {
  const covered = new Set<string>();
  const picked: AgendaItem[] = [];
  const sorted = [...AGENDA].sort(
    (a, b) => Object.keys(b.topicWeights).length - Object.keys(a.topicWeights).length,
  );
  for (const item of sorted) {
    if (picked.length >= 10) break;
    if (Object.keys(item.topicWeights).some((t) => !covered.has(t))) {
      picked.push(item);
      Object.keys(item.topicWeights).forEach((t) => covered.add(t));
    }
  }
  for (const item of sorted) {
    if (picked.length >= 10) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked;
})();

const AGE_OPTIONS = ['18-24', '25-34', '35-49', '50-64', '65+'] as const;

function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

export default function TwinPage() {
  const { lang, country: autoCountry } = useLang();
  const topics = SPECTRUM[lang as keyof typeof SPECTRUM] ?? SPECTRUM.en;

  // ---- The twin as live state — loaded once, auto-saved on every change ----
  const [values, setValues] = useState<Record<TopicKey, number>>(() =>
    Object.fromEntries(TOPICS.map(k => [k, 50])) as Record<TopicKey, number>
  );
  const [loaded, setLoaded] = useState(false);
  const [everTrained, setEverTrained] = useState(false);
  const dirtyRef = useRef(false);

  // Talk mode (the hero): free speech/text → matching questions → your stance
  const [talkState, setTalkState] = useState<'setup' | 'loading' | 'ready' | 'matching'>('setup');
  const [talkFrac, setTalkFrac] = useState(0);
  const [talkText, setTalkText] = useState('');
  const [talkMatches, setTalkMatches] = useState<AgendaMatch[] | null>(null);
  const [talkAnswered, setTalkAnswered] = useState<Record<string, number>>({});
  const [talkMic, setTalkMic] = useState<'idle' | 'loading' | 'recording' | 'thinking'>('idle');
  const [talkErr, setTalkErr] = useState(false);
  const recRef = useRef<Recording | null>(null);

  // 10-question fallback (collapsible)
  const [qOpen, setQOpen] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [qDone, setQDone] = useState(false);

  // Fine-tune sliders (collapsible)
  const [editMode, setEditMode] = useState(false);

  // Demographics — optional, auto-saved
  const [age, setAge] = useState<string>('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [countryTouched, setCountryTouched] = useState(false);

  // Publish
  const [sharing, setSharing] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [confirming, setConfirming] = useState(false);
  const [mining, setMining] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);

  const [barVisible, setBarVisible] = useState(false);

  useEffect(() => {
    Promise.all([getMyTwin(), getDemographics()]).then(([t, d]) => {
      if (t) {
        setValues(Object.fromEntries(TOPICS.map(k => [k, Math.round(t[k] * 100)])) as Record<TopicKey, number>);
        setEverTrained(true);
      }
      if (d) {
        setAge(d.ageGroup ?? '');
        if (d.country) { setCountry(d.country); setCountryTouched(true); }
        setRegion(d.region ?? '');
      }
      setLoaded(true);
      if (embedderReady()) setTalkState('ready');
    });
  }, []);

  const liveValues = useMemo(() =>
    Object.fromEntries(TOPICS.map(k => [k, values[k] / 100])) as Record<TopicKey, number>,
    [values]
  );
  const twin = useMemo(() => createTwinFromValues(liveValues), [liveValues]);
  const archetype = useMemo(() => classifyTwin(twin), [twin]);
  const archetypeLabel = (ARCHETYPE_NAMES[archetype]?.[lang] ?? ARCHETYPE_NAMES[archetype]?.en ?? '').toUpperCase();

  // Auto-save: the twin persists on every change; a published record goes stale.
  useEffect(() => {
    if (!loaded || !dirtyRef.current) return;
    const t = setTimeout(() => {
      void saveMyTwin(twin);
      setEverTrained(true);
      setSharing(s => (s === 'done' ? 'idle' : s));
    }, 400);
    return () => clearTimeout(t);
  }, [twin, loaded]);

  // Geo-detected country is only the default; typing takes over permanently.
  const effCountry = countryTouched ? country : (autoCountry?.toUpperCase() ?? '');
  const regionOptions = regionsForCountry(effCountry);
  const effRegion = region.startsWith(effCountry + '-') ? region : '';

  useEffect(() => {
    if (!loaded || !effCountry) return;
    void saveDemographics({
      country: effCountry,
      region: effRegion || undefined,
      ageGroup: (age as TwinDemographics['ageGroup']) || undefined,
    });
  }, [age, effCountry, effRegion, loaded]);

  // Live twin bar while the header radar is scrolled away
  useEffect(() => {
    function onScroll() {
      const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 280;
      setBarVisible(window.scrollY > 320 && !nearBottom);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  // Every stance nudges the involved dimensions — talk, questions and sliders
  // all shape the twin the same way.
  function applyStance(item: AgendaItem, a: number) {
    dirtyRef.current = true;
    setValues(v => {
      const next = { ...v };
      for (const [t, w] of Object.entries(item.topicWeights) as [TopicKey, number][]) {
        const delta = (a - 0.5) * Math.sign(w) * Math.min(1, Math.abs(w)) * 55;
        next[t] = Math.round(Math.max(0, Math.min(100, next[t] + delta)));
      }
      return next;
    });
  }

  // ---- Talk handlers ----
  async function enableTalk() {
    setTalkErr(false);
    setTalkState('loading');
    try {
      await loadEmbedder((f) => setTalkFrac(f));
      setTalkState('ready');
    } catch {
      setTalkErr(true);
      setTalkState('setup');
    }
  }

  async function runTalk(text?: string) {
    const utterance = (text ?? talkText).trim();
    if (!utterance) return;
    setTalkState('matching');
    setTalkErr(false);
    try {
      setTalkMatches(await matchAgenda(utterance, lang));
    } catch {
      setTalkErr(true);
      setTalkMatches(null);
    } finally {
      setTalkState('ready');
    }
  }

  async function talkRecord() {
    if (talkMic === 'recording') { recRef.current?.stop(); return; }
    if (talkMic !== 'idle') return;
    stopSpeaking();
    try {
      if (!recognizerReady()) {
        setTalkMic('loading');
        await loadRecognizer();
      }
      const rec = await recordUtterance(10000);
      recRef.current = rec;
      setTalkMic('recording');
      const audio = await rec.audio;
      setTalkMic('thinking');
      const text = (await transcribe(audio, lang)).trim();
      setTalkMic('idle');
      if (text) {
        const combined = (talkText ? talkText + ' ' : '') + text;
        setTalkText(combined);
        void runTalk(combined);
      }
    } catch {
      setTalkErr(true);
      setTalkMic('idle');
    }
  }

  // ---- Questions handlers ----
  function answerStatement(a: number) {
    applyStance(TRAINING_ITEMS[qIdx], a);
    if (qIdx + 1 >= TRAINING_ITEMS.length) { setQDone(true); setQOpen(false); }
    else setQIdx(qIdx + 1);
  }

  // ---- Publish handlers ----
  async function handleShare() {
    if (!confirming) { setConfirming(true); return; }
    setConfirming(false);
    setSharing('loading');
    setMining(true);
    try {
      const identity = await getOrCreateIdentity();
      const demo = await getDemographics();
      const pubCountry = demo?.country ?? effCountry;
      const result = await publishTwin(twin, identity.privkey, pubCountry, () => {}, demo?.region ?? null);
      setMining(false);
      setSharing(result.success ? 'done' : 'error');
    } catch {
      setMining(false);
      setSharing('error');
    }
  }

  async function handleShareCard() {
    if (cardBusy) return;
    setCardBusy(true);
    try {
      const blob = await generateShareCard({
        values: twin,
        archetypeLabel,
        topicLabels: Object.fromEntries(TOPICS.map((k) => [k, getTopicLabel(k, lang)])),
        headline: tx(lang, 'card_headline'),
      });
      await shareOrDownloadCard(blob);
    } finally {
      setCardBusy(false);
    }
  }

  const stmtText = TRAINING_ITEMS[qIdx].text[lang] ?? TRAINING_ITEMS[qIdx].text['en'];

  if (!loaded) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>…</span>
    </div>
  );

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* Header: title + live twin */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '48px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '14px' }}>
              {tx(lang, 'label')}
            </p>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: '12px' }}>
              {tx(lang, 'title')}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
              {tx(lang, 'sub')}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <RadarChart values={liveValues} animated={false} size={96} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--accent)' }}>
              {archetypeLabel}
            </span>
          </div>
        </div>

        {/* THE hero: tell me what moves you */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '26px 24px', marginBottom: '16px' }}>
          <p style={{ fontSize: '19px', lineHeight: 1.35, color: 'var(--text-1)', marginBottom: '10px' }}>
            {tx(lang, 'talk_btn')}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.7, marginBottom: '20px', maxWidth: '480px' }}>
            {tx(lang, 'talk_intro')}
          </p>

          {(!understandSupported() || talkState === 'setup') && (
            <div>
              {talkErr && (
                <p style={{ fontSize: '11px', color: 'var(--accent)', marginBottom: '10px' }}>{tx(lang, 'voice_error')}</p>
              )}
              <button
                onClick={() => void enableTalk()}
                disabled={!understandSupported()}
                style={{
                  background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                  padding: '12px 26px', fontSize: '12px', fontWeight: 700,
                  letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  opacity: understandSupported() ? 1 : 0.4,
                }}
              >
                <MicIcon size={14} /> {tx(lang, 'talk_load')}
              </button>
            </div>
          )}

          {talkState === 'loading' && (
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px' }}>
                {tx(lang, 'voice_loading')} — {Math.round(talkFrac * 100)}%
              </p>
              <div style={{ height: '3px', background: 'var(--border)', maxWidth: '280px' }}>
                <div style={{ height: '100%', width: `${Math.round(talkFrac * 100)}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {(talkState === 'ready' || talkState === 'matching') && (
            <div>
              <textarea
                value={talkText}
                onChange={(e) => setTalkText(e.target.value)}
                placeholder={tx(lang, 'talk_placeholder')}
                rows={3}
                style={{
                  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                  color: 'var(--text-1)', padding: '12px 14px', fontSize: '14px', lineHeight: 1.6,
                  fontFamily: 'var(--font-sans)', outline: 'none', resize: 'vertical', borderRadius: 0,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                {speechSupported() && (
                  <button
                    onClick={() => void talkRecord()}
                    disabled={talkMic === 'thinking' || talkMic === 'loading'}
                    aria-label={tx(lang, talkMic === 'recording' ? 'voice_recording' : 'voice_tap')}
                    className={talkMic === 'recording' ? 'mic-pulse' : undefined}
                    style={{
                      width: '52px', height: '52px', borderRadius: '50%',
                      border: '1px solid var(--border)',
                      background: talkMic === 'recording' ? 'var(--accent)' : 'var(--text-1)',
                      color: 'var(--bg)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: talkMic === 'thinking' || talkMic === 'loading' ? 0.5 : 1, flexShrink: 0,
                    }}
                  >
                    <MicIcon size={20} />
                  </button>
                )}
                <button
                  onClick={() => void runTalk()}
                  disabled={talkState === 'matching' || !talkText.trim()}
                  style={{
                    background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                    padding: '14px 28px', fontSize: '12px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    cursor: talkState === 'matching' || !talkText.trim() ? 'default' : 'pointer',
                    opacity: talkState === 'matching' || !talkText.trim() ? 0.5 : 1,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {talkState === 'matching' ? '…' : tx(lang, 'talk_go')}
                </button>
                {(talkMic === 'recording' || talkMic === 'thinking' || talkMic === 'loading') && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: talkMic === 'recording' ? 'var(--accent)' : 'var(--text-3)' }}>
                    {talkMic === 'recording' ? tx(lang, 'voice_recording')
                      : talkMic === 'loading' ? tx(lang, 'voice_loading') + ' …'
                      : tx(lang, 'voice_thinking')}
                  </span>
                )}
              </div>
              {talkErr && (
                <p style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '10px' }}>{tx(lang, 'voice_error')}</p>
              )}

              {talkMatches !== null && talkMatches.length === 0 && (
                <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '20px', lineHeight: 1.6 }}>
                  {tx(lang, 'talk_none')}
                </p>
              )}

              {talkMatches !== null && talkMatches.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: '14px' }}>
                    {tx(lang, 'talk_matches')}
                  </p>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {talkMatches.map(({ item }) => {
                      const answered = talkAnswered[item.id];
                      return (
                        <div key={item.id} style={{ border: '1px solid var(--border)', background: 'var(--bg)', padding: '16px 16px' }}>
                          <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-1)', marginBottom: '12px' }}>
                            {item.text[lang] ?? item.text['en']}
                          </p>
                          {answered !== undefined ? (
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--positive, #22c55e)', letterSpacing: '0.04em' }}>
                              ✓ {tx(lang, (['l1', 'l2', 'l3', 'l4', 'l5'] as const)[answered * 4])}
                            </p>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {([['l1', 0], ['l2', 0.25], ['l3', 0.5], ['l4', 0.75], ['l5', 1]] as const).map(([key, val]) => (
                                <button
                                  key={key}
                                  onClick={() => { applyStance(item, val); setTalkAnswered((a) => ({ ...a, [item.id]: val })); }}
                                  style={{
                                    padding: '8px 12px', fontSize: '12px',
                                    background: 'var(--surface)', color: 'var(--text-1)',
                                    border: '1px solid var(--border)', cursor: 'pointer',
                                  }}
                                >
                                  {tx(lang, key)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => { setTalkText(''); setTalkMatches(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', marginTop: '16px', padding: 0 }}
                  >
                    {tx(lang, 'talk_more')} →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fallback: 10 questions, no download needed */}
        <div style={{ marginBottom: '56px' }}>
          {!qOpen && !qDone && (
            <button
              onClick={() => setQOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0 }}
            >
              {tx(lang, 'alt_q')} →
            </button>
          )}
          {qDone && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--positive, #22c55e)', letterSpacing: '0.04em' }}>
              ✓ {tx(lang, 'tq_done')}
            </p>
          )}
          {qOpen && (
            <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '26px 24px', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)' }}>
                  {qIdx + 1} / {TRAINING_ITEMS.length}
                </p>
                {ttsAvailable() && (
                  <button
                    onClick={() => void speak(stmtText, lang)}
                    aria-label={tx(lang, 'voice_read')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
                      fontSize: '10px', letterSpacing: '0.1em', padding: '4px 0',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <SpeakerIcon /> {tx(lang, 'voice_read')}
                  </button>
                )}
              </div>
              <p style={{ fontSize: '17px', lineHeight: 1.5, color: 'var(--text-1)', marginBottom: '24px', minHeight: '76px' }}>
                {stmtText}
              </p>
              <div style={{ display: 'grid', gap: '8px' }}>
                {([['l1', 0], ['l2', 0.25], ['l3', 0.5], ['l4', 0.75], ['l5', 1]] as const).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => answerStatement(val)}
                    style={{
                      textAlign: 'left', padding: '13px 16px', fontSize: '14px',
                      background: 'var(--bg)', color: 'var(--text-1)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    {tx(lang, key)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setQOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, marginTop: '16px' }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* The twin in plain language — what it stands for, no percentages.
            The numbers stay reachable behind "edit": presentation, not hiding. */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {tx(lang, editMode ? 'dims' : 'sum_title')}
            </p>
            <button
              onClick={() => setEditMode(e => !e)}
              style={{
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-3)', fontSize: '11px', padding: '4px 12px',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              }}
            >
              {editMode ? tx(lang, 'save') : tx(lang, 'edit')}
            </button>
          </div>

          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {topics.map(topic => {
                const val = values[topic.key];
                return (
                  <div key={topic.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>
                        {topic.title}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>
                        {val}%
                      </span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={val}
                      onChange={e => { dirtyRef.current = true; setValues(v => ({ ...v, [topic.key]: Number(e.target.value) })); }}
                      className="spectrum-slider"
                      aria-label={topic.title}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', maxWidth: '44%', whiteSpace: 'pre-line' }}>{topic.left}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', textAlign: 'right', maxWidth: '44%', whiteSpace: 'pre-line' }}>{topic.right}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (() => {
            // Plain language instead of percentages: the localized pole labels
            // become "clearly …" / "leaning …" statements, most decisive first.
            const { leans, balanced } = summarizeTwin(values);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {leans.map(({ key, pole, strength }) => {
                  const topic = topics.find(t => t.key === key);
                  if (!topic) return null;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', minWidth: '82px', flexShrink: 0 }}>
                        {topic.title}
                      </span>
                      <p style={{ fontSize: '15px', lineHeight: 1.55, color: strength === 'strong' ? 'var(--text-1)' : 'var(--text-2)', margin: 0 }}>
                        <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
                          {tx(lang, strength === 'strong' ? 'sum_strong' : 'sum_lean')}
                        </span>{' '}
                        {poleText(pole === 'left' ? topic.left : topic.right)}
                      </p>
                    </div>
                  );
                })}
                {balanced.length > 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.7, marginTop: leans.length > 0 ? '10px' : 0 }}>
                    {tx(lang, 'sum_balanced')}: {balanced.map(k => topics.find(t => t.key === k)?.title ?? k).join(' · ')}
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Demographics — optional, coarse, auto-saved */}
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '40px', marginBottom: '48px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>
            {tx(lang, 'demo_sec')}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '28px', lineHeight: 1.6 }}>
            {tx(lang, 'demo_sub')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '10px' }}>
                {tx(lang, 'age_lbl')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AGE_OPTIONS.map(a => (
                  <button key={a} onClick={() => setAge(age === a ? '' : a)} style={{
                    padding: '8px 18px', fontSize: '13px',
                    background: age === a ? 'var(--text-1)' : 'var(--raised)',
                    color: age === a ? 'var(--bg)' : 'var(--text-2)',
                    border: `1px solid ${age === a ? 'var(--text-1)' : 'var(--border)'}`,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'all 0.12s',
                  }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {tx(lang, 'country_lbl')}
                </label>
                <input
                  type="text" value={effCountry}
                  onChange={e => { setCountryTouched(true); setCountry(e.target.value.toUpperCase().slice(0, 2)); }}
                  placeholder="DE"
                  maxLength={2}
                  style={{
                    width: '100%', background: 'var(--raised)', border: '1px solid var(--border)',
                    color: 'var(--text-1)', padding: '10px 14px', fontSize: '14px',
                    fontFamily: 'var(--font-mono)', outline: 'none', letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                />
              </div>
              {regionOptions.length > 0 && (
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {tx(lang, 'region_lbl')}
                  </label>
                  {/* fixed list only (ISO 3166-2) — free text is not bucketable and a deanonymization risk */}
                  <select
                    value={effRegion}
                    onChange={e => setRegion(e.target.value)}
                    style={{
                      width: '100%', background: 'var(--raised)', border: '1px solid var(--border)',
                      color: effRegion ? 'var(--text-1)' : 'var(--text-3)', padding: '10px 14px', fontSize: '14px',
                      fontFamily: 'var(--font-sans)', outline: 'none', appearance: 'none',
                      borderRadius: 0,
                    }}
                  >
                    <option value="">—</option>
                    {regionOptions.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Publish — the twin becomes a standing voice in the network */}
        <div style={{
          border: sharing === 'done' ? '1px solid rgba(74,222,128,0.3)' : '1px solid var(--border)',
          padding: '28px 26px',
          background: sharing === 'done' ? 'rgba(74,222,128,0.03)' : 'var(--surface)',
          transition: 'all 300ms',
          marginBottom: '32px',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>
            nostr
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '24px', maxWidth: '480px' }}>
            {tx(lang, 'share_hint')}
          </p>
          {confirming && (
            <div style={{
              border: '1px solid rgba(250,180,50,0.45)',
              background: 'rgba(250,180,50,0.05)',
              padding: '20px 24px',
              marginBottom: '24px',
              maxWidth: '520px',
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgb(180,120,20)', marginBottom: '10px' }}>
                {tx(lang, 'consent_title')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
                {tx(lang, 'consent_body')}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.7, margin: '10px 0 0' }}>
                {tx(lang, 'consent_geo')}
              </p>
            </div>
          )}
          {mining && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '16px' }}>
              ⛏ {tx(lang, 'pow_mining')}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleShare}
              disabled={sharing === 'loading' || sharing === 'done' || !everTrained}
              style={{
                background: sharing === 'done' ? 'transparent' : 'var(--text-1)',
                color: sharing === 'done' ? 'var(--positive)' : 'var(--bg)',
                border: sharing === 'done' ? '1px solid var(--positive)' : 'none',
                padding: '14px 32px', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: sharing === 'loading' || sharing === 'done' || !everTrained ? 'default' : 'pointer',
                opacity: sharing === 'loading' || !everTrained ? 0.6 : 1,
                fontFamily: 'var(--font-sans)',
                transition: 'all 300ms',
              }}
            >
              {sharing === 'loading' ? tx(lang, 'sharing') :
               sharing === 'done' ? tx(lang, 'shared') :
               confirming ? tx(lang, 'consent_ok') :
               tx(lang, 'share_btn')}
            </button>
            <button
              onClick={handleShareCard}
              disabled={cardBusy}
              style={{
                background: 'transparent',
                color: 'var(--text-2)',
                border: '1px solid var(--border)',
                padding: '14px 28px', fontSize: '13px',
                letterSpacing: '0.06em',
                cursor: cardBusy ? 'default' : 'pointer',
                opacity: cardBusy ? 0.6 : 1,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {cardBusy ? tx(lang, 'card_making') : tx(lang, 'card_btn')}
            </button>
          </div>

          {/* Key backup nudge — the twin is now public, the key is still mortal */}
          {sharing === 'done' && (
            <div style={{
              marginTop: '28px',
              border: '1px solid rgba(250,180,50,0.45)',
              background: 'rgba(250,180,50,0.05)',
              padding: '20px 24px',
              maxWidth: '520px',
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgb(180,120,20)', marginBottom: '10px' }}>
                {tx(lang, 'backup_title')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '16px' }}>
                {tx(lang, 'backup_body')}
              </p>
              <Link href="/identity" style={{
                display: 'inline-block',
                background: 'var(--text-1)', color: 'var(--bg)',
                padding: '10px 22px', fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                textDecoration: 'none',
              }}>
                {tx(lang, 'backup_btn')}
              </Link>
            </div>
          )}
        </div>

        {/* Footer row: privacy + key management */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {tx(lang, 'privacy')}
          </p>
          <Link href="/identity" style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            {tx(lang, 'backup_btn')} →
          </Link>
        </div>

      </div>

      {/* Live twin bar — the twin visibly morphs while you shape it */}
      <div className="training-livebar" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '10px 20px',
        background: 'rgba(8,8,8,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--border)',
        transform: barVisible ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 0.28s ease',
      }}>
        <RadarChart values={liveValues} animated={false} size={48} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            {tx(lang, 'archetype_lbl')}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em', color: 'var(--accent)' }}>
            {archetypeLabel}
          </span>
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--positive, #22c55e)', letterSpacing: '0.1em' }}>
          ● LIVE
        </span>
      </div>
    </div>
  );
}
