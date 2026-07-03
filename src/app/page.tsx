'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/context/LangContext';
import { AGENDA } from '@/data/agenda';
import { DEMO_TWINS_TAGGED } from '@/data/demo-twins';
import { aggregateForItem, inferPosition } from '@/lib/inference';
import { getMyTwin } from '@/lib/db';
import type { TwinProfile } from '@/types';

const ALL_TWINS = DEMO_TWINS_TAGGED.map(t => t.twin);

// Sort by controversy (closest to 50% = most interesting)
const ITEMS = AGENDA.map(item => ({
  item,
  support: aggregateForItem(ALL_TWINS, item).support,
})).sort((a, b) => Math.abs(a.support - 0.5) - Math.abs(b.support - 0.5));

const TX = {
  label:    { de: 'DER GLOBALE PULS', en: 'THE GLOBAL PULSE', es: 'EL PULSO GLOBAL', fr: 'LE POULS MONDIAL', pt: 'O PULSO GLOBAL', ar: 'النبض العالمي', zh: '全球脉搏', ja: 'グローバルな鼓動', hi: 'वैश्विक नाड़ी', ru: 'ГЛОБАЛЬНЫЙ ПУЛЬС', id: 'DENYUT GLOBAL', tr: 'KÜRESEL NABIZ', ko: '글로벌 맥박', it: 'IL POLSO GLOBALE', nl: 'DE GLOBALE POLS', pl: 'GLOBALNY PULS', uk: 'ГЛОБАЛЬНИЙ ПУЛЬС', vi: 'NHỊP ĐẬP TOÀN CẦU', bn: 'বৈশ্বিক স্পন্দন', fa: 'نبض جهانی' },
  title:    { de: 'Was will die Welt?', en: 'What does the world want?', es: '¿Qué quiere el mundo?', fr: 'Que veut le monde?', pt: 'O que o mundo quer?', ar: 'ماذا يريد العالم؟', zh: '世界想要什么？', ja: '世界は何を望んでいるか？', hi: 'दुनिया क्या चाहती है?', ru: 'Чего хочет мир?', id: 'Apa yang dunia inginkan?', tr: 'Dünya ne istiyor?', ko: '세계는 무엇을 원하는가?', it: 'Cosa vuole il mondo?', nl: 'Wat wil de wereld?', pl: 'Czego chce świat?', uk: 'Чого хоче світ?', vi: 'Thế giới muốn gì?', bn: 'বিশ্ব কী চায়?', fa: 'جهان چه می‌خواهد؟' },
  voices:   { de: 'Stimmen', en: 'voices', es: 'voces', fr: 'voix', pt: 'vozes', ar: 'أصوات', zh: '声音', ja: '声', hi: 'आवाज़ें', ru: 'голосов', id: 'suara', tr: 'ses', ko: '목소리', it: 'voci', nl: 'stemmen', pl: 'głosów', uk: 'голосів', vi: 'giọng nói', bn: 'কণ্ঠস্বর', fa: 'صدا' },
  you:      { de: 'Du', en: 'You', es: 'Tú', fr: 'Toi', pt: 'Tu', ar: 'أنت', zh: '你', ja: 'あなた', hi: 'आप', ru: 'Вы', id: 'Anda', tr: 'Sen', ko: '당신', it: 'Tu', nl: 'Jij', pl: 'Ty', uk: 'Ви', vi: 'Bạn', bn: 'আপনি', fa: 'شما' },
  active:   { de: 'Dein Zwilling ist aktiv', en: 'Your twin is active', es: 'Tu gemelo está activo', fr: 'Ton jumeau est actif', pt: 'Seu gêmeo está ativo', ar: 'توأمك نشط', zh: '你的孪生已激活', ja: 'ツインはアクティブ', hi: 'तुम्हारा जुड़वां सक्रिय है', ru: 'Твой двойник активен', id: 'Kembaranmu aktif', tr: 'İkizin aktif', ko: '트윈이 활성화됨', it: 'Il tuo gemello è attivo', nl: 'Jouw tweeling is actief', pl: 'Twój bliźniak jest aktywny', uk: 'Твій двійник активний', vi: 'Sinh đôi đang hoạt động', bn: 'তোমার যমজ সক্রিয়', fa: 'دوقلوی شما فعال است' },
  active_sub: { de: 'Blauer Marker = deine Position', en: 'Blue marker = your position', es: 'Marcador azul = tu posición', fr: 'Marqueur bleu = ta position', pt: 'Marcador azul = sua posição', ar: 'العلامة الزرقاء = موضعك', zh: '蓝色标记 = 你的位置', ja: '青いマーカー = あなたの位置', hi: 'नीला मार्कर = तुम्हारी स्थिति', ru: 'Синий маркер = ваша позиция', id: 'Penanda biru = posisi Anda', tr: 'Mavi işaret = senin konumun', ko: '파란 마커 = 당신의 위치', it: 'Marcatore blu = la tua posizione', nl: 'Blauwe markering = jouw positie', pl: 'Niebieski znacznik = twoja pozycja', uk: 'Синій маркер = ваша позиція', vi: 'Dấu xanh = vị trí của bạn', bn: 'নীল চিহ্ন = তোমার অবস্থান', fa: 'نشانگر آبی = موقعیت شما' },
  no_twin:  { de: 'Du siehst globale Demo-Daten', en: 'You are viewing global demo data', es: 'Estás viendo datos de demostración globales', fr: 'Tu vois des données de démonstration mondiales', pt: 'Você está vendo dados de demonstração globais', ar: 'تشاهد بيانات عالمية تجريبية', zh: '您正在查看全球演示数据', ja: 'グローバルデモデータを表示中', hi: 'आप वैश्विक डेमो डेटा देख रहे हैं', ru: 'Вы просматриваете глобальные демо-данные', id: 'Anda melihat data demo global', tr: 'Küresel demo verileri görüyorsunuz', ko: '전 세계 데모 데이터를 보고 있습니다', it: 'Stai visualizzando dati demo globali', nl: 'Je bekijkt wereldwijde demogegevens', pl: 'Widzisz globalne dane demonstracyjne', uk: 'Ви переглядаєте глобальні демо-дані', vi: 'Bạn đang xem dữ liệu demo toàn cầu', bn: 'আপনি বৈশ্বিক ডেমো ডেটা দেখছেন', fa: 'شما داده‌های نمایشی جهانی را می‌بینید' },
  cta:      { de: 'Erstelle deinen Zwilling →', en: 'Create your twin →', es: 'Crea tu gemelo →', fr: 'Crée ton jumeau →', pt: 'Crie seu gêmeo →', ar: 'أنشئ توأمك ←', zh: '创建你的孪生 →', ja: 'ツインを作成する →', hi: 'अपना जुड़वां बनाएं →', ru: 'Создать своего двойника →', id: 'Buat kembaranmu →', tr: 'İkizini oluştur →', ko: '트윈 만들기 →', it: 'Crea il tuo gemello →', nl: 'Maak jouw tweeling →', pl: 'Utwórz swojego bliźniaka →', uk: 'Створити двійника →', vi: 'Tạo sinh đôi của bạn →', bn: 'তোমার যমজ তৈরি করো →', fa: 'دوقلوی خود را بسازید ←' },
  support:  { de: 'dafür', en: 'support', es: 'a favor', fr: 'pour', pt: 'a favor', ar: 'مؤيد', zh: '支持', ja: '支持', hi: 'पक्ष', ru: 'за', id: 'mendukung', tr: 'destek', ko: '찬성', it: 'a favore', nl: 'voor', pl: 'za', uk: 'за', vi: 'ủng hộ', bn: 'সমর্থন', fa: 'موافق' },
  oppose:   { de: 'dagegen', en: 'oppose', es: 'en contra', fr: 'contre', pt: 'contra', ar: 'معارض', zh: '反对', ja: '反対', hi: 'विरोध', ru: 'против', id: 'menolak', tr: 'karşı', ko: '반대', it: 'contro', nl: 'tegen', pl: 'przeciw', uk: 'проти', vi: 'phản đối', bn: 'বিরোধ', fa: 'مخالف' },
};

