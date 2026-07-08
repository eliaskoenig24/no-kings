'use client';

import { ARCHETYPE_NAMES } from '@/data/archetypes';
import { TX } from './page.tx';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { makeTx } from '@/lib/tx';
import { getMyTwin, saveMyTwin, getDemographics } from '@/lib/db';
import { TwinProfile, TOPICS, TopicKey } from '@/types';
import dynamic from 'next/dynamic';
const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });
import { getOrCreateIdentity } from '@/lib/identity';
import { publishTwin } from '@/lib/nostr';
import { useLang } from '@/context/LangContext';
import { SPECTRUM, getTopicLabel } from '@/lib/i18n';
import { generateShareCard, shareOrDownloadCard } from '@/lib/share-card';
import { createTwinFromValues, classifyTwin } from '@/lib/twin-engine';
import { AGENDA } from '@/data/agenda';
import { inferPosition } from '@/lib/inference';
// Positions are shown in ONE neutral color: high/low is a stance, not a score.
// (Red-to-green coloring silently frames one pole as "good" — a neutrality bug.)
const POSITION_COLOR = '#4B9EFF';

const tx = makeTx(TX);

export default function TwinPage() {
  const { lang, country } = useLang();
  const topics = SPECTRUM[lang as keyof typeof SPECTRUM] ?? SPECTRUM.en;

  const [twin, setTwin] = useState<TwinProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [confirming, setConfirming] = useState(false);
  const [mining, setMining] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [calibrated, setCalibrated] = useState<string[]>([]);
  const [calMsg, setCalMsg] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editVals, setEditVals] = useState<Record<TopicKey, number>>(
    Object.fromEntries(TOPICS.map(k => [k, 50])) as Record<TopicKey, number>
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyTwin().then(t => {
      setTwin(t ?? null);
      if (t) setEditVals(Object.fromEntries(TOPICS.map(k => [k, Math.round(t[k] * 100)])) as Record<TopicKey, number>);
      setLoading(false);
    });
    queueMicrotask(() => {
      try { setCalibrated(JSON.parse(localStorage.getItem('nk-calibrated') ?? '[]')); } catch { /* fresh start */ }
    });
  }, []);


  const archetype = useMemo(() => twin ? classifyTwin(twin) : null, [twin]);
  const archetypeLabel = archetype ? (ARCHETYPE_NAMES[archetype]?.[lang] ?? ARCHETYPE_NAMES[archetype]?.en ?? '') : '';

  // Top 10 agenda positions (most decisive = furthest from 50%)
  const agendaPositions = useMemo(() => {
    if (!twin) return [];
    return AGENDA.map(item => ({
      item,
      score: inferPosition(twin, item).score,
    }))
      .sort((a, b) => Math.abs(b.score - 0.5) - Math.abs(a.score - 0.5))
      .slice(0, 10);
  }, [twin]);

  // ---- Calibration: the twin makes a claim about you; you confirm or correct.
  // A correction visibly moves the underlying dimensions — the twin LEARNS. ----
  const CAL_GOAL = 5;
  const calCandidate = useMemo(
    () => agendaPositions.find(p => !calibrated.includes(p.item.id)),
    [agendaPositions, calibrated],
  );

  function markCalibrated(id: string) {
    const next = [...calibrated, id];
    setCalibrated(next);
    localStorage.setItem('nk-calibrated', JSON.stringify(next));
  }

  async function handleCalibrate(correct: boolean) {
    if (!twin || !calCandidate) return;
    const { item, score } = calCandidate;
    if (!correct) {
      // Move each involved dimension against the wrong inference — bounded nudge
      const step = score >= 0.5 ? -0.08 : 0.08;
      const vals = Object.fromEntries(TOPICS.map(k => [k, twin[k]])) as Record<TopicKey, number>;
      for (const [topic, weight] of Object.entries(item.topicWeights) as [TopicKey, number][]) {
        vals[topic] = Math.max(0, Math.min(1, vals[topic] + Math.sign(weight) * step));
      }
      const updated = createTwinFromValues(vals);
      await saveMyTwin(updated);
      setTwin(updated);
      setEditVals(Object.fromEntries(TOPICS.map(k => [k, Math.round(updated[k] * 100)])) as Record<TopicKey, number>);
      setSharing('idle'); // the published record is now stale — allow re-sharing
      setCalMsg(true);
      setTimeout(() => setCalMsg(false), 2200);
    }
    markCalibrated(item.id);
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const vals = Object.fromEntries(TOPICS.map(k => [k, editVals[k] / 100])) as Record<TopicKey, number>;
      const updated = createTwinFromValues(vals);
      await saveMyTwin(updated);
      setTwin(updated);
      setEditMode(false);
      setSharing('idle');
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    if (!twin) return;
    if (!confirming) {
      // First click opens the consent notice — publishing is public and irreversible.
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setSharing('loading');
    setMining(true);
    try {
      const identity = await getOrCreateIdentity();
      const demo = await getDemographics();
      const pubCountry = demo?.country ?? country;
      const result = await publishTwin(twin, identity.privkey, pubCountry, () => {
        // proof-of-work in progress; keep the mining hint visible
      }, demo?.region ?? null);
      setMining(false);
      setSharing(result.success ? 'done' : 'error');
    } catch {
      setMining(false);
      setSharing('error');
    }
  }

  async function handleShareCard() {
    if (!twin || cardBusy) return;
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

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>…</span>
    </div>
  );

  if (!twin) return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: '24px', textTransform: 'uppercase' }}>
          {tx(lang, 'label')}
        </p>
        <p style={{ fontSize: '20px', color: 'var(--text-2)', marginBottom: '32px' }}>
          {tx(lang, 'no_twin')}
        </p>
        <Link href="/training" style={{
          display: 'inline-block', background: 'var(--text-1)', color: 'var(--bg)',
          padding: '14px 32px', fontSize: '13px', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
        }}>
          {tx(lang, 'create')}
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '56px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: '14px', textTransform: 'uppercase' }}>
              {tx(lang, 'label')}
            </p>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 400, lineHeight: 1.1, marginBottom: '8px' }}>
              {archetypeLabel}
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
              no-kings.world/twin
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <RadarChart values={twin} size={120} animated />
          </div>
        </div>

        {/* Calibration — the twin claims, you correct, the radar moves */}
        {!editMode && calibrated.length < CAL_GOAL && (calCandidate || calMsg) && (
          <div style={{
            border: '1px solid rgba(96,165,250,0.3)',
            background: 'rgba(96,165,250,0.05)',
            padding: '24px 22px',
            marginBottom: '48px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.2em', color: '#60a5fa', textTransform: 'uppercase' }}>
                {tx(lang, 'cal_label')} · {calibrated.length}/{CAL_GOAL}
              </span>
              {calMsg && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--positive, #22c55e)' }}>
                  {tx(lang, 'cal_adjusted')}
                </span>
              )}
            </div>
            {calCandidate && (
              <>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px', letterSpacing: '0.06em' }}>
                  {tx(lang, 'cal_q')}
                </p>
                <p style={{ fontSize: '15px', lineHeight: 1.5, color: 'var(--text-1)', marginBottom: '8px', maxWidth: '560px' }}>
                  {calCandidate.item.text[lang] ?? calCandidate.item.text['en']}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, marginBottom: '18px', color: calCandidate.score >= 0.5 ? 'var(--positive, #22c55e)' : 'var(--negative, #ef4444)' }}>
                  → {calCandidate.score >= 0.5 ? tx(lang, 'support') : tx(lang, 'oppose')} ({Math.round(calCandidate.score * 100)}%)
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => handleCalibrate(true)} style={{
                    background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                    padding: '12px 28px', fontSize: '12px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                  }}>
                    {tx(lang, 'cal_yes')}
                  </button>
                  <button onClick={() => handleCalibrate(false)} style={{
                    background: 'transparent', color: 'var(--text-1)', border: '1px solid var(--text-1)',
                    padding: '12px 28px', fontSize: '12px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                  }}>
                    {tx(lang, 'cal_no')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {!editMode && calibrated.length >= CAL_GOAL && calibrated.length === CAL_GOAL && calMsg && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--positive, #22c55e)', marginBottom: '32px' }}>
            {tx(lang, 'cal_done')}
          </p>
        )}

        {/* 8 Dimension bars */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {tx(lang, 'dims')}
            </p>
            <button
              onClick={() => setEditMode(e => !e)}
              style={{
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-3)', fontSize: '11px', padding: '4px 12px',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              }}
            >
              {editMode ? tx(lang, 'cancel') : tx(lang, 'edit')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: editMode ? '32px' : '16px' }}>
            {topics.map(topic => {
              const val = twin[topic.key];
              const pct = Math.round(val * 100);
              const color = POSITION_COLOR;

              if (editMode) {
                const eVal = editVals[topic.key];
                return (
                  <div key={topic.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>
                        {topic.title}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: POSITION_COLOR }}>
                        {eVal}%
                      </span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={eVal}
                      onChange={e => setEditVals(v => ({ ...v, [topic.key]: Number(e.target.value) }))}
                      className="spectrum-slider"
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{topic.left}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', textAlign: 'right' }}>{topic.right}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={topic.key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 48px', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
                    {topic.title}
                  </span>
                  <div style={{ height: '4px', background: 'var(--raised)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color, textAlign: 'right' }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>

          {editMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
              <button onClick={() => setEditMode(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', padding: '10px 20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                {tx(lang, 'cancel')}
              </button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ background: 'var(--text-1)', color: 'var(--bg)', border: 'none', padding: '10px 24px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
                {saving ? '…' : tx(lang, 'save')}
              </button>
            </div>
          )}
        </div>

        {/* Agenda positions */}
        {!editMode && (
          <div style={{ marginBottom: '64px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '24px' }}>
              {tx(lang, 'positions')}
            </p>
            <div>
              {agendaPositions.map(({ item, score }) => {
                const pct = Math.round(score * 100);
                const isFor = pct >= 50;
                const color = isFor ? '#22c55e' : '#ef4444';
                return (
                  <div key={item.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <p style={{ flex: 1, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.4 }}>
                      {item.text[lang] ?? item.text['en']}
                    </p>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color, flexShrink: 0 }}>
                      {isFor ? tx(lang, 'support') : tx(lang, 'oppose')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Share */}
        {!editMode && (
          <div style={{
            border: sharing === 'done' ? '1px solid rgba(74,222,128,0.3)' : '1px solid var(--border)',
            padding: '32px',
            background: sharing === 'done' ? 'rgba(74,222,128,0.03)' : 'var(--surface)',
            transition: 'all 300ms',
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
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgb(250,180,50)', marginBottom: '10px' }}>
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
            <button
              onClick={handleShare}
              disabled={sharing === 'loading' || sharing === 'done'}
              style={{
                background: sharing === 'done' ? 'transparent' : 'var(--text-1)',
                color: sharing === 'done' ? 'var(--positive)' : '#000',
                border: sharing === 'done' ? '1px solid var(--positive)' : 'none',
                padding: '14px 32px', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: sharing === 'loading' || sharing === 'done' ? 'default' : 'pointer',
                opacity: sharing === 'loading' ? 0.6 : 1,
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
                marginLeft: '12px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {cardBusy ? tx(lang, 'card_making') : tx(lang, 'card_btn')}
            </button>

            {/* Key backup nudge — the twin is now public, the key is still mortal */}
            {sharing === 'done' && (
              <div style={{
                marginTop: '28px',
                border: '1px solid rgba(250,180,50,0.45)',
                background: 'rgba(250,180,50,0.05)',
                padding: '20px 24px',
                maxWidth: '520px',
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgb(250,180,50)', marginBottom: '10px' }}>
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
        )}

      </div>
    </div>
  );
}
