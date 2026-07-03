'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getMyTwin } from '@/lib/db';
import { calculateNetworkAggregate } from '@/lib/twin-engine';
import { DEMO_TWINS, DEMO_TWINS_TAGGED } from '@/data/demo-twins';
import { aggregateForItem, inferPosition } from '@/lib/inference';
import { AGENDA } from '@/data/agenda';
import { TwinProfile, TwinValues, TOPICS, TopicKey } from '@/types';
import dynamic from 'next/dynamic';
const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });
import { useLang } from '@/context/LangContext';
import { t, getTopicLabel } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

const ALL_DEMO_TWINS = DEMO_TWINS_TAGGED.map(d => d.twin);
const DEMO_AGGREGATES = AGENDA.map(item => aggregateForItem(ALL_DEMO_TWINS, item));

// ─── World Regions ────────────────────────────────────────────────────────────

interface WorldRegion {
  id: string;
  name: Record<string, string>;
  flag: string;
  means: TwinValues;
}

const WORLD_REGIONS: WorldRegion[] = [
  {
    id: 'western-europe',
    flag: '🇪🇺',
    name: { de: 'Westeuropa', en: 'Western Europe', es: 'Europa Occidental', fr: 'Europe de l\'Ouest', pt: 'Europa Ocidental', ar: 'أوروبا الغربية', zh: '西欧', ja: '西欧', hi: 'पश्चिमी यूरोप', ru: 'Западная Европа', id: 'Eropa Barat', tr: 'Batı Avrupa', ko: '서유럽', it: 'Europa Occidentale', nl: 'West-Europa', pl: 'Europa Zachodnia', uk: 'Західна Європа', vi: 'Tây Âu', bn: 'পশ্চিম ইউরোপ', fa: 'اروپای غربی' },
    means: { klimaschutz: 0.65, sozialstaat: 0.66, wirtschaft: 0.46, bildung: 0.71, gesundheit: 0.73, migration: 0.42, freiheit: 0.60, europa: 0.58 },
  },
  {
    id: 'north-america',
    flag: '🌎',
    name: { de: 'Nordamerika', en: 'North America', es: 'América del Norte', fr: 'Amérique du Nord', pt: 'América do Norte', ar: 'أمريكا الشمالية', zh: '北美', ja: '北米', hi: 'उत्तरी अमेरिका', ru: 'Северная Америка', id: 'Amerika Utara', tr: 'Kuzey Amerika', ko: '북아메리카', it: 'Nord America', nl: 'Noord-Amerika', pl: 'Ameryka Północna', uk: 'Північна Америка', vi: 'Bắc Mỹ', bn: 'উত্তর আমেরিকা', fa: 'آمریکای شمالی' },
    means: { klimaschutz: 0.55, sozialstaat: 0.48, wirtschaft: 0.40, bildung: 0.62, gesundheit: 0.60, migration: 0.46, freiheit: 0.65, europa: 0.30 },
  },
  {
    id: 'latin-america',
    flag: '🌎',
    name: { de: 'Lateinamerika', en: 'Latin America', es: 'América Latina', fr: 'Amérique Latine', pt: 'América Latina', ar: 'أمريكا اللاتينية', zh: '拉丁美洲', ja: 'ラテンアメリカ', hi: 'लैटिन अमेरिका', ru: 'Латинская Америка', id: 'Amerika Latin', tr: 'Latin Amerika', ko: '라틴 아메리카', it: 'America Latina', nl: 'Latijns-Amerika', pl: 'Ameryka Łacińska', uk: 'Латинська Америка', vi: 'Mỹ Latinh', bn: 'লাতিন আমেরিকা', fa: 'آمریکای لاتین' },
    means: { klimaschutz: 0.60, sozialstaat: 0.62, wirtschaft: 0.44, bildung: 0.68, gesundheit: 0.67, migration: 0.50, freiheit: 0.55, europa: 0.28 },
  },
  {
    id: 'east-asia',
    flag: '🌏',
    name: { de: 'Ostasien', en: 'East Asia', es: 'Asia Oriental', fr: 'Asie de l\'Est', pt: 'Leste Asiático', ar: 'شرق آسيا', zh: '东亚', ja: '東アジア', hi: 'पूर्वी एशिया', ru: 'Восточная Азия', id: 'Asia Timur', tr: 'Doğu Asya', ko: '동아시아', it: 'Asia Orientale', nl: 'Oost-Azië', pl: 'Azja Wschodnia', uk: 'Східна Азія', vi: 'Đông Á', bn: 'পূর্ব এশিয়া', fa: 'آسیای شرقی' },
    means: { klimaschutz: 0.58, sozialstaat: 0.60, wirtschaft: 0.52, bildung: 0.75, gesundheit: 0.70, migration: 0.30, freiheit: 0.45, europa: 0.22 },
  },
  {
    id: 'south-asia',
    flag: '🌏',
    name: { de: 'Südasien', en: 'South Asia', es: 'Asia del Sur', fr: 'Asie du Sud', pt: 'Sul da Ásia', ar: 'جنوب آسيا', zh: '南亚', ja: '南アジア', hi: 'दक्षिण एशिया', ru: 'Южная Азия', id: 'Asia Selatan', tr: 'Güney Asya', ko: '남아시아', it: 'Asia Meridionale', nl: 'Zuid-Azië', pl: 'Azja Południowa', uk: 'Південна Азія', vi: 'Nam Á', bn: 'দক্ষিণ এশিয়া', fa: 'آسیای جنوبی' },
    means: { klimaschutz: 0.55, sozialstaat: 0.58, wirtschaft: 0.48, bildung: 0.70, gesundheit: 0.65, migration: 0.40, freiheit: 0.50, europa: 0.20 },
  },
  {
    id: 'mena',
    flag: '🌍',
    name: { de: 'Naher Osten & Nordafrika', en: 'Middle East & N. Africa', es: 'Oriente Medio y N. África', fr: 'Moyen-Orient & Afrique du N.', pt: 'Oriente Médio e N. África', ar: 'الشرق الأوسط وشمال أفريقيا', zh: '中东与北非', ja: '中東・北アフリカ', hi: 'मध्य पूर्व और उत्तरी अफ्रीका', ru: 'Ближний Восток и Сев. Африка', id: 'Timur Tengah & Afrika Utara', tr: 'Orta Doğu ve K. Afrika', ko: '중동 및 북아프리카', it: 'Medio Oriente e Africa sett.', nl: 'Midden-Oosten & N. Afrika', pl: 'Bliski Wschód i Afryka Płn.', uk: 'Близький Схід і Пн. Африка', vi: 'Trung Đông và Bắc Phi', bn: 'মধ্যপ্রাচ্য ও উত্তর আফ্রিকা', fa: 'خاورمیانه و شمال آفریقا' },
    means: { klimaschutz: 0.50, sozialstaat: 0.55, wirtschaft: 0.45, bildung: 0.63, gesundheit: 0.62, migration: 0.28, freiheit: 0.40, europa: 0.20 },
  },
  {
    id: 'sub-saharan-africa',
    flag: '🌍',
    name: { de: 'Subsahara-Afrika', en: 'Sub-Saharan Africa', es: 'África Subsahariana', fr: 'Afrique subsaharienne', pt: 'África Subsaariana', ar: 'أفريقيا جنوب الصحراء', zh: '撒哈拉以南非洲', ja: 'サハラ以南アフリカ', hi: 'उप-सहारा अफ्रीका', ru: 'Африка южнее Сахары', id: 'Afrika Sub-Sahara', tr: 'Sahra Altı Afrika', ko: '사하라 이남 아프리카', it: 'Africa subsahariana', nl: 'Sub-Saharaans Afrika', pl: 'Afryka Subsaharyjska', uk: 'Африка на південь від Сахари', vi: 'Châu Phi cận Sahara', bn: 'সাহারা-দক্ষিণ আফ্রিকা', fa: 'آفریقای جنوب صحرا' },
    means: { klimaschutz: 0.58, sozialstaat: 0.60, wirtschaft: 0.47, bildung: 0.72, gesundheit: 0.68, migration: 0.45, freiheit: 0.54, europa: 0.18 },
  },
  {
    id: 'eastern-europe',
    flag: '🇪🇺',
    name: { de: 'Osteuropa & Zentralasien', en: 'Eastern Europe & C. Asia', es: 'Europa Oriental y Asia Central', fr: 'Europe de l\'Est et Asie centrale', pt: 'Europa Oriental e Ásia Central', ar: 'أوروبا الشرقية وآسيا الوسطى', zh: '东欧与中亚', ja: '東欧・中央アジア', hi: 'पूर्वी यूरोप और मध्य एशिया', ru: 'Восточная Европа и Ср. Азия', id: 'Eropa Timur & Asia Tengah', tr: 'Doğu Avrupa ve Orta Asya', ko: '동유럽 및 중앙아시아', it: 'Europa orientale e Asia centrale', nl: 'Oost-Europa & Centraal-Azië', pl: 'Europa Wschodnia i Azja Centralna', uk: 'Східна Європа і Центральна Азія', vi: 'Đông Âu và Trung Á', bn: 'পূর্ব ইউরোপ ও মধ্য এশিয়া', fa: 'اروپای شرقی و آسیای مرکزی' },
    means: { klimaschutz: 0.52, sozialstaat: 0.57, wirtschaft: 0.44, bildung: 0.65, gesundheit: 0.63, migration: 0.30, freiheit: 0.48, europa: 0.42 },
  },
  {
    id: 'oceania',
    flag: '🌏',
    name: { de: 'Ozeanien', en: 'Oceania', es: 'Oceanía', fr: 'Océanie', pt: 'Oceania', ar: 'أوقيانوسيا', zh: '大洋洲', ja: 'オセアニア', hi: 'ओशिनिया', ru: 'Океания', id: 'Oseania', tr: 'Okyanusya', ko: '오세아니아', it: 'Oceania', nl: 'Oceanië', pl: 'Oceania', uk: 'Океанія', vi: 'Châu Đại Dương', bn: 'ওশেনিয়া', fa: 'اقیانوسیه' },
    means: { klimaschutz: 0.62, sozialstaat: 0.58, wirtschaft: 0.43, bildung: 0.66, gesundheit: 0.68, migration: 0.50, freiheit: 0.63, europa: 0.25 },
  },
];

