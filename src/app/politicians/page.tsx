'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { calculatePoliticianDistance } from '@/lib/twin-engine';
import { inferPosition } from '@/lib/inference';
import { AGENDA } from '@/data/agenda';
import { getMyTwin } from '@/lib/db';
import { TwinProfile, PoliticianDistance, TOPICS } from '@/types';
import { useLang } from '@/context/LangContext';
import { t, getTopicLabel } from '@/lib/i18n';

const TRAIN_HINT: Record<string, string> = {
  de: 'Trainiere deinen digitalen Zwilling, um deine persönliche Übereinstimmung zu sehen.',
  en: 'Train your digital twin to see your personal match.',
  es: 'Entrena tu gemelo digital para ver tu coincidencia personal.',
  fr: 'Entraîne ton jumeau numérique pour voir ta correspondance personnelle.',
  pt: 'Treine seu gêmeo digital para ver sua correspondência pessoal.',
  ar: 'درِّب توأمك الرقمي لرؤية مدى توافقك الشخصي.',
  zh: '训练你的数字孪生，查看你的个人匹配度。',
  ja: 'デジタルツインをトレーニングして個人の一致度を確認。',
  hi: 'अपना व्यक्तिगत मिलान देखने के लिए अपना डिजिटल ट्विन प्रशिक्षित करें।',
  ru: 'Обучите своего цифрового двойника, чтобы узнать ваше личное совпадение.',
  id: 'Latih kembaran digital Anda untuk melihat kecocokan pribadi Anda.',
  tr: 'Kişisel eşleşmenizi görmek için dijital ikizinizi eğitin.',
  ko: '개인 일치도를 보려면 디지털 트윈을 훈련하세요.',
  it: 'Addestra il tuo gemello digitale per vedere la tua corrispondenza personale.',
  nl: 'Train je digitale tweeling om je persoonlijke match te zien.',
  pl: 'Wytrenuj swojego cyfrowego bliźniaka, aby zobaczyć swoje osobiste dopasowanie.',
  uk: 'Навчіть свого цифрового двійника, щоб побачити своє особисте збігання.',
  vi: 'Huấn luyện sinh đôi số của bạn để xem mức độ phù hợp cá nhân.',
  bn: 'আপনার ব্যক্তিগত মিলান দেখতে আপনার ডিজিটাল যমজকে প্রশিক্ষণ দিন।',
  fa: 'دوقلوی دیجیتال خود را آموزش دهید تا تطابق شخصی‌تان را ببینید.',
};
const MATCH_HINT: Record<string, string> = {
  de: 'Übereinstimmung mit deinem Zwilling — sortiert nach Nähe',
  en: 'Match with your twin — sorted by closeness',
  es: 'Coincidencia con tu gemelo — ordenada por cercanía',
  fr: 'Correspondance avec ton jumeau — triée par proximité',
  pt: 'Correspondência com seu gêmeo — ordenada por proximidade',
  ar: 'التوافق مع توأمك — مرتب حسب القرب',
  zh: '与你孪生的匹配度——按接近程度排序',
  ja: 'あなたのツインとの一致度 — 近い順',
  hi: 'आपके ट्विन के साथ मिलान — निकटता के क्रम में',
  ru: 'Совпадение с вашим двойником — отсортировано по близости',
  id: 'Kecocokan dengan kembaran Anda — diurutkan berdasarkan kedekatan',
  tr: 'İkizinizle eşleşme — yakınlığa göre sıralı',
  ko: '트윈과의 일치도 — 근접 순으로 정렬',
  it: 'Corrispondenza con il tuo gemello — ordinata per vicinanza',
  nl: 'Overeenkomst met je tweeling — gesorteerd op nabijheid',
  pl: 'Dopasowanie z twoim bliźniakiem — posortowane według bliskości',
  uk: 'Збіг із вашим двійником — відсортовано за близькістю',
  vi: 'Sự phù hợp với sinh đôi của bạn — được sắp xếp theo độ gần',
  bn: 'আপনার যমজের সাথে মিল — নৈকট্য অনুযায়ী সাজানো',
  fa: 'تطابق با دوقلوی شما — مرتب‌شده بر اساس نزدیکی',
};

