'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/context/LangContext';
import { t, getTopicLabel } from '@/lib/i18n';
import { getTwinHistory, type TwinSnapshot } from '@/lib/db';
import { TOPICS, type TopicKey } from '@/types';

type Delta = { key: TopicKey; delta: number; label: string };

function computeDeltas(current: TwinSnapshot, previous: TwinSnapshot, lang: string): Delta[] {
  return TOPICS
    .map(key => ({
      key: key as TopicKey,
      delta: Math.round((current.values[key as TopicKey] - previous.values[key as TopicKey]) * 100),
      label: getTopicLabel(key, lang),
    }))
    .filter(d => Math.abs(d.delta) >= 2)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);
}

function MiniRadar({ values, lang }: { values: TwinSnapshot['values']; lang: string }) {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '32px' }}>
      {TOPICS.map((key) => {
        const val = Math.max(0, Math.min(100, values[key as TopicKey] * 100));
        return (
          <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '32px' }}>
            <div
              title={`${getTopicLabel(key, lang)}: ${Math.round(val)}%`}
              style={{
                width: '100%',
                height: `${Math.round(val * 0.3) + 2}px`,
                background: `hsl(${val * 1.2}, 65%, 55%)`,
                borderRadius: '1px',
                transition: 'height 0.5s ease',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function DeltaChip({ delta, label }: { delta: number; label: string }) {
  const isPositive = delta > 0;
  const color = isPositive ? 'var(--positive)' : 'var(--negative)';
  const arrow = isPositive ? '↑' : '↓';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color,
      background: `${color}11`,
      border: `1px solid ${color}44`,
      padding: '2px 7px',
      borderRadius: '2px',
    }}>
      {arrow}{Math.abs(delta)}% {label}
    </span>
  );
}

export default function HistoryPage() {
  const { lang } = useLang();
  const [snapshots, setSnapshots] = useState<TwinSnapshot[] | null>(null);
  const isRtl = lang === 'ar' || lang === 'fa';

  useEffect(() => {
    getTwinHistory().then(setSnapshots);
  }, []);

  const historyTitle: Record<string, string> = {
    de: 'Wie sich dein Profil verändert hat',
    en: 'How your profile has changed',
    es: 'Cómo ha cambiado tu perfil',
    fr: 'Comment votre profil a évolué',
    pt: 'Como o seu perfil mudou',
    ar: 'كيف تغيّر ملفك الشخصي',
    zh: '你的档案如何变化',
    ja: 'プロフィールの変化',
    hi: 'आपकी प्रोफाइल कैसे बदली',
    ru: 'Как изменился ваш профиль',
    id: 'Bagaimana profil Anda berubah',
    tr: 'Profiliniz nasıl değişti',
    ko: '프로필이 어떻게 변했나요',
    it: 'Come è cambiato il tuo profilo',
    nl: 'Hoe je profiel is veranderd',
    pl: 'Jak zmieniał się twój profil',
    uk: 'Як змінився ваш профіль',
    vi: 'Hồ sơ của bạn đã thay đổi như thế nào',
    bn: 'আপনার প্রোফাইল কীভাবে পরিবর্তিত হয়েছে',
    fa: 'پروفایل شما چگونه تغییر کرده است',
  };

  const noChanges: Record<string, string> = {
    de: 'Noch keine Änderungen aufgezeichnet.',
    en: 'No changes recorded yet.',
    es: 'Aún no se han registrado cambios.',
    fr: "Aucun changement enregistré pour l'instant.",
    pt: 'Ainda não foram registradas alterações.',
    ar: 'لم يتم تسجيل أي تغييرات بعد.',
    zh: '尚未记录任何变化。',
    ja: 'まだ変更は記録されていません。',
    hi: 'अभी तक कोई परिवर्तन दर्ज नहीं।',
    ru: 'Изменений пока не зафиксировано.',
    id: 'Belum ada perubahan yang dicatat.',
    tr: 'Henüz hiçbir değişiklik kaydedilmedi.',
    ko: '아직 기록된 변경 사항이 없습니다.',
    it: 'Nessuna modifica ancora registrata.',
    nl: 'Nog geen wijzigingen opgenomen.',
    pl: 'Nie zarejestrowano jeszcze żadnych zmian.',
    uk: 'Змін поки не зафіксовано.',
    vi: 'Chưa có thay đổi nào được ghi lại.',
    bn: 'এখনো কোনো পরিবর্তন রেকর্ড করা হয়নি।',
    fa: 'هنوز هیچ تغییری ثبت نشده است.',
  };

  return (
    <div style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
      <main
        className="container"
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ maxWidth: '640px' }}
      >
        <p className="label" style={{ marginBottom: '16px' }}>{t(lang, 'nav_history')}</p>

        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', marginBottom: '48px', fontWeight: 400 }}>
          {historyTitle[lang] ?? historyTitle.en}
        </h1>

        {snapshots === null && (
          <p style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>…</p>
        )}

        {snapshots !== null && snapshots.length === 0 && (
          <div style={{ color: 'var(--text-2)', fontSize: '15px', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '24px' }}>{noChanges[lang] ?? noChanges.en}</p>
            <Link href="/training" style={{
              fontSize: '13px',
              color: 'var(--text-1)',
              background: 'var(--raised)',
              border: '1px solid var(--border)',
              padding: '10px 20px',
              letterSpacing: '0.02em',
              display: 'inline-block',
            }}>
              {t(lang, 'nav_create')}
            </Link>
          </div>
        )}

        {snapshots !== null && snapshots.length > 0 && (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: '18px',
              top: '12px',
              bottom: '12px',
              width: '1px',
              background: 'var(--divider)',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {snapshots.map((snap, i) => {
                const prev = snapshots[i + 1] ?? null;
                const deltas = prev ? computeDeltas(snap, prev, lang) : [];
                const date = new Date(snap.savedAt).toLocaleDateString(
                  lang === 'ar' ? 'ar-SA' : lang === 'fa' ? 'fa-IR' : lang,
                  { year: 'numeric', month: 'short', day: 'numeric' },
                );
                const isLatest = i === 0;

                return (
                  <div key={snap.id} style={{
                    display: 'flex',
                    gap: '24px',
                    paddingBottom: '32px',
                    paddingLeft: isRtl ? '0' : '0',
                  }}>
                    {/* Timeline dot */}
                    <div style={{
                      flexShrink: 0,
                      width: '36px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      paddingTop: '10px',
                    }}>
                      <div style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        background: isLatest ? 'var(--accent)' : 'var(--border)',
                        border: isLatest ? '2px solid var(--accent)' : '2px solid var(--divider)',
                        flexShrink: 0,
                      }} />
                    </div>

                    {/* Content */}
                    <div style={{
                      flex: 1,
                      background: 'var(--surface)',
                      border: `1px solid ${isLatest ? 'var(--accent)44' : 'var(--border)'}`,
                      padding: '20px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: isLatest ? 'var(--accent)' : 'var(--text-3)',
                          letterSpacing: '0.06em',
                        }}>
                          {date}
                        </span>
                        {isLatest && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--accent)',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}>
                            {({ de: 'AKTUELL', en: 'CURRENT', es: 'ACTUAL', fr: 'ACTUEL', pt: 'ATUAL', ar: 'الحالي', zh: '当前', ja: '現在', hi: 'वर्तमान', ru: 'ТЕКУЩИЙ', id: 'SAAT INI', tr: 'GÜNCEL', ko: '현재', it: 'ATTUALE', nl: 'HUIDIG', pl: 'AKTUALNY', uk: 'ПОТОЧНИЙ', vi: 'HIỆN TẠI', bn: 'বর্তমান', fa: 'فعلی' } as Record<string, string>)[lang] ?? 'CURRENT'}
                          </span>
                        )}
                        {snap.label && (
                          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                            {snap.label}
                          </span>
                        )}
                      </div>

                      {/* Mini bar chart */}
                      <MiniRadar values={snap.values} lang={lang} />

                      {/* 8 dimension values */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px 16px',
                        marginTop: '16px',
                      }}>
                        {TOPICS.map((key) => {
                          const val = Math.round(snap.values[key as TopicKey] * 100);
                          const prevVal = prev ? Math.round(prev.values[key as TopicKey] * 100) : null;
                          const delta = prevVal !== null ? val - prevVal : 0;
                          return (
                            <div key={key}>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', marginBottom: '2px' }}>
                                {getTopicLabel(key, lang).slice(0, 6)}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-1)' }}>
                                  {val}%
                                </span>
                                {Math.abs(delta) >= 2 && (
                                  <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    color: delta > 0 ? 'var(--positive)' : 'var(--negative)',
                                  }}>
                                    {delta > 0 ? `+${delta}` : delta}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Biggest deltas as chips */}
                      {deltas.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
                          {deltas.map(d => (
                            <DeltaChip key={d.key} delta={d.delta} label={d.label} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom CTA */}
            <div style={{ marginTop: '16px', paddingLeft: '60px' }}>
              <Link href="/twin" style={{
                fontSize: '12px',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                textDecoration: 'underline',
              }}>
                ← {t(lang, 'nav_twin')}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