const REGION_TX = {
  title: { de: 'Du vs. Weltregionen', en: 'You vs. World Regions', es: 'Tú vs. Regiones del Mundo', fr: 'Toi vs. Régions du monde', pt: 'Tu vs. Regiões do Mundo', ar: 'أنت مقابل مناطق العالم', zh: '你 vs. 世界各地区', ja: 'あなた vs. 世界の地域', hi: 'आप vs. विश्व क्षेत्र', ru: 'Вы vs. Регионы мира', id: 'Kamu vs. Wilayah Dunia', tr: 'Sen vs. Dünya Bölgeleri', ko: '당신 vs. 세계 지역', it: 'Tu vs. Regioni del Mondo', nl: 'Jij vs. Wereldregio\'s', pl: 'Ty vs. Regiony Świata', uk: 'Ви vs. Регіони світу', vi: 'Bạn vs. Các khu vực thế giới', bn: 'আপনি বনাম বিশ্ব অঞ্চল', fa: 'شما در برابر مناطق جهان' },
  closest: { de: 'Größte Übereinstimmung', en: 'Closest match', es: 'Mayor coincidencia', fr: 'Meilleure correspondance', pt: 'Maior correspondência', ar: 'أقرب تطابق', zh: '最接近', ja: '最も近い', hi: 'सबसे करीब', ru: 'Ближе всего', id: 'Paling cocok', tr: 'En yakın eşleşme', ko: '가장 가까운 일치', it: 'Corrispondenza più vicina', nl: 'Beste overeenkomst', pl: 'Najbliższe dopasowanie', uk: 'Найближчий збіг', vi: 'Phù hợp nhất', bn: 'সবচেয়ে কাছের মিল', fa: 'نزدیک‌ترین مطابقت' },
};