const PAGE_LABEL: Record<string, string> = {
  de: 'VERGLEICH', en: 'COMPARISON', es: 'COMPARACIÓN', fr: 'COMPARAISON',
  pt: 'COMPARAÇÃO', ar: 'مقارنة', zh: '比较', ja: '比較',
  hi: 'तुलना', ru: 'СРАВНЕНИЕ', id: 'PERBANDINGAN', tr: 'KARŞILAŞTIRMA',
  ko: '비교', it: 'CONFRONTO', nl: 'VERGELIJKING', pl: 'PORÓWNANIE',
  uk: 'ПОРІВНЯННЯ', vi: 'SO SÁNH', bn: 'তুলনা', fa: 'مقایسه',
};
const PAGE_TITLE: Record<string, string> = {
  de: 'Welche politische Ausrichtung passt zu dir?',
  en: 'Which political profile matches yours?',
  es: '¿Qué perfil político se corresponde con el tuyo?',
  fr: 'Quel profil politique correspond au vôtre?',
  pt: 'Qual perfil político combina com o seu?',
  ar: 'أي ملف سياسي يتوافق مع ملفك؟',
  zh: '哪种政治取向与你相符？',
  ja: 'あなたに合う政治的立場は？',
  hi: 'कौन सी राजनीतिक प्रोफ़ाइल आपसे मेल खाती है?',
  ru: 'Какой политический профиль соответствует вашему?',
  id: 'Profil politik mana yang sesuai dengan Anda?',
  tr: 'Hangi siyasi profil sizinle uyuşuyor?',
  ko: '어떤 정치적 성향이 당신과 일치하나요?',
  it: 'Quale profilo politico corrisponde al tuo?',
  nl: 'Welk politiek profiel past bij jou?',
  pl: 'Który profil polityczny pasuje do twojego?',
  uk: 'Який політичний профіль відповідає вашому?',
  vi: 'Hồ sơ chính trị nào phù hợp với bạn?',
  bn: 'কোন রাজনৈতিক প্রোফাইল আপনার সাথে মেলে?',
  fa: 'کدام پروفایل سیاسی با شما مطابقت دارد؟',
};

// ─── Archetypes ──────────────────────────────────────────────────────────────

