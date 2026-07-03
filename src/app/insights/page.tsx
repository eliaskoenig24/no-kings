'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AGENDA } from '@/data/agenda';
import { DEMO_TWINS_TAGGED } from '@/data/demo-twins';
import { aggregateForItem, inferAllPositions } from '@/lib/inference';
import { useLang } from '@/context/LangContext';
import { getTopicLabel } from '@/lib/i18n';
import type { TopicKey } from '@/types';

const TOPICS: TopicKey[] = ['klimaschutz', 'sozialstaat', 'wirtschaft', 'bildung', 'gesundheit', 'migration', 'freiheit', 'europa'];
const ALL_TWINS = DEMO_TWINS_TAGGED.map(t => t.twin);

// Pre-compute aggregates for all questions
const AGG = AGENDA.map(item => aggregateForItem(ALL_TWINS, item));

// Question controversy score: distance from 50%
const CONTROVERSY = AGENDA.map((item, i) => ({
  item,
  support: AGG[i].support,
  controversy: 1 - Math.abs(AGG[i].support - 0.5) * 2,
})).sort((a, b) => b.controversy - a.controversy);

// Question consensus score: distance from 100% or 0%
const CONSENSUS = [...CONTROVERSY].sort((a, b) => a.controversy - b.controversy);

// Per-topic aggregate — what % of population leans toward each topic
const TOPIC_MEANS = TOPICS.map(t => ({
  topic: t,
  mean: ALL_TWINS.reduce((s, tw) => s + tw[t], 0) / ALL_TWINS.length,
})).sort((a, b) => b.mean - a.mean);

// Per-country divergence from world mean (top outliers)
const WORLD_MEAN = Object.fromEntries(TOPICS.map(t => [t, ALL_TWINS.reduce((s, tw) => s + tw[t], 0) / ALL_TWINS.length])) as Record<TopicKey, number>;
const WORLD_POSITIONS = inferAllPositions(WORLD_MEAN as never, AGENDA);

// Country divergence: how much each country's average differs from world across all questions
const COUNTRY_MAP: Record<string, { twins: typeof ALL_TWINS; country: string }> = {};
for (const { twin, country } of DEMO_TWINS_TAGGED) {
  if (!COUNTRY_MAP[country]) COUNTRY_MAP[country] = { twins: [], country };
  COUNTRY_MAP[country].twins.push(twin);
}

const COUNTRY_DIVERGENCE = Object.entries(COUNTRY_MAP)
  .filter(([, { twins }]) => twins.length >= 30)
  .map(([code, { twins }]) => {
    const positions = inferAllPositions(
      Object.fromEntries(TOPICS.map(t => [t, twins.reduce((s, tw) => s + tw[t], 0) / twins.length])) as never,
      AGENDA
    );
    const divergence = positions.reduce((s, pos, i) => s + Math.abs(pos.score - WORLD_POSITIONS[i].score), 0) / positions.length;
    const maxDiff = positions.reduce((max, pos, i) => {
      const diff = pos.score - WORLD_POSITIONS[i].score;
      return Math.abs(diff) > Math.abs(max.diff) ? { diff, item: AGENDA[i] } : max;
    }, { diff: 0, item: AGENDA[0] });
    return { code, count: twins.length, divergence, maxDiff };
  })
  .sort((a, b) => b.divergence - a.divergence);

const flagOf = (code: string) =>
  code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));

// Per-country dimension averages for comparison tool
const COUNTRY_AVGS: Record<string, Record<TopicKey, number>> = Object.fromEntries(
  Object.entries(COUNTRY_MAP)
    .filter(([, { twins }]) => twins.length >= 20)
    .map(([code, { twins }]) => [
      code,
      Object.fromEntries(
        TOPICS.map(t => [t, twins.reduce((s, tw) => s + tw[t], 0) / twins.length])
      ) as Record<TopicKey, number>,
    ])
);
const COUNTRY_LIST = Object.keys(COUNTRY_AVGS).sort();

