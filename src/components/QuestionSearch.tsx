'use client';

/**
 * The analysis search — one clean, Google-like bar over everything the
 * network can answer. Results follow the same honesty rules as every page:
 * real numbers only when allowed; otherwise your own twin's stance.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AGENDA } from '@/data/agenda';
import { SPECTRUM } from '@/lib/i18n';
import { aggregateForItem, inferPosition } from '@/lib/inference';
import { makeTx } from '@/lib/tx';
import type { AgendaItem, TwinProfile } from '@/types';

const TX = {
  ph: { de: 'Analysiere die Menschheit — Thema eintippen…', en: 'Analyze humanity — type a topic…', es: 'Analiza a la humanidad — escribe un tema…', fr: 'Analyse l’humanité — tape un sujet…', pt: 'Analise a humanidade — digite um tema…', ar: 'حلّل البشرية — اكتب موضوعًا…', zh: '分析人类——输入一个话题…', ja: '人類を分析 — トピックを入力…', hi: 'मानवता का विश्लेषण करें — विषय लिखें…', ru: 'Анализируй человечество — введи тему…', id: 'Analisis umat manusia — ketik topik…', tr: 'İnsanlığı analiz et — bir konu yaz…', ko: '인류를 분석 — 주제 입력…', it: 'Analizza l’umanità — scrivi un tema…', nl: 'Analyseer de mensheid — typ een onderwerp…', pl: 'Analizuj ludzkość — wpisz temat…', uk: 'Аналізуй людство — введи тему…', vi: 'Phân tích nhân loại — nhập chủ đề…', bn: 'মানবতা বিশ্লেষণ করো — বিষয় লেখো…', fa: 'بشریت را تحلیل کن — موضوعی بنویس…' },
  none: { de: 'Nichts gefunden — andere Begriffe versuchen.', en: 'Nothing found — try other words.', es: 'Nada encontrado — prueba otras palabras.', fr: 'Rien trouvé — essaie d’autres mots.', pt: 'Nada encontrado — tente outras palavras.', ar: 'لا نتائج — جرّب كلمات أخرى.', zh: '未找到——换个词试试。', ja: '見つかりません — 別の言葉で。', hi: 'कुछ नहीं मिला — दूसरे शब्द आज़माएं।', ru: 'Ничего не найдено — попробуйте другие слова.', id: 'Tidak ditemukan — coba kata lain.', tr: 'Bulunamadı — başka kelimeler dene.', ko: '결과 없음 — 다른 단어로 시도.', it: 'Nessun risultato — prova altre parole.', nl: 'Niets gevonden — probeer andere woorden.', pl: 'Nic nie znaleziono — spróbuj innych słów.', uk: 'Нічого не знайдено — спробуйте інші слова.', vi: 'Không thấy — thử từ khác.', bn: 'কিছু পাওয়া যায়নি — অন্য শব্দ চেষ্টা করো।', fa: 'چیزی یافت نشد — واژه‌های دیگر را امتحان کن.' },
  dim: { de: 'Dimension', en: 'Dimension', es: 'Dimensión', fr: 'Dimension', pt: 'Dimensão', ar: 'بُعد', zh: '维度', ja: '次元', hi: 'आयाम', ru: 'Измерение', id: 'Dimensi', tr: 'Boyut', ko: '차원', it: 'Dimensione', nl: 'Dimensie', pl: 'Wymiar', uk: 'Вимір', vi: 'Chiều', bn: 'মাত্রা', fa: 'بُعد' },
  propose: { de: 'Nichts Passendes? Als neue Frage vorschlagen →', en: 'Nothing fits? Propose it as a new question →', es: '¿Nada encaja? Proponla como nueva pregunta →', fr: 'Rien ne correspond ? Propose-la comme nouvelle question →', pt: 'Nada serve? Proponha como nova pergunta →', ar: 'لا شيء مناسب؟ اقترحه كسؤال جديد ←', zh: '没有匹配？提议为新问题 →', ja: '見つからない？新しい質問として提案 →', hi: 'कुछ नहीं मिला? नए प्रश्न के रूप में प्रस्तावित करें →', ru: 'Ничего не подходит? Предложи как новый вопрос →', id: 'Tidak ada yang cocok? Usulkan sebagai pertanyaan baru →', tr: 'Uymuyor mu? Yeni soru olarak öner →', ko: '맞는 게 없나요? 새 질문으로 제안 →', it: 'Niente di adatto? Proponila come nuova domanda →', nl: 'Niets passends? Stel het voor als nieuwe vraag →', pl: 'Nic nie pasuje? Zaproponuj jako nowe pytanie →', uk: 'Нічого не підходить? Запропонуй як нове питання →', vi: 'Không có gì phù hợp? Đề xuất làm câu hỏi mới →', bn: 'কিছু মেলেনি? নতুন প্রশ্ন হিসেবে প্রস্তাব করো →', fa: 'چیزی مناسب نیست؟ به‌عنوان پرسش تازه پیشنهاد بده ←' },
  you: { de: 'Du', en: 'You', es: 'Tú', fr: 'Toi', pt: 'Tu', ar: 'أنت', zh: '你', ja: 'あなた', hi: 'आप', ru: 'Вы', id: 'Anda', tr: 'Sen', ko: '당신', it: 'Tu', nl: 'Jij', pl: 'Ty', uk: 'Ви', vi: 'Bạn', bn: 'আপনি', fa: 'شما' },
  support: { de: 'dafür', en: 'support', es: 'a favor', fr: 'pour', pt: 'a favor', ar: 'مؤيد', zh: '支持', ja: '支持', hi: 'पक्ष', ru: 'за', id: 'mendukung', tr: 'destek', ko: '찬성', it: 'a favore', nl: 'voor', pl: 'za', uk: 'за', vi: 'ủng hộ', bn: 'সমর্থন', fa: 'موافق' },
  oppose: { de: 'dagegen', en: 'oppose', es: 'en contra', fr: 'contre', pt: 'contra', ar: 'معارض', zh: '反对', ja: '反対', hi: 'विरोध', ru: 'против', id: 'menolak', tr: 'karşı', ko: '반대', it: 'contro', nl: 'tegen', pl: 'przeciw', uk: 'проти', vi: 'phản đối', bn: 'বিরোধ', fa: 'مخالف' },
};
const tx = makeTx(TX);

export default function QuestionSearch({
  lang,
  myTwin,
  revealNumbers,
  displayTwins,
}: {
  lang: string;
  myTwin: TwinProfile | null;
  revealNumbers: boolean;     // real/sim aggregates allowed?
  displayTwins: TwinProfile[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as { item: AgendaItem; rank: number }[];
    return AGENDA
      .map((item) => {
        const hay = `${item.text[lang] ?? ''} ${item.text['en'] ?? ''} ${item.tags.join(' ')}`.toLowerCase();
        const idx = hay.indexOf(q);
        return { item, rank: idx };
      })
      .filter((r) => r.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 6);
  }, [query, lang]);

  const dimResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as { key: string; title: string }[];
    const spectrum = (SPECTRUM as Record<string, { key: string; title: string; left: string; right: string }[]>)[lang]
      ?? (SPECTRUM as Record<string, { key: string; title: string; left: string; right: string }[]>)['en'];
    return spectrum
      .filter((t) => `${t.title} ${t.left} ${t.right}`.toLowerCase().includes(q))
      .slice(0, 3)
      .map((t) => ({ key: t.key, title: t.title }));
  }, [query, lang]);

  const open = focused && query.trim().length >= 2;
  const proposeUrl = `https://github.com/eliaskoenig24/no-kings/issues/new?title=${encodeURIComponent('Fragen-Vorschlag: ' + query.trim())}&body=${encodeURIComponent('Vorgeschlagene Frage:\n\n> ' + query.trim() + '\n\nBitte gemäß docs/QUESTION-CONSTITUTION.md prüfen.')}`;

  return (
    <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto' }}>
      {/* the bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        background: 'var(--surface)',
        border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '999px',
        padding: '0 22px',
        height: '54px',
        boxShadow: focused ? '0 4px 24px rgba(150,98,27,0.12)' : '0 2px 12px rgba(0,0,0,0.15)',
        transition: 'border-color 0.15s, box-shadow 0.2s',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={tx(lang, 'ph')}
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-1)', fontSize: '16px', fontFamily: 'var(--font-sans)',
            minWidth: 0,
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="clear"
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
          >
            ×
          </button>
        )}
      </div>

      {/* results */}
      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(100% + 8px)', zIndex: 30,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}>
          {dimResults.map(({ key, title }) => (
            <button
              key={key}
              onClick={() => router.push('/network')}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                width: '100%', textAlign: 'left',
                padding: '14px 22px', background: 'none', border: 'none',
                borderTop: '1px solid var(--divider)', cursor: 'pointer',
              }}
            >
              <span style={{ flex: 1, fontSize: '14px', color: 'var(--text-1)' }}>{title}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                {tx(lang, 'dim')}
              </span>
            </button>
          ))}
          {results.length === 0 && dimResults.length === 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', padding: '16px 22px', margin: 0 }}>
              {tx(lang, 'none')}
            </p>
          )}
          {results.map(({ item }) => {
            const myScore = myTwin ? inferPosition(myTwin, item).score : null;
            const net = revealNumbers ? Math.round(aggregateForItem(displayTwins, item).support * 100) : null;
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/question/${item.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  width: '100%', textAlign: 'left',
                  padding: '14px 22px', background: 'none', border: 'none',
                  borderTop: '1px solid var(--divider)', cursor: 'pointer',
                }}
              >
                <span style={{ flex: 1, fontSize: '14px', lineHeight: 1.45, color: 'var(--text-1)' }}>
                  {item.text[lang] ?? item.text['en']}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {net !== null
                    ? `${net}% ${tx(lang, 'support')}`
                    : myScore !== null
                      ? `${tx(lang, 'you')}: ${myScore >= 0.5 ? tx(lang, 'support') : tx(lang, 'oppose')}`
                      : '→'}
                </span>
              </button>
            );
          })}
          <a
            href={proposeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', padding: '13px 22px',
              borderTop: '1px solid var(--divider)',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--accent)', textDecoration: 'none',
            }}
          >
            {tx(lang, 'propose')}
          </a>
        </div>
      )}
    </div>
  );
}