interface Archetype {
  id: string;
  name: string;
  description: string;
  color: string;
  profile: {
    klimaschutz: number;
    sozialstaat: number;
    wirtschaft: number;
    bildung: number;
    gesundheit: number;
    migration: number;
    freiheit: number;
    europa: number;
  };
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'eco-socialist',
    name: 'Eco-Socialist',
    description: 'Climate first, strong redistribution, post-growth economy',
    color: '#16a34a',
    profile: {
      klimaschutz: 0.95,
      sozialstaat: 0.88,
      wirtschaft: 0.20,
      bildung: 0.90,
      gesundheit: 0.90,
      migration: 0.80,
      freiheit: 0.65,
      europa: 0.85,
    },
  },
  {
    id: 'progressive',
    name: 'Progressive',
    description: 'Strong state, climate action, open society',
    color: '#22c55e',
    profile: {
      klimaschutz: 0.82,
      sozialstaat: 0.78,
      wirtschaft: 0.38,
      bildung: 0.85,
      gesundheit: 0.83,
      migration: 0.72,
      freiheit: 0.72,
      europa: 0.80,
    },
  },
  {
    id: 'social-democrat',
    name: 'Social Democrat',
    description: 'Mixed economy, welfare state, multilateralism',
    color: '#ef4444',
    profile: {
      klimaschutz: 0.65,
      sozialstaat: 0.80,
      wirtschaft: 0.48,
      bildung: 0.78,
      gesundheit: 0.80,
      migration: 0.55,
      freiheit: 0.60,
      europa: 0.72,
    },
  },
  {
    id: 'christian-democrat',
    name: 'Christian Democrat',
    description: 'Social market economy, European integration, traditional values',
    color: '#6b7280',
    profile: {
      klimaschutz: 0.45,
      sozialstaat: 0.52,
      wirtschaft: 0.62,
      bildung: 0.58,
      gesundheit: 0.55,
      migration: 0.35,
      freiheit: 0.50,
      europa: 0.60,
    },
  },
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Free market, national sovereignty, traditional values',
    color: '#94a3b8',
    profile: {
      klimaschutz: 0.32,
      sozialstaat: 0.38,
      wirtschaft: 0.78,
      bildung: 0.48,
      gesundheit: 0.42,
      migration: 0.22,
      freiheit: 0.58,
      europa: 0.32,
    },
  },
  {
    id: 'libertarian',
    name: 'Libertarian',
    description: 'Maximum individual freedom, minimal state, open borders',
    color: '#f59e0b',
    profile: {
      klimaschutz: 0.38,
      sozialstaat: 0.18,
      wirtschaft: 0.92,
      bildung: 0.32,
      gesundheit: 0.22,
      migration: 0.68,
      freiheit: 0.97,
      europa: 0.48,
    },
  },
];

// ─── Real Politicians (estimated from public positions) ───────────────────────
// These are approximations based on documented public policy positions.
// Not official endorsements or scientific measurements.

