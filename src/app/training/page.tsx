'use client';

import { ARCHETYPE_NAMES } from '@/data/archetypes';
import { TX } from './page.tx';
import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { makeTx } from '@/lib/tx';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { SPECTRUM } from '@/lib/i18n';
import { TOPICS, TopicKey } from '@/types';
import { createTwinFromValues, classifyTwin } from '@/lib/twin-engine';
import { saveMyTwin, saveDemographics, type TwinDemographics } from '@/lib/db';
import { regionsForCountry } from '@/data/regions';

const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });

const AGE_OPTIONS = ['18-24', '25-34', '35-49', '50-64', '65+'] as const;

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
