'use client';

import { ARCHETYPE_NAMES } from '@/data/archetypes';
import { TX } from './page.tx';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { speak, stopSpeaking, ttsAvailable } from '@/lib/voice';
import { speechSupported, loadRecognizer, recordUtterance, transcribe, type Recording } from '@/lib/speech';
import { parseVoiceAnswer } from '@/lib/voice-answer';
import { makeTx } from '@/lib/tx';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { SPECTRUM } from '@/lib/i18n';
import { TOPICS, TopicKey } from '@/types';
import { createTwinFromValues, classifyTwin } from '@/lib/twin-engine';
import { saveMyTwin, saveDemographics, type TwinDemographics } from '@/lib/db';
import { regionsForCountry } from '@/data/regions';
import { AGENDA } from '@/data/agenda';
import type { AgendaItem } from '@/types';

// 10 concrete statements, chosen once so all 8 dimensions are covered:
// taking a stance on real questions beats guessing on abstract sliders.
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

const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });

const AGE_OPTIONS = ['18-24', '25-34', '35-49', '50-64', '65+'] as const;

function SpeakerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

const tx = makeTx(TX);

export default function TrainingPage() {
  const { lang, country: autoCountry } = useLang();
  const router = useRouter();

  const topics = (SPECTRUM[lang as keyof typeof SPECTRUM] ?? SPECTRUM.en);

  const [values, setValues] = useState<Record<TopicKey, number>>(() =>
    Object.fromEntries(TOPICS.map(k => [k, 50])) as Record<TopicKey, number>
  );
  const [age, setAge] = useState<string>('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [archFlash, setArchFlash] = useState(false);
  const [countryTouched, setCountryTouched] = useState(false);
  const [mode, setMode] = useState<'questions' | 'sliders'>('questions');
  const [qIdx, setQIdx] = useState(0);

  // Voice — the statement can be read aloud (device TTS, local) and answered
  // by speaking (on-device Whisper; the voice never leaves the device).
  const [voiceState, setVoiceState] = useState<'off' | 'setup' | 'loading' | 'ready' | 'recording' | 'thinking'>('off');
  const [loadFrac, setLoadFrac] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [heardMatched, setHeardMatched] = useState(true);
  const [voiceErr, setVoiceErr] = useState(false);
  const recRef = useRef<Recording | null>(null);

  const stmtText = TRAINING_ITEMS[qIdx].text[lang] ?? TRAINING_ITEMS[qIdx].text['en'];

  // Each stance nudges the involved dimensions; ten answers shape the profile.
  function answerStatement(a: number) {
    setValues(v => {
      const next = { ...v };
      for (const [t, w] of Object.entries(TRAINING_ITEMS[qIdx].topicWeights) as [TopicKey, number][]) {
        const delta = (a - 0.5) * Math.sign(w) * Math.min(1, Math.abs(w)) * 55;
        next[t] = Math.round(Math.max(0, Math.min(100, next[t] + delta)));
      }
      return next;
    });
    if (qIdx + 1 >= TRAINING_ITEMS.length) setMode('sliders');
    else setQIdx(qIdx + 1);
  }

  // In voice mode the twin asks each question aloud — a conversation, not a form.
  useEffect(() => {
    if (mode === 'questions' && (voiceState === 'ready' || voiceState === 'recording')) {
      void speak(stmtText, lang);
    }
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, mode]);

  async function enableVoice() {
    setVoiceErr(false);
    setVoiceState('loading');
    try {
      await loadRecognizer((f) => setLoadFrac(f));
      setVoiceState('ready');
    } catch {
      setVoiceErr(true);
      setVoiceState('setup');
    }
  }

  const toggleRecord = useCallback(async () => {
    if (voiceState === 'recording') { recRef.current?.stop(); return; }
    if (voiceState !== 'ready') return;
    setHeard(null);
    stopSpeaking(); // never record while the device is still talking
    try {
      const rec = await recordUtterance(6000);
      recRef.current = rec;
      setVoiceState('recording');
      const audio = await rec.audio;
      setVoiceState('thinking');
      const text = (await transcribe(audio, lang)).trim();
      const parsed = parseVoiceAnswer(text, lang);
      setHeard(text || null);
      setHeardMatched(parsed !== null);
      setVoiceState('ready');
      if (parsed !== null) {
        // show what was understood for a beat, then answer
        setTimeout(() => { setHeard(null); answerStatement(parsed); }, 700);
      }
    } catch {
      setVoiceErr(true);
      setVoiceState('ready');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState, lang, qIdx]);

  // Geo-detected country is only the default; typing takes over permanently.
  const effCountry = countryTouched ? country : (autoCountry?.toUpperCase() ?? '');
  const regionOptions = regionsForCountry(effCountry);
  // never keep a region that belongs to a different country
  const effRegion = region.startsWith(effCountry + '-') ? region : '';

  // Show the live twin bar while the header radar is scrolled away,
  // hide it near the bottom so it never covers the save button.
  useEffect(() => {
    function onScroll() {
      const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 280;
      setBarVisible(window.scrollY > 240 && !nearBottom);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const liveValues = useMemo(() =>
    Object.fromEntries(TOPICS.map(k => [k, values[k] / 100])) as Record<TopicKey, number>,
    [values]
  );

  const liveArchetype = useMemo(() => {
    const twin = createTwinFromValues(liveValues);
    return classifyTwin(twin);
  }, [liveValues]);

  function handleSlider(key: TopicKey, val: number) {
    const next = { ...values, [key]: val };
    const nextArch = classifyTwin(createTwinFromValues(
      Object.fromEntries(TOPICS.map(k => [k, next[k] / 100])) as Record<TopicKey, number>
    ));
    if (nextArch !== liveArchetype) {
      // the answer just tipped the twin into a different archetype — make it felt
      setArchFlash(true);
      setTimeout(() => setArchFlash(false), 700);
    }
    setValues(next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const twin = createTwinFromValues(liveValues);
      await saveMyTwin(twin);
      if (effCountry) {
        await saveDemographics({
          country: effCountry,
          region: effRegion || undefined,
          ageGroup: (age as TwinDemographics['ageGroup']) || undefined,
        });
      }
      router.push('/twin');
    } finally {
      setSaving(false);
    }
  }

  const archetypeLabel = (ARCHETYPE_NAMES[liveArchetype]?.[lang] ?? ARCHETYPE_NAMES[liveArchetype]?.en ?? '').toUpperCase();

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* Header + Live preview */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '56px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '14px' }}>
              no kings
            </p>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: '12px' }}>
              {tx(lang, 'title')}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
              {tx(lang, 'sub')}
            </p>
          </div>

          {/* Live radar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <RadarChart values={liveValues} animated={false} size={88} />
            {liveArchetype && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--accent)' }}>
                {archetypeLabel}
              </span>
            )}
          </div>
        </div>

        {/* Statement flow: stance on concrete questions builds the twin */}
        {mode === 'questions' && (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '28px', maxWidth: '520px' }}>
              {tx(lang, 'tq_intro')}
            </p>
            <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '26px 24px', marginBottom: '20px' }}>
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

              {/* Voice answering — on-device Whisper, opt-in, honest about the download */}
              {speechSupported() && (
                <div style={{ borderTop: '1px solid var(--divider)', marginTop: '22px', paddingTop: '18px' }}>
                  {voiceState === 'off' && (
                    <button
                      onClick={() => setVoiceState('setup')}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
                        fontSize: '11px', letterSpacing: '0.08em', padding: 0,
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}
                    >
                      <MicIcon size={13} /> {tx(lang, 'voice_answer')}
                    </button>
                  )}

                  {voiceState === 'setup' && (
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.7, marginBottom: '14px', maxWidth: '440px' }}>
                        {tx(lang, 'voice_setup')}
                      </p>
                      {voiceErr && (
                        <p style={{ fontSize: '11px', color: 'var(--accent)', marginBottom: '10px' }}>{tx(lang, 'voice_error')}</p>
                      )}
                      <button
                        onClick={() => void enableVoice()}
                        style={{
                          background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                          padding: '10px 22px', fontSize: '12px', fontWeight: 700,
                          letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {tx(lang, 'voice_load')}
                      </button>
                    </div>
                  )}

                  {voiceState === 'loading' && (
                    <div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px' }}>
                        {tx(lang, 'voice_loading')} — {Math.round(loadFrac * 100)}%
                      </p>
                      <div style={{ height: '3px', background: 'var(--border)', maxWidth: '280px' }}>
                        <div style={{ height: '100%', width: `${Math.round(loadFrac * 100)}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}

                  {(voiceState === 'ready' || voiceState === 'recording' || voiceState === 'thinking') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => void toggleRecord()}
                        disabled={voiceState === 'thinking'}
                        aria-label={tx(lang, voiceState === 'recording' ? 'voice_recording' : 'voice_tap')}
                        className={voiceState === 'recording' ? 'mic-pulse' : undefined}
                        style={{
                          width: '52px', height: '52px', borderRadius: '50%',
                          border: '1px solid var(--border)',
                          background: voiceState === 'recording' ? 'var(--accent)' : 'var(--text-1)',
                          color: 'var(--bg)', cursor: voiceState === 'thinking' ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: voiceState === 'thinking' ? 0.5 : 1, flexShrink: 0,
                        }}
                      >
                        <MicIcon size={20} />
                      </button>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: voiceState === 'recording' ? 'var(--accent)' : 'var(--text-3)', letterSpacing: '0.06em' }}>
                          {voiceState === 'recording' ? tx(lang, 'voice_recording')
                            : voiceState === 'thinking' ? tx(lang, 'voice_thinking')
                            : tx(lang, 'voice_tap')}
                        </p>
                        {voiceErr && voiceState === 'ready' && (
                          <p style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '6px' }}>{tx(lang, 'voice_error')}</p>
                        )}
                        {heard && voiceState === 'ready' && (
                          <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>
                            {tx(lang, 'voice_heard')} „{heard}“
                            {!heardMatched && (
                              <span style={{ display: 'block', color: 'var(--text-3)', fontSize: '11px', marginTop: '4px' }}>
                                {tx(lang, 'voice_no_match')}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setMode('sliders')}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}
            >
              {tx(lang, 'tq_skip')}
            </button>
          </div>
        )}

        {mode === 'sliders' && (<>
        {qIdx > 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--positive)', marginBottom: '28px', letterSpacing: '0.04em' }}>
            ✓ {tx(lang, 'tq_done')}
          </p>
        )}
        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', marginBottom: '72px' }}>
          {topics.map((topic) => {
            const val = values[topic.key];

            return (
              <div key={topic.key}>
                {/* Label row — deliberately NO comparison values here: training is
                    blind so nobody anchors their answer to what "the world" thinks */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-2)' }}>
                    {topic.title}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                    {val}%
                  </span>
                </div>

                {/* Slider */}
                <input
                  type="range" min={0} max={100} step={1}
                  value={val}
                  onChange={e => handleSlider(topic.key, Number(e.target.value))}
                  className="spectrum-slider"
                  aria-label={topic.title}
                />

                {/* Pole labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.4, maxWidth: '44%', whiteSpace: 'pre-line' }}>
                    {topic.left}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.4, maxWidth: '44%', textAlign: 'right', whiteSpace: 'pre-line' }}>
                    {topic.right}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Demographics */}
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '48px', marginBottom: '48px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>
            {tx(lang, 'demo_sec')}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '32px', lineHeight: 1.6 }}>
            {tx(lang, 'demo_sub')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Age */}
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '10px' }}>
                {tx(lang, 'age_lbl')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AGE_OPTIONS.map(a => (
                  <button key={a} onClick={() => setAge(age === a ? '' : a)} style={{
                    padding: '8px 18px', fontSize: '13px',
                    background: age === a ? 'var(--text-1)' : 'var(--raised)',
                    color: age === a ? '#000' : 'var(--text-2)',
                    border: `1px solid ${age === a ? 'var(--text-1)' : 'var(--border)'}`,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'all 0.12s',
                  }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Country + Region */}
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

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {tx(lang, 'privacy')}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'var(--text-1)', color: 'var(--bg)',
              border: 'none', padding: '16px 40px',
              fontSize: '13px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {saving ? '…' : tx(lang, 'finish')}
          </button>
        </div>

        </>)}
      </div>

      {/* Live twin bar — the twin visibly morphs while you train it */}
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
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em',
            color: archFlash ? '#fff' : 'var(--accent)',
            transform: archFlash ? 'scale(1.06)' : 'scale(1)',
            transformOrigin: 'left center',
            transition: 'color 0.25s, transform 0.25s',
          }}>
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