const REAL_POLITICIANS: Archetype[] = [
  {
    id: 'olaf-scholz',
    name: 'Olaf Scholz',
    description: 'SPD · Germany · Center-left Social Democrat',
    color: '#e4002b',
    profile: { klimaschutz: 0.65, sozialstaat: 0.80, wirtschaft: 0.48, bildung: 0.72, gesundheit: 0.75, migration: 0.42, freiheit: 0.58, europa: 0.75 },
  },
  {
    id: 'friedrich-merz',
    name: 'Friedrich Merz',
    description: 'CDU · Germany · Center-right Christian Democrat',
    color: '#1e3a5f',
    profile: { klimaschutz: 0.45, sozialstaat: 0.50, wirtschaft: 0.72, bildung: 0.58, gesundheit: 0.55, migration: 0.22, freiheit: 0.55, europa: 0.62 },
  },
  {
    id: 'emmanuel-macron',
    name: 'Emmanuel Macron',
    description: 'Renaissance · France · Centrist Liberal',
    color: '#002395',
    profile: { klimaschutz: 0.62, sozialstaat: 0.55, wirtschaft: 0.65, bildung: 0.70, gesundheit: 0.65, migration: 0.45, freiheit: 0.68, europa: 0.90 },
  },
  {
    id: 'donald-trump',
    name: 'Donald Trump',
    description: 'GOP · USA · Nationalist Conservative',
    color: '#bf0a30',
    profile: { klimaschutz: 0.12, sozialstaat: 0.30, wirtschaft: 0.78, bildung: 0.32, gesundheit: 0.28, migration: 0.08, freiheit: 0.65, europa: 0.15 },
  },
  {
    id: 'bernie-sanders',
    name: 'Bernie Sanders',
    description: 'Independent · USA · Progressive Left',
    color: '#1a6ab1',
    profile: { klimaschutz: 0.88, sozialstaat: 0.92, wirtschaft: 0.18, bildung: 0.90, gesundheit: 0.93, migration: 0.65, freiheit: 0.72, europa: 0.38 },
  },
  {
    id: 'giorgia-meloni',
    name: 'Giorgia Meloni',
    description: 'FdI · Italy · National-Conservative',
    color: '#009246',
    profile: { klimaschutz: 0.28, sozialstaat: 0.48, wirtschaft: 0.60, bildung: 0.48, gesundheit: 0.52, migration: 0.10, freiheit: 0.42, europa: 0.35 },
  },
  {
    id: 'javier-milei',
    name: 'Javier Milei',
    description: 'LLA · Argentina · Libertarian',
    color: '#9b59b6',
    profile: { klimaschutz: 0.18, sozialstaat: 0.08, wirtschaft: 0.97, bildung: 0.22, gesundheit: 0.12, migration: 0.72, freiheit: 0.98, europa: 0.22 },
  },
  {
    id: 'narendra-modi',
    name: 'Narendra Modi',
    description: 'BJP · India · Hindu Nationalist',
    color: '#ff9933',
    profile: { klimaschutz: 0.45, sozialstaat: 0.42, wirtschaft: 0.65, bildung: 0.55, gesundheit: 0.50, migration: 0.20, freiheit: 0.38, europa: 0.30 },
  },
  {
    id: 'lula-da-silva',
    name: 'Lula da Silva',
    description: 'PT · Brazil · Left-wing',
    color: '#e81c2e',
    profile: { klimaschutz: 0.72, sozialstaat: 0.82, wirtschaft: 0.28, bildung: 0.80, gesundheit: 0.82, migration: 0.62, freiheit: 0.65, europa: 0.40 },
  },
  {
    id: 'marine-le-pen',
    name: 'Marine Le Pen',
    description: 'RN · France · National-Populist',
    color: '#001f5b',
    profile: { klimaschutz: 0.25, sozialstaat: 0.55, wirtschaft: 0.58, bildung: 0.48, gesundheit: 0.52, migration: 0.08, freiheit: 0.45, europa: 0.22 },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchColor(score: number): string {
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PoliticiansPage() {
  const { lang } = useLang();
  const [userTwin, setUserTwin] = useState<TwinProfile | null>(null);
  const [distances, setDistances] = useState<PoliticianDistance[]>([]);
  const [politicianDistances, setPoliticianDistances] = useState<PoliticianDistance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyTwin().then((twin) => {
      if (twin) {
        const toDistance = (a: Archetype) => calculatePoliticianDistance(twin, {
          id: a.id, name: a.name, party: a.name, partyColor: a.color,
          role: a.description, profile: a.profile, description: a.description,
        });
        setDistances(ARCHETYPES.map(toDistance));
        setPoliticianDistances(REAL_POLITICIANS.map(toDistance));
        setUserTwin(twin);
      }
      setLoading(false);
    });
  }, []);

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--text-3)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
            {({ de: 'Lädt…', en: 'Loading…', es: 'Cargando…', fr: 'Chargement…', pt: 'Carregando…', ar: 'جارٍ التحميل…', zh: '加载中…', ja: '読み込み中…', hi: 'लोड हो रहा है…', ru: 'Загрузка…', id: 'Memuat…', tr: 'Yükleniyor…', ko: '로딩 중…', it: 'Caricamento…', nl: 'Laden…', pl: 'Ładowanie…', uk: 'Завантаження…', vi: 'Đang tải…', bn: 'লোড হচ্ছে…', fa: 'در حال بارگذاری…' } as Record<string, string>)[lang] ?? 'Loading…'}
          </p>
        </div>
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
      gap: '40px',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
        }}>
          {PAGE_LABEL[lang] ?? PAGE_LABEL.en}
        </span>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 4vw, 30px)',
          fontWeight: 600,
          color: 'var(--text-1)',
          margin: 0,
          lineHeight: 1.2,
        }}>
          {PAGE_TITLE[lang] ?? PAGE_TITLE.en}
        </h2>
        {!userTwin && (
          <p style={{ color: 'var(--text-3)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
            {TRAIN_HINT[lang] ?? TRAIN_HINT.en}{' '}
            <Link href="/training" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {t(lang, 'nav_create')} →
            </Link>
          </p>
        )}
        {userTwin && (
          <p style={{ color: 'var(--text-3)', fontSize: '14px', margin: 0 }}>
            {MATCH_HINT[lang] ?? MATCH_HINT.en}
          </p>
        )}
      </div>

      {/* ── Without twin: static archetype cards ── */}
      {!userTwin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ARCHETYPES.map((a) => (
            <ArchetypeCard key={a.id} archetype={a} userTwin={null} lang={lang} />
          ))}
        </div>
      )}

      {/* ── With twin: ranked archetype cards ── */}
      {userTwin && distances.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[...distances]
            .sort((a, b) => a.totalDistance - b.totalDistance)
            .map((dist) => {
              const archetype = ARCHETYPES.find((a) => a.id === dist.politician.id)!;
              return (
                <ArchetypeCard
                  key={archetype.id}
                  archetype={archetype}
                  userTwin={userTwin}
                  distance={dist}
                  lang={lang}
                />
              );
            })}
        </div>
      )}

      {/* ── Agenda top match ── */}
      {userTwin && politicianDistances.length > 0 && (() => {
        const bestDist = [...politicianDistances].sort((a, b) => a.totalDistance - b.totalDistance)[0];
        const bestPol = REAL_POLITICIANS.find(p => p.id === bestDist.politician.id)!;
        const myPositions = AGENDA.map(item => inferPosition(userTwin, item));
        const polPositions = AGENDA.map(item => inferPosition(bestPol.profile, item));
        const agreements = AGENDA.map((item, i) => ({
          item,
          agree: (myPositions[i].score >= 0.5) === (polPositions[i].score >= 0.5),
          myScore: myPositions[i].score,
          polScore: polPositions[i].score,
          gap: Math.abs(myPositions[i].score - polPositions[i].score),
        }));
        const topAgree = agreements.filter(a => a.agree).sort((a, b) => a.gap - b.gap).slice(0, 3);
        const topDisagree = agreements.filter(a => !a.agree).sort((a, b) => b.gap - a.gap).slice(0, 2);
        const agreedCount = agreements.filter(a => a.agree).length;
        const agreeLabel = ({ de: 'Engste Politikerübereinstimmung', en: 'Closest politician match', es: 'Mejor coincidencia política', fr: 'Correspondance politique la plus proche', pt: 'Melhor correspondência política', ar: 'أقرب تطابق سياسي', zh: '最接近的政治家匹配', ja: '最も近い政治家', hi: 'सबसे करीबी राजनेता', ru: 'Ближайший политический деятель', id: 'Politikus paling cocok', tr: 'En yakın politikacı eşleşmesi', ko: '가장 가까운 정치인', it: 'Politico più vicino', nl: 'Dichtstbijzijnde politicus', pl: 'Najbliższy polityk', uk: 'Найближчий політик', vi: 'Chính trị gia gần nhất', bn: 'নিকটতম রাজনীতিবিদ', fa: 'نزدیک‌ترین تطابق سیاسی' } as Record<string, string>)[lang] ?? 'Closest politician match';
        return (
          <div style={{ background: 'var(--surface)', border: `1px solid ${bestPol.color}44`, padding: '28px', marginBottom: '8px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: bestPol.color, marginBottom: '12px' }}>
              🎯 {agreeLabel}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 700, color: 'var(--text-1)' }}>
                {bestPol.name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: bestPol.color }}>
                {agreedCount}/{AGENDA.length} {({ de: 'Fragen einig', en: 'questions aligned', es: 'preguntas de acuerdo', fr: 'questions alignées', pt: 'perguntas alinhadas', ar: 'سؤال متوافق', zh: '问题一致', ja: '一致', hi: 'सवाल पर एकमत', ru: 'вопросов совпадают', id: 'pertanyaan selaras', tr: 'soru uyumlu', ko: '질문 일치', it: 'domande allineate', nl: 'vragen gealigneerd', pl: 'pytań zgodnych', uk: 'питань збігаються', vi: 'câu hỏi đồng thuận', bn: 'প্রশ্ন একমত', fa: 'سؤال هماهنگ' } as Record<string, string>)[lang] ?? 'questions aligned'}
              </div>
            </div>
            {topAgree.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--positive)', textTransform: 'uppercase', marginBottom: '8px' }}>✓ Top agreements</p>
                {topAgree.map(({ item }) => (
                  <div key={item.id} style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, padding: '4px 0', borderTop: '1px solid var(--divider)' }}>
                    <Link href={`/question/${item.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {item.text[lang] ?? item.text['en']}
                    </Link>
                  </div>
                ))}
              </div>
            )}
            {topDisagree.length > 0 && (
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--negative)', textTransform: 'uppercase', marginBottom: '8px' }}>✗ Disagree on</p>
                {topDisagree.map(({ item }) => (
                  <div key={item.id} style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5, padding: '4px 0', borderTop: '1px solid var(--divider)' }}>
                    <Link href={`/question/${item.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {item.text[lang] ?? item.text['en']}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Real politicians (estimated) ── */}
      <div>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', margin: '0 0 4px' }}>
            {({ de: 'Echte Politiker — Schätzung', en: 'Real Politicians — Estimated', es: 'Políticos reales — estimado', fr: 'Vrais politiciens — estimé', pt: 'Políticos reais — estimado', ar: 'سياسيون حقيقيون — تقديري', zh: '真实政治家 — 估算', ja: 'リアル政治家 — 推定', hi: 'वास्तविक राजनेता — अनुमानित', ru: 'Реальные политики — оценка', id: 'Politisi nyata — estimasi', tr: 'Gerçek politikacılar — tahmini', ko: '실제 정치인 — 추정', it: 'Politici reali — stimato', nl: 'Echte politici — geschat', pl: 'Prawdziwi politycy — szacunek', uk: 'Реальні політики — оцінка', vi: 'Chính trị gia thực — ước tính', bn: 'বাস্তব রাজনীতিবিদ — অনুমানিত', fa: 'سیاستمداران واقعی — تخمینی' } as Record<string, string>)[lang] ?? 'Real Politicians — Estimated'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0, fontStyle: 'italic' }}>
            {({ de: 'Basierend auf öffentlich dokumentierten Positionen und Abstimmungsverhalten. Keine wissenschaftliche Messung.', en: 'Based on publicly documented positions and voting records. Not a scientific measurement.', es: 'Basado en posiciones documentadas públicamente y registros de votación. No es una medición científica.', fr: 'Basé sur des positions documentées publiquement et les votes. Pas une mesure scientifique.', pt: 'Baseado em posições documentadas publicamente. Não é uma medição científica.', ar: 'استناداً إلى المواقف الموثقة علنياً. ليس قياسًا علميًا.', zh: '基于公开记录的立场和投票记录。非科学测量。', ja: '公開記録に基づく推定。科学的測定ではありません。', hi: 'सार्वजनिक रूप से दर्ज की गई स्थितियों पर आधारित। वैज्ञानिक माप नहीं।', ru: 'На основе публично задокументированных позиций. Не научное измерение.', id: 'Berdasarkan posisi yang terdokumentasi publik. Bukan pengukuran ilmiah.', tr: 'Kamuoyuna belgelenmiş pozisyonlara dayanmaktadır. Bilimsel ölçüm değildir.', ko: '공개적으로 문서화된 입장에 기반합니다. 과학적 측정이 아닙니다.', it: 'Basato su posizioni documentate pubblicamente. Non una misurazione scientifica.', nl: 'Gebaseerd op openbaar gedocumenteerde standpunten. Geen wetenschappelijke meting.', pl: 'Na podstawie publicznie udokumentowanych stanowisk. Nie jest to pomiar naukowy.', uk: 'На основі публічно задокументованих позицій. Не наукове вимірювання.', vi: 'Dựa trên lập trường được ghi lại công khai. Không phải đo lường khoa học.', bn: 'সর্বজনীনভাবে নথিভুক্ত অবস্থানের ভিত্তিতে। বৈজ্ঞানিক পরিমাপ নয়।', fa: 'بر اساس موضع‌های مستند عمومی. یک اندازه‌گیری علمی نیست.' } as Record<string, string>)[lang] ?? 'Based on publicly documented positions and voting records. Not a scientific measurement.'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!userTwin && REAL_POLITICIANS.map(p => (
            <ArchetypeCard key={p.id} archetype={p} userTwin={null} lang={lang} />
          ))}
          {userTwin && politicianDistances.length > 0 && [...politicianDistances]
            .sort((a, b) => a.totalDistance - b.totalDistance)
            .map(dist => {
              const politician = REAL_POLITICIANS.find(p => p.id === dist.politician.id)!;
              return (
                <ArchetypeCard key={politician.id} archetype={politician} userTwin={userTwin} distance={dist} lang={lang} />
              );
            })
          }
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', margin: 0 }}>
          {({ de: 'Methodik', en: 'Methodology', es: 'Metodología', fr: 'Méthodologie', pt: 'Metodologia', ar: 'منهجية', zh: '方法论', ja: '手法', hi: 'पद्धति', ru: 'Методология', id: 'Metodologi', tr: 'Metodoloji', ko: '방법론', it: 'Metodologia', nl: 'Methodologie', pl: 'Metodologia', uk: 'Методологія', vi: 'Phương pháp', bn: 'পদ্ধতিবিদ্যা', fa: 'روش‌شناسی' } as Record<string, string>)[lang] ?? 'Methodology'}
        </p>
        <p style={{ color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
          {({ de: 'Für jedes der 8 Themen wird der Abstand zwischen deiner Position und dem Archetyp berechnet. Der Durchschnitt aller Abstände ergibt den Übereinstimmungswert. Die Archetypen sind idealtypische politische Positionen — keine echten Politiker.', en: 'For each of the 8 topics, the distance between your position and the archetype is calculated. The average of all distances gives the match score. Archetypes are ideal-type political positions — not real politicians.', es: 'Para cada uno de los 8 temas, se calcula la distancia entre tu posición y el arquetipo. El promedio de todas las distancias da la puntuación de coincidencia. Los arquetipos son posiciones políticas ideales, no políticos reales.', fr: 'Pour chacun des 8 thèmes, la distance entre ta position et l\'archétype est calculée. La moyenne de toutes les distances donne le score de correspondance. Les archétypes sont des positions politiques idéaux-types — pas de vrais politiciens.', pt: 'Para cada um dos 8 temas, a distância entre sua posição e o arquétipo é calculada. A média de todas as distâncias dá a pontuação de correspondência. Os arquétipos são posições políticas de tipo ideal — não políticos reais.', ar: 'لكل موضوع من المواضيع الـ8، يُحسب المسافة بين موقفك وموقف النموذج. متوسط جميع المسافات يعطي درجة التطابق. النماذج هي مواقف سياسية نموذجية — ليست سياسيين حقيقيين.', zh: '对于8个话题中的每一个，计算您的立场与原型之间的距离。所有距离的平均值给出匹配分数。原型是理想型政治立场——不是真实的政治家。', ja: '8つのトピックそれぞれについて、あなたの立場とアーキタイプの距離が計算されます。すべての距離の平均がマッチスコアになります。アーキタイプは理想型の政治的立場です—実際の政治家ではありません。', hi: '8 विषयों में से प्रत्येक के लिए, आपकी स्थिति और आदर्श-प्रकार के बीच की दूरी की गणना की जाती है। सभी दूरियों का औसत मिलान स्कोर देता है। आदर्श-प्रकार राजनीतिक स्थितियां हैं — वास्तविक राजनेता नहीं।', ru: 'Для каждой из 8 тем рассчитывается расстояние между вашей позицией и архетипом. Среднее значение всех расстояний даёт оценку совпадения. Архетипы — идеально-типичные политические позиции, а не реальные политики.' } as Record<string, string>)[lang] ?? 'For each of the 8 topics, the distance between your position and the archetype is calculated. The average of all distances gives the match score. Archetypes are ideal-type political positions — not real politicians.'}
        </p>
      </div>
    </div>
  );
}

// ─── ArchetypeCard ────────────────────────────────────────────────────────────

const MATCH_LABEL: Record<string, string> = {
  de: 'Übereinstimmung', en: 'match', es: 'coincidencia', fr: 'correspondance', pt: 'correspondência',
  ar: 'تطابق', zh: '匹配', ja: '一致', hi: 'मिलान', ru: 'совпадение',
  id: 'kecocokan', tr: 'eşleşme', ko: '일치도', it: 'corrispondenza', nl: 'overeenkomst',
  pl: 'dopasowanie', uk: 'збіг', vi: 'phù hợp', bn: 'মিলান', fa: 'تطابق',
};

function ArchetypeCard({
  archetype,
  userTwin,
  distance,
  lang,
}: {
  archetype: Archetype;
  userTwin: TwinProfile | null;
  distance?: PoliticianDistance;
  lang: string;
}) {
  const matchScore = distance ? Math.round((1 - distance.totalDistance) * 100) : null;
  const scoreColor = matchScore !== null ? matchColor(matchScore) : undefined;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: archetype.color,
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--text-1)',
            }}>
              {archetype.name}
            </span>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0, paddingLeft: '18px' }}>
            {archetype.description}
          </p>
        </div>

        {/* Match score badge */}
        {matchScore !== null && (
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <span style={{
              fontSize: '24px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: scoreColor,
              lineHeight: 1,
            }}>
              {matchScore}%
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', letterSpacing: '0.04em' }}>
              {MATCH_LABEL[lang] ?? MATCH_LABEL.en}
            </div>
          </div>
        )}
      </div>

      {/* Topic bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {TOPICS.map((topic) => {
          const archetypeValue = archetype.profile[topic];
          const userValue = userTwin ? userTwin[topic] : null;
          const archetypePct = Math.round(archetypeValue * 100);

          return (
            <div key={topic} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {/* Label row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-3)',
                  letterSpacing: '0.02em',
                }}>
                  {getTopicLabel(topic, lang)}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-3)',
                }}>
                  {archetypePct}
                </span>
              </div>

              {/* Bar track */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '4px',
                background: 'var(--raised)',
                borderRadius: '2px',
                overflow: 'visible',
              }}>
                {/* Archetype fill */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${archetypePct}%`,
                  background: 'var(--border)',
                  borderRadius: '2px',
                }} />
                {/* User marker */}
                {userValue !== null && (
                  <div style={{
                    position: 'absolute',
                    top: '-3px',
                    left: `calc(${Math.round(userValue * 100)}% - 5px)`,
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    border: '2px solid var(--bg)',
                    zIndex: 1,
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend (only with twin) */}
      {userTwin && (
        <div style={{ display: 'flex', gap: '20px', paddingTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '4px', background: 'var(--border)', borderRadius: '2px' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{archetype.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{({ de: 'Du', en: 'You', es: 'Tú', fr: 'Toi', pt: 'Tu', ar: 'أنت', zh: '你', ja: 'あなた', hi: 'आप', ru: 'Вы', id: 'Anda', tr: 'Sen', ko: '당신', it: 'Tu', nl: 'Jij', pl: 'Ty', uk: 'Ви', vi: 'Bạn', bn: 'আপনি', fa: 'شما' } as Record<string, string>)[lang] ?? 'You'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