function rTx(lang: Lang, key: keyof typeof REGION_TX): string {
  return (REGION_TX[key] as Record<string, string>)[lang] ?? (REGION_TX[key] as Record<string, string>)['en'];
}

// ─── Archetypes ───────────────────────────────────────────────────────────────

interface Archetype {
  id: string;
  name: string;
  color: string;
  profile: TwinValues;
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'eco-socialist',
    name: 'Eco-Socialist',
    color: '#16a34a',
    profile: { klimaschutz: 0.95, sozialstaat: 0.88, wirtschaft: 0.20, bildung: 0.90, gesundheit: 0.90, migration: 0.80, freiheit: 0.65, europa: 0.85 },
  },
  {
    id: 'progressive',
    name: 'Progressive',
    color: '#22c55e',
    profile: { klimaschutz: 0.82, sozialstaat: 0.78, wirtschaft: 0.38, bildung: 0.85, gesundheit: 0.83, migration: 0.72, freiheit: 0.72, europa: 0.80 },
  },
  {
    id: 'social-democrat',
    name: 'Social Democrat',
    color: '#ef4444',
    profile: { klimaschutz: 0.65, sozialstaat: 0.80, wirtschaft: 0.48, bildung: 0.78, gesundheit: 0.80, migration: 0.55, freiheit: 0.60, europa: 0.72 },
  },
  {
    id: 'christian-democrat',
    name: 'Christian Dem.',
    color: '#6b7280',
    profile: { klimaschutz: 0.45, sozialstaat: 0.52, wirtschaft: 0.62, bildung: 0.58, gesundheit: 0.55, migration: 0.35, freiheit: 0.50, europa: 0.60 },
  },
  {
    id: 'conservative',
    name: 'Conservative',
    color: '#94a3b8',
    profile: { klimaschutz: 0.32, sozialstaat: 0.38, wirtschaft: 0.78, bildung: 0.48, gesundheit: 0.42, migration: 0.22, freiheit: 0.58, europa: 0.32 },
  },
  {
    id: 'libertarian',
    name: 'Libertarian',
    color: '#f59e0b',
    profile: { klimaschutz: 0.38, sozialstaat: 0.18, wirtschaft: 0.92, bildung: 0.32, gesundheit: 0.22, migration: 0.68, freiheit: 0.97, europa: 0.48 },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchScore(twin: TwinValues, profile: TwinValues): number {
  const totalDistance =
    TOPICS.reduce((sum, topic) => sum + Math.abs(twin[topic] - profile[topic]), 0) /
    TOPICS.length;
  return Math.round((1 - totalDistance) * 100);
}

function matchColor(score: number): string {
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

function topDifferences(
  twin: TwinValues,
  network: TwinValues,
  count = 3,
): { topic: TopicKey; myVal: number; netVal: number; delta: number }[] {
  return [...TOPICS]
    .map((topic) => ({
      topic,
      myVal: twin[topic],
      netVal: network[topic],
      delta: twin[topic] - network[topic],
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, count);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { lang } = useLang();
  const [myTwin, setMyTwin] = useState<TwinProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyTwin().then((twin) => {
      setMyTwin(twin ?? null);
      setLoading(false);
    });
  }, []);

  const networkAvg = calculateNetworkAggregate(DEMO_TWINS).averages;

  if (loading) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '48px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '256px',
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '2px solid var(--accent)',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '48px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '48px',
    }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
        }}>
          {t(lang, 'compare_label')}
        </span>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 600,
          color: 'var(--text-1)',
          margin: 0,
          lineHeight: 1.2,
        }}>
          {t(lang, 'compare_title')}
        </h1>
      </div>

      {/* ── No twin state ── */}
      {!myTwin && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'flex-start',
        }}>
          <p style={{ color: 'var(--text-2)', fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
            {t(lang, 'twin_none')}
          </p>
          <Link href="/training" style={{
            fontSize: '13px',
            color: 'var(--text-1)',
            background: 'var(--raised)',
            border: '1px solid var(--border)',
            padding: '8px 20px',
            letterSpacing: '0.02em',
            textDecoration: 'none',
          }}>
            {t(lang, 'nav_create')} →
          </Link>
        </div>
      )}

      {/* ── With twin ── */}
      {myTwin && (
        <>
          {/* Section 1: Du vs. Netzwerk */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-1)',
              margin: 0,
            }}>
              {t(lang, 'compare_vs_network')}
            </h2>

            {/* Radar + legend */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '240px', height: '240px' }}>
                <RadarChart values={myTwin} compare={networkAvg} size={240} />
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '2px',
                    background: '#4B9EFF',
                  }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    {t(lang, 'nav_twin')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '2px',
                    background: '#404040',
                    borderTop: '1px dashed #404040',
                  }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    {t(lang, 'net_label')}
                  </span>
                </div>
              </div>
            </div>

            {/* Top 3 differences */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                margin: 0,
              }}>
                {t(lang, 'compare_top_diff')}
              </p>
              {topDifferences(myTwin, networkAvg).map(({ topic, myVal, netVal, delta }) => (
                <div key={topic} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center',
                  gap: '16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '12px 16px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-2)',
                  }}>
                    {getTopicLabel(topic, lang)}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {({ de: 'Du', en: 'You', es: 'Tú', fr: 'Toi', pt: 'Tu', ar: 'أنت', zh: '你', ja: 'あなた', hi: 'आप', ru: 'Вы', id: 'Anda', tr: 'Sen', ko: '당신', it: 'Tu', nl: 'Jij', pl: 'Ty', uk: 'Ви', vi: 'Bạn', bn: 'আপনি', fa: 'شما' } as Record<string, string>)[lang] ?? 'You'}: <span style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{Math.round(myVal * 100)}%</span>
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {t(lang, 'net_label')}: <span style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{Math.round(netVal * 100)}%</span>
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: delta > 0 ? '#4B9EFF' : '#ef4444',
                    whiteSpace: 'nowrap',
                  }}>
                    {delta > 0 ? '+' : ''}{Math.round(delta * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--divider)' }} />

          {/* Section 2: Du vs. Weltregionen */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-1)',
              margin: 0,
            }}>
              {rTx(lang, 'title')}
            </h2>

            {(() => {
              const scored = WORLD_REGIONS.map(r => ({ ...r, score: matchScore(myTwin, r.means) }))
                .sort((a, b) => b.score - a.score);
              const maxScore = scored[0].score;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scored.map((region, i) => {
                    const score = region.score;
                    const color = matchColor(score);
                    const isTop = score === maxScore;
                    return (
                      <div key={region.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr auto',
                        alignItems: 'center',
                        gap: '12px',
                        background: isTop ? 'rgba(96,165,250,0.04)' : 'var(--surface)',
                        border: isTop ? '1px solid rgba(96,165,250,0.25)' : '1px solid var(--border)',
                        padding: '12px 16px',
                      }}>
                        <span style={{ fontSize: '18px', textAlign: 'center', lineHeight: 1 }}>{region.flag}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '13px',
                              color: 'var(--text-1)',
                              fontWeight: isTop ? 600 : 400,
                            }}>
                              {(region.name as Record<string, string>)[lang] ?? region.name.en}
                            </span>
                            {isTop && (
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '9px',
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                color: 'rgba(96,165,250,0.9)',
                                border: '1px solid rgba(96,165,250,0.3)',
                                padding: '1px 6px',
                              }}>
                                {rTx(lang, 'closest')}
                              </span>
                            )}
                          </div>
                          <div style={{
                            height: '3px',
                            background: 'var(--raised)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${score}%`,
                              background: color,
                              borderRadius: '2px',
                              transition: 'width 0.8s ease',
                            }} />
                          </div>
                        </div>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '14px',
                          fontWeight: 600,
                          color,
                          minWidth: '40px',
                          textAlign: 'right',
                        }}>
                          {score}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--divider)' }} />

          {/* Section 3: Du vs. Archetypes */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-1)',
              margin: 0,
            }}>
              {t(lang, 'compare_vs_archetypes')}
            </h2>

            <div className="compare-archetype-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              {ARCHETYPES.map((archetype) => {
                const score = matchScore(myTwin, archetype.profile);
                const color = matchColor(score);
                return (
                  <ArchetypeCompareCard
                    key={archetype.id}
                    archetype={archetype}
                    myTwin={myTwin}
                    score={score}
                    scoreColor={color}
                    matchLabel={t(lang, 'compare_match')}
                  />
                );
              })}
            </div>
          </section>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--divider)' }} />

          {/* Section 4: Agenda agreement */}
          {(() => {
            const myPositions = AGENDA.map(item => inferPosition(myTwin, item));
            const agreements = AGENDA.map((item, i) => {
              const myScore = myPositions[i].score;
              const netScore = DEMO_AGGREGATES[i].support;
              const agree = (myScore >= 0.5) === (netScore >= 0.5);
              const gap = Math.abs(myScore - netScore);
              return { item, i, myScore, netScore, agree, gap };
            });
            const agreedCount = agreements.filter(a => a.agree).length;
            const disagreements = agreements.filter(a => !a.agree).sort((a, b) => b.gap - a.gap).slice(0, 5);
            const strongAgreements = agreements.filter(a => a.agree).sort((a, b) => b.gap - a.gap).slice(0, 3);
            const agreeLabel = ({ de: 'Du vs. Weltmeinung', en: 'You vs. World Opinion', es: 'Tú vs. Opinión Mundial', fr: 'Toi vs. Opinion Mondiale', pt: 'Tu vs. Opinião Mundial', ar: 'أنت مقابل الرأي العالمي', zh: '你 vs. 世界观点', ja: 'あなた vs. 世界の意見', hi: 'आप vs. विश्व मत', ru: 'Вы vs. Мировое мнение', id: 'Kamu vs. Pendapat Dunia', tr: 'Sen vs. Dünya Görüşü', ko: '당신 vs. 세계 여론', it: 'Tu vs. Opinione Mondiale', nl: 'Jij vs. Wereldmening', pl: 'Ty vs. Opinia Świata', uk: 'Ви vs. Думка Світу', vi: 'Bạn vs. Ý kiến Thế giới', bn: 'আপনি বনাম বিশ্ব মত', fa: 'شما در برابر نظر جهان' } as Record<string, string>)[lang] ?? 'You vs. World Opinion';
            const disagreeLabel = ({ de: 'Stärkste Meinungsverschiedenheiten', en: 'Strongest disagreements', es: 'Mayores desacuerdos', fr: 'Désaccords les plus forts', pt: 'Maiores divergências', ar: 'أقوى خلافات', zh: '最强烈的分歧', ja: '最も強い意見の相違', hi: 'सबसे मजबूत असहमति', ru: 'Наибольшие разногласия', id: 'Ketidaksepakatan terkuat', tr: 'En güçlü anlaşmazlıklar', ko: '가장 강한 불일치', it: 'I disaccordi più forti', nl: 'Sterkste meningsverschillen', pl: 'Najsilniejsze nieporozumienia', uk: 'Найсильніші незгоди', vi: 'Bất đồng mạnh nhất', bn: 'সবচেয়ে শক্তিশালী মতবিরোধ', fa: 'قوی‌ترین اختلاف‌نظرها' } as Record<string, string>)[lang] ?? 'Strongest disagreements';
            const agreeWithLabel = ({ de: 'Am ehesten einig', en: 'Most aligned', es: 'Mayor acuerdo', fr: 'Plus en accord', pt: 'Mais alinhado', ar: 'أكثر توافقاً', zh: '最为一致', ja: '最も一致', hi: 'सर्वाधिक सहमत', ru: 'Наибольшее согласие', id: 'Paling selaras', tr: 'En uyumlu', ko: '가장 일치', it: 'Più allineato', nl: 'Meest in lijn', pl: 'Największa zgodność', uk: 'Найбільше згоди', vi: 'Đồng thuận nhất', bn: 'সবচেয়ে একমত', fa: 'بیشترین هماهنگی' } as Record<string, string>)[lang] ?? 'Most aligned';
            return (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 600, color: 'var(--text-1)', margin: '0 0 8px' }}>
                    {agreeLabel}
                  </h2>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                    {agreedCount}/{AGENDA.length} {({ de: 'Fragen übereinstimmend', en: 'questions aligned', es: 'preguntas alineadas', fr: 'questions alignées', pt: 'perguntas alinhadas', ar: 'سؤال متوافق', zh: '问题一致', ja: '問題で一致', hi: 'सवाल एकमत', ru: 'вопросов совпадают', id: 'pertanyaan selaras', tr: 'soru uyumlu', ko: '질문 일치', it: 'domande allineate', nl: 'vragen gealigneerd', pl: 'pytań zgodnych', uk: 'питань збігаються', vi: 'câu hỏi đồng thuận', bn: 'প্রশ্ন একমত', fa: 'سؤال هماهنگ' } as Record<string, string>)[lang] ?? 'questions aligned'}
                    {' · '}{Math.round(agreedCount / AGENDA.length * 100)}%
                  </p>
                </div>

                {/* Progress bar */}
                <div style={{ height: '6px', background: 'var(--raised)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.round(agreedCount / AGENDA.length * 100)}%`, background: 'var(--positive)' }} />
                </div>

                {/* Top disagreements */}
                {disagreements.length > 0 && (
                  <div>
                    <p className="label" style={{ marginBottom: '16px', fontSize: '10px' }}>{disagreeLabel}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {disagreements.map(({ item, myScore, netScore }) => {
                        const myPct = Math.round(myScore * 100);
                        const netPct = Math.round(netScore * 100);
                        return (
                          <div key={item.id} style={{ padding: '14px 0', borderTop: '1px solid var(--divider)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 6px', lineHeight: 1.4 }}>
                                {item.text[lang] ?? item.text['en']}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: myScore >= 0.5 ? 'var(--positive)' : 'var(--negative)' }}>
                                You: {myPct}%
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}>vs</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                                World: {netPct}%
                              </span>
                              <Link href={`/question/${item.id}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', textDecoration: 'none', opacity: 0.6 }}>→</Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top agreements */}
                {strongAgreements.length > 0 && (
                  <div>
                    <p className="label" style={{ marginBottom: '16px', fontSize: '10px' }}>{agreeWithLabel}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {strongAgreements.map(({ item, myScore, netScore }) => {
                        const myPct = Math.round(myScore * 100);
                        const netPct = Math.round(netScore * 100);
                        return (
                          <div key={item.id} style={{ padding: '14px 0', borderTop: '1px solid var(--divider)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 6px', lineHeight: 1.4 }}>
                                {item.text[lang] ?? item.text['en']}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--positive)' }}>
                                ✓ {myPct}% / {netPct}%
                              </span>
                              <Link href={`/question/${item.id}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', textDecoration: 'none', opacity: 0.6 }}>→</Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── ArchetypeCompareCard ──────────────────────────────────────────────────────

function ArchetypeCompareCard({
  archetype,
  myTwin,
  score,
  scoreColor,
  matchLabel,
}: {
  archetype: Archetype;
  myTwin: TwinValues;
  score: number;
  scoreColor: string;
  matchLabel: string;
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      alignItems: 'center',
    }}>
      {/* Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: archetype.color,
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-1)',
        }}>
          {archetype.name}
        </span>
      </div>

      {/* Match % */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '36px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: scoreColor,
          lineHeight: 1,
        }}>
          {score}%
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--text-3)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginTop: '4px',
        }}>
          {matchLabel}
        </div>
      </div>

      {/* Radar */}
      <div style={{ width: '160px', height: '160px' }}>
        <RadarChart values={archetype.profile} compare={myTwin} size={160} animated={false} />
      </div>

      {/* Match bar */}
      <div style={{
        width: '100%',
        height: '3px',
        background: 'var(--raised)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${score}%`,
          background: scoreColor,
          borderRadius: '2px',
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
}
