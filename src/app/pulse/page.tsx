'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMyTwin, saveMyTwin } from '@/lib/db';
import { classifyTwin, type ArchetypeKey } from '@/lib/twin-engine';
import { useLang } from '@/context/LangContext';
import type { TwinProfile, TwinValues, TopicKey } from '@/types';

// ── Topics ────────────────────────────────────────────────────────────────────

const TOPICS: TopicKey[] = [
  'klimaschutz', 'sozialstaat', 'wirtschaft', 'bildung',
  'gesundheit', 'migration', 'freiheit', 'europa',
];

const T_LABEL: Record<TopicKey, string> = {
  klimaschutz: 'KLIMA', sozialstaat: 'SOZIAL', wirtschaft: 'WIRTSCHAFT',
  bildung: 'BILDUNG', gesundheit: 'HEALTH', migration: 'MIGRATION',
  freiheit: 'FREIHEIT', europa: 'WELT',
};

const A_LABEL: Record<ArchetypeKey, Record<string, string>> = {
  progressive:  { de: 'Progressiv',     en: 'Progressive'    },
  socialdem:    { de: 'Sozialdemokrat', en: 'Social Democrat' },
  liberal:      { de: 'Liberal',        en: 'Liberal'        },
  conservative: { de: 'Konservativ',    en: 'Conservative'   },
  libertarian:  { de: 'Libertär',       en: 'Libertarian'    },
  centrist:     { de: 'Zentrist',       en: 'Centrist'       },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Delta = Partial<Record<TopicKey, number>>;

interface SituationCard {
  type: 'situation';
  id: string;
  text: Record<string, string>;
  options: Array<{ text: Record<string, string>; delta: Delta }>;
}

interface CompareCard {
  type: 'compare';
  id: string;
  a: Record<string, string>;
  b: Record<string, string>;
  deltaA: Delta;
  deltaB: Delta;
}

type Card = SituationCard | CompareCard;

// ── Training cards ────────────────────────────────────────────────────────────

const CARDS: Card[] = [
  {
    type: 'situation', id: 's1',
    text: {
      de: 'Ein Kind aus ärmerer Familie bekommt strukturell schlechtere Bildung.',
      en: 'A child from a poorer family structurally receives worse education.',
    },
    options: [
      { text: { de: 'Der Staat gleicht das aktiv aus', en: 'The state actively compensates' }, delta: { bildung: 0.06, sozialstaat: 0.04 } },
      { text: { de: 'Familien tragen die Verantwortung', en: 'Families bear responsibility' }, delta: { bildung: -0.05, sozialstaat: -0.03 } },
      { text: { de: 'Private Schulen lösen das durch Wettbewerb', en: 'Private schools solve it through competition' }, delta: { wirtschaft: 0.04, bildung: -0.02 } },
    ],
  },
  {
    type: 'situation', id: 's2',
    text: {
      de: 'Ein Unternehmen erfüllt alle Gesetze — verursacht aber nachweislich Klimaschäden.',
      en: 'A company follows all laws — but demonstrably causes climate damage.',
    },
    options: [
      { text: { de: 'Strengere Gesetze sofort', en: 'Stricter laws immediately' }, delta: { klimaschutz: 0.07, wirtschaft: -0.04 } },
      { text: { de: 'Wenn legal, kein Eingriff', en: 'If legal, no intervention' }, delta: { wirtschaft: 0.06, klimaschutz: -0.05 } },
      { text: { de: 'CO₂-Steuer statt Verbote', en: 'Carbon tax instead of bans' }, delta: { klimaschutz: 0.04, wirtschaft: -0.01 } },
    ],
  },
  {
    type: 'situation', id: 's3',
    text: {
      de: 'Der Staat kann entweder die Rente erhöhen oder in Klimaschutz investieren. Nicht beides.',
      en: 'The state can either raise pensions or invest in climate. Not both.',
    },
    options: [
      { text: { de: 'Rente erhöhen', en: 'Raise pensions' }, delta: { sozialstaat: 0.07, klimaschutz: -0.04 } },
      { text: { de: 'Klima priorisieren', en: 'Prioritize climate' }, delta: { klimaschutz: 0.07, sozialstaat: -0.04 } },
      { text: { de: 'Schulden für beides', en: 'Debt to fund both' }, delta: { wirtschaft: -0.04, sozialstaat: 0.02, klimaschutz: 0.02 } },
    ],
  },
  {
    type: 'situation', id: 's4',
    text: {
      de: 'Eine Überwachungskamera verhindert täglich Verbrechen — filmt aber jeden auf der Straße.',
      en: 'A surveillance camera prevents crime daily — but films everyone on the street.',
    },
    options: [
      { text: { de: 'Sicherheit geht vor', en: 'Security comes first' }, delta: { freiheit: -0.07, gesundheit: 0.02 } },
      { text: { de: 'Privatsphäre ist ein Grundrecht', en: 'Privacy is a fundamental right' }, delta: { freiheit: 0.08 } },
      { text: { de: 'Nur mit strikter rechtlicher Kontrolle', en: 'Only with strict legal oversight' }, delta: { freiheit: 0.03 } },
    ],
  },
  {
    type: 'situation', id: 's5',
    text: {
      de: 'Ein Pharmaunternehmen entwickelt ein lebensrettendes Medikament — und setzt einen sehr hohen Preis.',
      en: 'A pharma company develops a life-saving drug — and sets a very high price.',
    },
    options: [
      { text: { de: 'Staat kauft Lizenz und macht es günstig', en: 'State buys license, makes it affordable' }, delta: { gesundheit: 0.07, wirtschaft: -0.04 } },
      { text: { de: 'Markt regelt das langfristig', en: 'Market regulates it long-term' }, delta: { wirtschaft: 0.06, gesundheit: -0.05 } },
      { text: { de: 'Preisdeckel, kein Lizenzkauf', en: 'Price cap, no license purchase' }, delta: { gesundheit: 0.04, wirtschaft: -0.02 } },
    ],
  },
  {
    type: 'situation', id: 's6',
    text: {
      de: 'Dein Land könnte der EU mehr Souveränität abgeben — und dafür mehr globalen Einfluss gewinnen.',
      en: 'Your country could give the EU more sovereignty — and gain more global influence.',
    },
    options: [
      { text: { de: 'Ja — gemeinsam stärker', en: 'Yes — stronger together' }, delta: { europa: 0.08 } },
      { text: { de: 'Nein — nationale Souveränität zuerst', en: 'No — national sovereignty first' }, delta: { europa: -0.07, freiheit: 0.02 } },
      { text: { de: 'Nur in bestimmten Bereichen', en: 'Only in specific areas' }, delta: { europa: 0.03 } },
    ],
  },
  {
    type: 'situation', id: 's7',
    text: {
      de: 'Ein obdachloser Mensch schläft jeden Abend vor einem Supermarkt. Der Supermarkt will ihn wegweisen.',
      en: 'A homeless person sleeps every evening outside a supermarket. The owner wants them removed.',
    },
    options: [
      { text: { de: 'Der Supermarkt hat das Recht dazu', en: 'The supermarket has the right to do so' }, delta: { wirtschaft: 0.04, sozialstaat: -0.05 } },
      { text: { de: 'Die Stadt muss helfen und eingreifen', en: 'The city must intervene and help' }, delta: { sozialstaat: 0.07, wirtschaft: -0.02 } },
      { text: { de: 'Freiwillige Organisationen sollen das lösen', en: 'Volunteer organizations should solve this' }, delta: { sozialstaat: 0.02, wirtschaft: 0.02 } },
    ],
  },
  {
    type: 'situation', id: 's8',
    text: {
      de: 'Eine KI erkennt Krebs früher als Ärzte — muss aber alle Patientendaten auswerten.',
      en: 'An AI detects cancer earlier than doctors — but must analyze all patient data.',
    },
    options: [
      { text: { de: 'Ja — Leben retten hat Vorrang', en: 'Yes — saving lives takes priority' }, delta: { gesundheit: 0.07, freiheit: -0.05 } },
      { text: { de: 'Nein — Datenschutz ist unverhandelbar', en: 'No — data protection is non-negotiable' }, delta: { freiheit: 0.07, gesundheit: -0.04 } },
      { text: { de: 'Nur mit Einwilligung jedes Patienten', en: 'Only with each patient\'s explicit consent' }, delta: { freiheit: 0.04, gesundheit: 0.02 } },
    ],
  },
  {
    type: 'compare', id: 'c1',
    a: { de: 'Kostenfreie Uni\nfür alle', en: 'Free university\nfor everyone' },
    b: { de: 'Studiengebühren\n+ Stipendien', en: 'Tuition fees\n+ scholarships' },
    deltaA: { bildung: 0.07, sozialstaat: 0.04 },
    deltaB: { wirtschaft: 0.05, bildung: -0.04 },
  },
  {
    type: 'compare', id: 'c2',
    a: { de: 'Verbrenner-Verbot\nab 2035', en: 'Combustion engine\nban from 2035' },
    b: { de: 'Kein Verbot —\nTechnologiefreiheit', en: 'No ban —\ntechnology freedom' },
    deltaA: { klimaschutz: 0.08, wirtschaft: -0.04 },
    deltaB: { wirtschaft: 0.06, klimaschutz: -0.06 },
  },
  {
    type: 'compare', id: 'c3',
    a: { de: 'Universelle\nKrankenversicherung', en: 'Universal\nhealth insurance' },
    b: { de: 'Private Versicherung\n+ Staatshilfe', en: 'Private insurance\n+ state aid' },
    deltaA: { gesundheit: 0.08, sozialstaat: 0.04 },
    deltaB: { wirtschaft: 0.05, gesundheit: -0.04 },
  },
  {
    type: 'compare', id: 'c4',
    a: { de: 'Offene Grenzen\n+ Integration', en: 'Open borders\n+ integration' },
    b: { de: 'Strenge Kontrolle\n+ Qualifikation', en: 'Strict control\n+ skills filter' },
    deltaA: { migration: 0.08, europa: 0.03 },
    deltaB: { migration: -0.07, wirtschaft: 0.02 },
  },
  {
    type: 'compare', id: 'c5',
    a: { de: 'Mehr Kameras\nund Überwachung', en: 'More cameras\nand surveillance' },
    b: { de: 'Ende der\nMassenüberwachung', en: 'End of\nmass surveillance' },
    deltaA: { freiheit: -0.07, gesundheit: 0.02 },
    deltaB: { freiheit: 0.08 },
  },
  {
    type: 'compare', id: 'c6',
    a: { de: 'EU-Armee\n+ gemeinsame Steuern', en: 'EU army\n+ common taxes' },
    b: { de: 'Nationale Armeen\n+ Steuerhoheit', en: 'National armies\n+ tax sovereignty' },
    deltaA: { europa: 0.08 },
    deltaB: { europa: -0.07, freiheit: 0.02 },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }

function applyDelta(v: TwinValues, d: Delta): TwinValues {
  return {
    klimaschutz: clamp01(v.klimaschutz + (d.klimaschutz ?? 0)),
    sozialstaat: clamp01(v.sozialstaat + (d.sozialstaat ?? 0)),
    wirtschaft:  clamp01(v.wirtschaft  + (d.wirtschaft  ?? 0)),
    bildung:     clamp01(v.bildung     + (d.bildung     ?? 0)),
    gesundheit:  clamp01(v.gesundheit  + (d.gesundheit  ?? 0)),
    migration:   clamp01(v.migration   + (d.migration   ?? 0)),
    freiheit:    clamp01(v.freiheit    + (d.freiheit    ?? 0)),
    europa:      clamp01(v.europa      + (d.europa      ?? 0)),
  };
}

function todayCardIndex(): number {
  return Math.floor(Date.now() / 86_400_000) % CARDS.length;
}

function loadStreak(): { streak: number; trainedToday: boolean } {
  if (typeof window === 'undefined') return { streak: 0, trainedToday: false };
  try {
    const raw = localStorage.getItem('nk-pulse-streak');
    if (!raw) return { streak: 0, trainedToday: false };
    const { lastDate, streak } = JSON.parse(raw) as { lastDate: string; streak: number };
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (lastDate === today) return { streak, trainedToday: true };
    if (lastDate === yesterday) return { streak, trainedToday: false };
    return { streak: 0, trainedToday: false };
  } catch { return { streak: 0, trainedToday: false }; }
}

function saveStreak(streak: number) {
  localStorage.setItem('nk-pulse-streak', JSON.stringify({
    lastDate: new Date().toISOString().slice(0, 10),
    streak,
  }));
}

// ── Symbol ────────────────────────────────────────────────────────────────────

function TwinSymbol({ twin, size, pulsing }: { twin: TwinValues; size: number; pulsing: boolean }) {
  const cx = size / 2;
  const cy = size / 2;
  const minR = size * 0.13;
  const maxR = size * 0.37;
  const labelR = maxR + size * 0.085;

  const pts = TOPICS.map((key, i) => {
    const angle = (i / 8) * 2 * Math.PI - Math.PI / 2;
    const r = minR + twin[key] * (maxR - minR);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), key, angle };
  });

  const poly = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {/* guide rings */}
      <circle cx={cx} cy={cy} r={maxR} fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 7" />
      <circle cx={cx} cy={cy} r={minR + (maxR - minR) * 0.5} fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="1 9" />
      {/* spokes */}
      {pts.map((p, i) => (
        <line key={i}
          x1={cx} y1={cy}
          x2={cx + maxR * Math.cos(p.angle)}
          y2={cy + maxR * Math.sin(p.angle)}
          stroke="var(--border)" strokeWidth="0.5"
        />
      ))}
      {/* shape */}
      <polygon
        points={poly}
        fill={pulsing ? 'rgba(26,26,140,0.15)' : 'rgba(26,26,140,0.05)'}
        stroke="var(--text-1)"
        strokeWidth="1.5"
        strokeLinejoin="miter"
        style={{ transition: 'fill 0.6s ease' }}
      />
      {/* vertex marks */}
      {pts.map((p, i) => (
        <rect key={i}
          x={p.x - 3} y={p.y - 3} width={6} height={6}
          fill={pulsing ? 'var(--accent)' : 'var(--text-1)'}
          style={{ transition: 'fill 0.6s ease' }}
        />
      ))}
      {/* dimension labels */}
      {pts.map((p, i) => (
        <text key={i}
          x={cx + labelR * Math.cos(p.angle)}
          y={cy + labelR * Math.sin(p.angle)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7.5"
          fontFamily="ui-monospace, monospace"
          fill="var(--text-3)"
          letterSpacing="0.08"
        >
          {T_LABEL[p.key]}
        </text>
      ))}
    </svg>
  );
}