const TX = {
  title:      { de: 'Einblicke', en: 'Insights', es: 'Perspectivas', fr: 'Analyses', pt: 'Perspectivas', ar: 'رؤى', zh: '洞察', ja: 'インサイト', hi: 'अंतर्दृष्टि', ru: 'Аналитика', id: 'Wawasan', tr: 'Analizler', ko: '인사이트', it: 'Analisi', nl: 'Inzichten', pl: 'Analizy', uk: 'Аналітика', vi: 'Phân tích', bn: 'অন্তর্দৃষ্টি', fa: 'بینش‌ها' },
  subtitle:   { de: 'Was 2.500 digitale Zwillinge aus 44 Ländern uns sagen', en: 'What 2,500 digital twins from 44 countries tell us', es: 'Lo que nos dicen 2.500 gemelos digitales de 44 países', fr: 'Ce que nous disent 2 500 jumeaux numériques de 44 pays', pt: 'O que nos dizem 2.500 gêmeos digitais de 44 países', ar: 'ما يخبرنا به 2500 توأم رقمي من 44 دولة', zh: '来自44个国家的2500个数字孪生告诉我们什么', ja: '44カ国2,500のデジタルツインが語ること', hi: '44 देशों से 2,500 डिजिटल जुड़वां हमें क्या बताते हैं', ru: 'Что говорят нам 2500 цифровых двойников из 44 стран', id: 'Apa yang disampaikan 2.500 kembaran digital dari 44 negara', tr: '44 ülkeden 2.500 dijital ikizin bize anlattıkları', ko: '44개국 2,500개 디지털 트윈이 우리에게 말해주는 것', it: 'Cosa ci dicono 2.500 gemelli digitali da 44 paesi', nl: 'Wat 2.500 digitale tweelingen uit 44 landen ons vertellen', pl: 'Co mówią nam 2500 cyfrowych bliźniaków z 44 krajów', uk: 'Що говорять нам 2500 цифрових двійників з 44 країн', vi: 'Điều 2.500 sinh đôi kỹ thuật số từ 44 quốc gia cho chúng ta biết', bn: '৪৪টি দেশ থেকে ২,৫০০ ডিজিটাল যমজ আমাদের কী বলে', fa: 'آنچه ۲٫۵۰۰ دوقلوی دیجیتال از ۴۴ کشور به ما می‌گویند' },
  most_div:   { de: 'Umstrittenste Fragen', en: 'Most divided questions', es: 'Preguntas más divididas', fr: 'Questions les plus divisées', pt: 'Perguntas mais divididas', ar: 'الأسئلة الأكثر انقساماً', zh: '最具争议的问题', ja: '最も意見が分かれる質問', hi: 'सबसे विभाजित प्रश्न', ru: 'Самые спорные вопросы', id: 'Pertanyaan paling terbagi', tr: 'En tartışmalı sorular', ko: '가장 의견이 갈리는 질문', it: 'Domande più divise', nl: 'Meest verdeelde vragen', pl: 'Najbardziej podzielone pytania', uk: 'Найбільш суперечливі питання', vi: 'Câu hỏi gây chia rẽ nhất', bn: 'সবচেয়ে বিভক্ত প্রশ্ন', fa: 'بحث‌برانگیزترین سؤالات' },
  most_con:   { de: 'Stärkster Konsens', en: 'Strongest consensus', es: 'Mayor consenso', fr: 'Plus fort consensus', pt: 'Maior consenso', ar: 'أقوى توافق', zh: '最强共识', ja: '最も強いコンセンサス', hi: 'सबसे मजबूत सहमति', ru: 'Наибольший консенсус', id: 'Konsensus terkuat', tr: 'En güçlü mutabakat', ko: '가장 강한 합의', it: 'Massimo consenso', nl: 'Sterkste consensus', pl: 'Najsilniejszy konsens', uk: 'Найсильніший консенсус', vi: 'Đồng thuận mạnh nhất', bn: 'সবচেয়ে শক্তিশালী ঐকমত্য', fa: 'قوی‌ترین اجماع' },
  topic_heat: { de: 'Politisches Thermostat', en: 'Political thermostat', es: 'Termostato político', fr: 'Thermomètre politique', pt: 'Termômetro político', ar: 'الترموستات السياسي', zh: '政治温度计', ja: '政治サーモスタット', hi: 'राजनीतिक थर्मोस्टैट', ru: 'Политический термостат', id: 'Termometer politik', tr: 'Siyasi termometre', ko: '정치적 온도계', it: 'Termometro politico', nl: 'Politieke thermostaat', pl: 'Polityczny termometr', uk: 'Політичний термометр', vi: 'Nhiệt kế chính trị', bn: 'রাজনৈতিক থার্মোস্ট্যাট', fa: 'ترموستات سیاسی' },
  topic_desc: { de: 'Globaler Durchschnitt pro Dimension', en: 'Global average per dimension', es: 'Promedio global por dimensión', fr: 'Moyenne globale par dimension', pt: 'Média global por dimensão', ar: 'المتوسط العالمي لكل بُعد', zh: '每个维度的全球平均值', ja: '各次元のグローバル平均', hi: 'प्रत्येक आयाम का वैश्विक औसत', ru: 'Глобальное среднее по каждому измерению', id: 'Rata-rata global per dimensi', tr: 'Boyut başına küresel ortalama', ko: '차원별 글로벌 평균', it: 'Media globale per dimensione', nl: 'Globaal gemiddelde per dimensie', pl: 'Globalna średnia na wymiar', uk: 'Глобальне середнє по кожному виміру', vi: 'Trung bình toàn cầu theo chiều', bn: 'প্রতিটি মাত্রার বৈশ্বিক গড়', fa: 'میانگین جهانی به ازای هر بُعد' },
  outliers:   { de: 'Länder die am meisten abweichen', en: 'Countries that diverge most', es: 'Países que más divergen', fr: 'Pays qui divergent le plus', pt: 'Países que mais divergem', ar: 'الدول الأكثر انحرافاً', zh: '偏差最大的国家', ja: '最も乖離している国', hi: 'सबसे अधिक विचलित होने वाले देश', ru: 'Страны с наибольшим отклонением', id: 'Negara-negara yang paling menyimpang', tr: 'En çok ayrışan ülkeler', ko: '가장 많이 벗어나는 국가들', it: 'Paesi che si discostano di più', nl: 'Landen die het meest afwijken', pl: 'Kraje, które najbardziej się różnią', uk: 'Країни, що найбільше відхиляються', vi: 'Các quốc gia có sự khác biệt lớn nhất', bn: 'সবচেয়ে বেশি বিচ্যুত দেশগুলো', fa: 'کشورهایی که بیشترین انحراف را دارند' },
  view_q:     { de: 'Frage ansehen →', en: 'View question →', es: 'Ver pregunta →', fr: 'Voir la question →', pt: 'Ver pergunta →', ar: 'عرض السؤال ←', zh: '查看问题 →', ja: '質問を見る →', hi: 'प्रश्न देखें →', ru: 'Открыть вопрос →', id: 'Lihat pertanyaan →', tr: 'Soruyu gör →', ko: '질문 보기 →', it: 'Vedi domanda →', nl: 'Bekijk vraag →', pl: 'Zobacz pytanie →', uk: 'Переглянути питання →', vi: 'Xem câu hỏi →', bn: 'প্রশ্ন দেখুন →', fa: 'مشاهده سؤال ←' },
};