function tx(lang: string, key: keyof typeof TX): string {
  return (TX[key] as Record<string, string>)[lang] ?? (TX[key] as Record<string, string>)['en'];
}

export default function HomePage() {
  const { lang } = useLang();
  const [myTwin, setMyTwin] = useState<TwinProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMyTwin().then(t => { setMyTwin(t ?? null); setLoaded(true); });
  }, []);

  const items = useMemo(() => ITEMS, []);

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0' }}>
      <div className="container" style={{ maxWidth: '780px' }}>

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
              2,500
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', marginTop: '4px' }}>
              {tx(lang, 'voices')} · 44 {('countries' in TX ? '' : '')}
            </div>
          </div>
        </div>

        {/* Twin status bar */}
        {loaded && (
          <div style={{
            padding: '14px 20px',
            marginBottom: '40px',
            background: myTwin ? 'rgba(96,165,250,0.06)' : 'var(--surface)',
            border: myTwin ? '1px solid rgba(96,165,250,0.2)' : '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            {myTwin ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', background: '#60a5fa', borderRadius: '50%', boxShadow: '0 0 6px #60a5fa' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#60a5fa', letterSpacing: '0.06em' }}>
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
                  {tx(lang, 'no_twin')}
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
            const pct = Math.round(support * 100);
            const myScore = myTwin ? inferPosition(myTwin, item).score : null;
            const myPct = myScore !== null ? Math.round(myScore * 100) : null;
            const isSupport = pct >= 50;
            const barColor = isSupport ? '#22c55e' : '#ef4444';

            return (
              <div key={item.id} style={{
                padding: '28px 0',
                borderBottom: '1px solid var(--divider)',
              }}>
                <p style={{
                  fontSize: '15px', lineHeight: 1.55,
                  color: 'var(--text-1)', fontWeight: 400,
                  marginBottom: '20px', maxWidth: '680px',
                }}>
                  {item.text[lang] ?? item.text['en']}
                </p>

                {/* Bar row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Bar */}
                  <div style={{ flex: 1, height: '5px', background: 'var(--raised)', position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, height: '100%',
                      width: `${pct}%`, background: barColor,
                    }} />
                    {/* Midpoint */}
                    <div style={{
                      position: 'absolute', left: '50%', top: '-3px',
                      width: '1px', height: '11px', background: 'var(--border)',
                    }} />
                    {/* My twin */}
                    {myPct !== null && (
                      <div style={{
                        position: 'absolute', left: `${myPct}%`,
                        top: '-4px', transform: 'translateX(-50%)',
                        width: '3px', height: '13px', background: '#60a5fa',
                      }} />
                    )}
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '15px',
                      fontWeight: 700, color: barColor, minWidth: '40px', textAlign: 'right',
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
                        fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#60a5fa',
                        whiteSpace: 'nowrap',
                      }}>
                        {tx(lang, 'you')}: {myPct}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        {loaded && !myTwin && (
          <div style={{ marginTop: '64px', paddingTop: '48px', borderTop: '1px solid var(--divider)' }}>
            <Link href="/training" style={{
              display: 'inline-block',
              background: 'var(--text-1)', color: '#000',
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