// ── Card components ───────────────────────────────────────────────────────────

function SituationView({
  card, lang, onAnswer, onSkip,
}: {
  card: SituationCard;
  lang: string;
  onAnswer: (d: Delta) => void;
  onSkip: () => void;
}) {
  const txt = (r: Record<string, string>) => r[lang] ?? r.en ?? r.de ?? '';

  return (
    <div>
      <div className="label" style={{ marginBottom: '16px' }}>SITUATION</div>
      <p style={{
        fontFamily: 'var(--font-serif)', fontSize: '1.05rem',
        color: 'var(--text-1)', lineHeight: 1.55, marginBottom: '28px',
      }}>
        {txt(card.text)}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {card.options.map((opt, i) => (
          <OptionButton key={i} onClick={() => onAnswer(opt.delta)}>
            {txt(opt.text)}
          </OptionButton>
        ))}
      </div>
      <SkipButton onClick={onSkip} lang={lang} />
    </div>
  );
}

function CompareView({
  card, lang, onAnswer, onSkip,
}: {
  card: CompareCard;
  lang: string;
  onAnswer: (d: Delta) => void;
  onSkip: () => void;
}) {
  const txt = (r: Record<string, string>) => r[lang] ?? r.en ?? r.de ?? '';

  return (
    <div>
      <div className="label" style={{ marginBottom: '16px' }}>VERGLEICH</div>
      <p style={{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '24px', fontFamily: 'var(--font-mono)' }}>
        {lang === 'de' ? 'Was würdest du eher wählen?' : 'Which would you rather choose?'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <CompareButton onClick={() => onAnswer(card.deltaA)}>
          {txt(card.a)}
        </CompareButton>
        <CompareButton onClick={() => onAnswer(card.deltaB)}>
          {txt(card.b)}
        </CompareButton>
      </div>
      <SkipButton onClick={onSkip} lang={lang} />
    </div>
  );
}

function OptionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'var(--surface)' : 'none',
        border: `1px solid ${hov ? 'var(--text-3)' : 'var(--border)'}`,
        color: 'var(--text-1)', padding: '14px 20px',
        textAlign: 'left', fontFamily: 'var(--font-sans)',
        fontSize: '14px', cursor: 'pointer', lineHeight: 1.4,
        transition: 'border-color 0.12s, background 0.12s',
        width: '100%',
      }}
    >
      {children}
    </button>
  );
}

function CompareButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'var(--surface)' : 'none',
        border: `1px solid ${hov ? 'var(--text-3)' : 'var(--border)'}`,
        color: 'var(--text-1)', padding: '24px 16px',
        fontFamily: 'var(--font-sans)', fontSize: '14px',
        cursor: 'pointer', lineHeight: 1.5,
        whiteSpace: 'pre-line', textAlign: 'center',
        transition: 'border-color 0.12s, background 0.12s',
        width: '100%',
      }}
    >
      {children}
    </button>
  );
}

function SkipButton({ onClick, lang }: { onClick: () => void; lang: string }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none',
      color: 'var(--text-3)', fontSize: '11px',
      fontFamily: 'var(--font-mono)', cursor: 'pointer',
      letterSpacing: '0.1em', padding: '4px 0',
    }}>
      {lang === 'de' ? 'ÜBERSPRINGEN →' : 'SKIP →'}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PulsePage() {
  const router = useRouter();
  const { lang } = useLang();

  const [twin, setTwin] = useState<TwinProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notwin'>('loading');
  const [pulsing, setPulsing] = useState(false);
  const [cardIdx, setCardIdx] = useState(todayCardIndex);
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [trainedToday, setTrainedToday] = useState(false);

  useEffect(() => {
    getMyTwin()
      .then(t => {
        if (!t) { setStatus('notwin'); return; }
        setTwin(t);
        const s = loadStreak();
        setStreak(s.streak);
        setTrainedToday(s.trainedToday);
        setStatus('ready');
      })
      .catch(() => setStatus('notwin'));
  }, []);

  const handleAnswer = useCallback(async (delta: Delta) => {
    if (!twin) return;
    const newValues = applyDelta(twin, delta);
    const newTwin: TwinProfile = { ...twin, ...newValues, updatedAt: new Date().toISOString() };
    await saveMyTwin(newTwin);
    setTwin(newTwin);
    setPulsing(true);
    setTimeout(() => setPulsing(false), 700);
    setAnswered(n => n + 1);
    if (!trainedToday) {
      const newStreak = streak + 1;
      saveStreak(newStreak);
      setStreak(newStreak);
      setTrainedToday(true);
    }
    // advance to next card after brief pause
    setTimeout(() => setCardIdx(i => (i + 1) % CARDS.length), 400);
  }, [twin, streak, trainedToday]);

  const handleSkip = useCallback(() => {
    setCardIdx(i => (i + 1) % CARDS.length);
  }, []);

  if (status === 'loading') return (
    <main id="main-content">
      <div className="container" style={{ maxWidth: '580px', paddingTop: '80px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em' }}>
          …
        </div>
      </div>
    </main>
  );

  if (status === 'notwin' || !twin) return (
    <main id="main-content">
      <div className="container" style={{ maxWidth: '580px', paddingTop: '80px' }}>
        <div className="label" style={{ marginBottom: '20px' }}>DEIN ZWILLING</div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-1)', marginBottom: '32px' }}>
          Du hast noch keinen Zwilling erstellt.
        </p>
        <a href="/training" style={{
          display: 'inline-block', border: '1px solid var(--text-1)',
          color: 'var(--text-1)', padding: '12px 28px',
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          letterSpacing: '0.1em', textDecoration: 'none',
        }}>
          ZWILLING ERSTELLEN →
        </a>
      </div>
    </main>
  );

  const archetype = classifyTwin(twin);
  const card = CARDS[cardIdx];

  const streakLabel = lang === 'de'
    ? `${streak} ${streak === 1 ? 'Tag' : 'Tage'} in Folge`
    : `${streak} ${streak === 1 ? 'day' : 'days'} in a row`;

  return (
    <main id="main-content">
      <div className="container" style={{ maxWidth: '580px', paddingTop: '52px', paddingBottom: '80px' }}>

        {/* Symbol */}
        <section style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="label" style={{ marginBottom: '20px', letterSpacing: '0.16em' }}>
            {lang === 'de' ? 'DEIN ZWILLING' : 'YOUR TWIN'}
          </div>

          <div style={{ display: 'inline-block', position: 'relative' }}>
            <TwinSymbol twin={twin} size={260} pulsing={pulsing} />
          </div>

          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: '1.4rem',
            color: 'var(--text-1)', marginTop: '4px', letterSpacing: '-0.01em',
          }}>
            {A_LABEL[archetype]?.[lang] ?? A_LABEL[archetype]?.en}
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            color: 'var(--text-3)', marginTop: '10px', letterSpacing: '0.06em',
          }}>
            {streak > 0 && streakLabel}
            {streak > 0 && trainedToday && ' · ✓'}
            {streak === 0 && answered > 0 && (lang === 'de' ? 'Heute gestartet' : 'Started today')}
          </div>
        </section>

        <hr style={{ marginBottom: '40px' }} />

        {/* Training */}
        <section>
          {answered > 0 && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--text-3)', marginBottom: '24px', letterSpacing: '0.06em',
            }}>
              {answered} {lang === 'de'
                ? (answered === 1 ? 'Antwort heute' : 'Antworten heute')
                : (answered === 1 ? 'answer today' : 'answers today')}
            </div>
          )}

          {card.type === 'situation' ? (
            <SituationView card={card} lang={lang} onAnswer={handleAnswer} onSkip={handleSkip} />
          ) : (
            <CompareView card={card} lang={lang} onAnswer={handleAnswer} onSkip={handleSkip} />
          )}
        </section>

        <hr style={{ margin: '48px 0 32px' }} />

        {/* Footer links */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <a href="/twin" style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            {lang === 'de' ? 'ZWILLING ANSEHEN →' : 'VIEW TWIN →'}
          </a>
          <a href="/training" style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            {lang === 'de' ? 'NEU EINRICHTEN →' : 'RESET TRAINING →'}
          </a>
        </div>

      </div>
    </main>
  );
}