function tx(lang: string, key: keyof typeof TX): string {
  return (TX[key] as Record<string, string>)[lang] ?? (TX[key] as Record<string, string>)['en'];
}

export default function InsightsPage() {
  const { lang } = useLang();

  const top5Controversial = useMemo(() => CONTROVERSY.slice(0, 5), []);
  const top5Consensus = useMemo(() => CONSENSUS.slice(0, 5), []);
  const top8Outliers = useMemo(() => COUNTRY_DIVERGENCE.slice(0, 8), []);

  return (
    <div style={{ padding: 'clamp(60px, 8vw, 100px) 0', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '900px' }}>

        {/* Header */}
        <div style={{ marginBottom: '80px' }}>
          <p className="label" style={{ marginBottom: '16px' }}>no kings</p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 400, lineHeight: 1.1, marginBottom: '16px' }}>
            {tx(lang, 'title')}
          </h1>
          <p style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.6 }}>
            {tx(lang, 'subtitle')}
          </p>
        </div>

        {/* Political thermostat — topic averages */}
        <div style={{ marginBottom: '80px' }}>
          <p className="label" style={{ marginBottom: '8px' }}>{tx(lang, 'topic_heat')}</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '32px', fontFamily: 'var(--font-mono)' }}>
            {tx(lang, 'topic_desc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {TOPIC_MEANS.map(({ topic, mean }) => {
              const pct = Math.round(mean * 100);
              const hue = Math.round(mean * 120); // green=120 at high, red=0 at low
              const color = `hsl(${hue},60%,50%)`;
              return (
                <div key={topic}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
                      {getTopicLabel(topic, lang)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--raised)', position: 'relative', borderRadius: '0' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color }} />
                    <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'var(--border)' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            50% = neutral midpoint · above = lean progressive · below = lean conservative
          </p>
        </div>

        {/* Most divided */}
        <div style={{ marginBottom: '80px' }}>
          <p className="label" style={{ marginBottom: '32px' }}>{tx(lang, 'most_div')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {top5Controversial.map(({ item, support, controversy }) => {
              const pct = Math.round(support * 100);
              const divPct = Math.round(controversy * 100);
              return (
                <div key={item.id} style={{
                  padding: '20px 0',
                  borderTop: '1px solid var(--divider)',
                  display: 'flex', alignItems: 'center', gap: '20px',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-1)', lineHeight: 1.4, marginBottom: '6px' }}>
                      {item.text[lang] ?? item.text['en']}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '80px', height: '4px', background: 'var(--raised)', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: pct >= 50 ? 'var(--positive)' : 'var(--negative)' }} />
                        <div style={{ position: 'absolute', left: '50%', top: '-2px', width: '1px', height: '8px', background: 'var(--border)' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>{pct}% support</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>
                      {divPct}%
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                      divided
                    </div>
                    <Link href={`/question/${item.id}`} style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textDecoration: 'none', display: 'block', marginTop: '4px' }}>
                      {tx(lang, 'view_q')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strongest consensus */}
        <div style={{ marginBottom: '80px' }}>
          <p className="label" style={{ marginBottom: '32px' }}>{tx(lang, 'most_con')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {top5Consensus.map(({ item, support }) => {
              const pct = Math.round(support * 100);
              const barColor = pct >= 50 ? 'var(--positive)' : 'var(--negative)';
              return (
                <div key={item.id} style={{
                  padding: '20px 0',
                  borderTop: '1px solid var(--divider)',
                  display: 'flex', alignItems: 'center', gap: '20px',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-1)', lineHeight: 1.4, marginBottom: '6px' }}>
                      {item.text[lang] ?? item.text['en']}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: barColor }}>
                      {pct}%
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                      {pct >= 50 ? 'support' : 'oppose'}
                    </div>
                    <Link href={`/question/${item.id}`} style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textDecoration: 'none', display: 'block', marginTop: '4px' }}>
                      {tx(lang, 'view_q')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Country outliers */}
        <div style={{ marginBottom: '80px' }}>
          <p className="label" style={{ marginBottom: '32px' }}>{tx(lang, 'outliers')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {top8Outliers.map(({ code, count, divergence, maxDiff }) => {
              const diffPct = Math.round(maxDiff.diff * 100);
              const isPositive = diffPct > 0;
              return (
                <div key={code} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', padding: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '22px' }}>{flagOf(code)}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-2)', fontWeight: 600 }}>{code}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)' }}>n={count}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                      +{Math.round(divergence * 100)}
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.4, margin: 0 }}>
                    Strongest divergence: <span style={{ color: isPositive ? 'var(--positive)' : 'var(--negative)', fontFamily: 'var(--font-mono)' }}>
                      {isPositive ? '+' : ''}{diffPct}%
                    </span> on {maxDiff.item.text['en']?.slice(0, 40)}…
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '40px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>← Home</Link>
          <Link href="/network" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>Network →</Link>
          <Link href="/compare" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>Compare →</Link>
        </div>

      </div>
    </div>
  );
}
