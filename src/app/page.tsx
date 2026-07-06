'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/context/LangContext';
import { AGENDA } from '@/data/agenda';
import { aggregateForItem, inferPosition } from '@/lib/inference';
import { getMyTwin } from '@/lib/db';
import { useNetworkTwins, SimulationBanner, FoundingNotice, ntx } from '@/components/NetworkTruth';
import { dailyIndex, dateKey, readDaily, saveDailyEntry, streak, type DailyStore } from '@/lib/daily';
import type { TwinProfile } from '@/types';

const TX = {
  label:    { de: 'DER GLOBALE PULS', en: 'THE GLOBAL PULSE', es: 'EL PULSO GLOBAL', fr: 'LE POULS MONDIAL', pt: 'O PULSO GLOBAL', ar: 'النبض العالمي', zh: '全球脉搏', ja: 'グローバルな鼓動', hi: 'वैश्विक नाड़ी', ru: 'ГЛОБАЛЬНЫЙ ПУЛЬС', id: 'DENYUT GLOBAL', tr: 'KÜRESEL NABIZ', ko: '글로벌 맥박', it: 'IL POLSO GLOBALE', nl: 'DE GLOBALE POLS', pl: 'GLOBALNY PULS', uk: 'ГЛОБАЛЬНИЙ ПУЛЬС', vi: 'NHỊP ĐẬP TOÀN CẦU', bn: 'বৈশ্বিক স্পন্দন', fa: 'نبض جهانی' },
  title:    { de: 'Was will die Welt?', en: 'What does the world want?', es: '¿Qué quiere el mundo?', fr: 'Que veut le monde?', pt: 'O que o mundo quer?', ar: 'ماذا يريد العالم؟', zh: '世界想要什么？', ja: '世界は何を望んでいるか？', hi: 'दुनिया क्या चाहती है?', ru: 'Чего хочет мир?', id: 'Apa yang dunia inginkan?', tr: 'Dünya ne istiyor?', ko: '세계는 무엇을 원하는가?', it: 'Cosa vuole il mondo?', nl: 'Wat wil de wereld?', pl: 'Czego chce świat?', uk: 'Чого хоче світ?', vi: 'Thế giới muốn gì?', bn: 'বিশ্ব কী চায়?', fa: 'جهان چه می‌خواهد؟' },
  you:      { de: 'Du', en: 'You', es: 'Tú', fr: 'Toi', pt: 'Tu', ar: 'أنت', zh: '你', ja: 'あなた', hi: 'आप', ru: 'Вы', id: 'Anda', tr: 'Sen', ko: '당신', it: 'Tu', nl: 'Jij', pl: 'Ty', uk: 'Ви', vi: 'Bạn', bn: 'আপনি', fa: 'شما' },
  active:   { de: 'Dein Zwilling ist aktiv', en: 'Your twin is active', es: 'Tu gemelo está activo', fr: 'Ton jumeau est actif', pt: 'Seu gêmeo está ativo', ar: 'توأمك نشط', zh: '你的孪生已激活', ja: 'ツインはアクティブ', hi: 'तुम्हारा जुड़वां सक्रिय है', ru: 'Твой двойник активен', id: 'Kembaranmu aktif', tr: 'İkizin aktif', ko: '트윈이 활성화됨', it: 'Il tuo gemello è attivo', nl: 'Jouw tweeling is actief', pl: 'Twój bliźniak jest aktywny', uk: 'Твій двійник активний', vi: 'Sinh đôi đang hoạt động', bn: 'তোমার যমজ সক্রিয়', fa: 'دوقلوی شما فعال است' },
  active_sub: { de: 'Blauer Marker = deine Position', en: 'Blue marker = your position', es: 'Marcador azul = tu posición', fr: 'Marqueur bleu = ta position', pt: 'Marcador azul = sua posição', ar: 'العلامة الزرقاء = موضعك', zh: '蓝色标记 = 你的位置', ja: '青いマーカー = あなたの位置', hi: 'नीला मार्कर = तुम्हारी स्थिति', ru: 'Синий маркер = ваша позиция', id: 'Penanda biru = posisi Anda', tr: 'Mavi işaret = senin konumun', ko: '파란 마커 = 당신의 위치', it: 'Marcatore blu = la tua posizione', nl: 'Blauwe markering = jouw positie', pl: 'Niebieski znacznik = twoja pozycja', uk: 'Синій маркер = ваша позиція', vi: 'Dấu xanh = vị trí của bạn', bn: 'নীল চিহ্ন = তোমার অবস্থান', fa: 'نشانگر آبی = موقعیت شما' },
  cta:      { de: 'Erstelle deinen Zwilling →', en: 'Create your twin →', es: 'Crea tu gemelo →', fr: 'Crée ton jumeau →', pt: 'Crie seu gêmeo →', ar: 'أنشئ توأمك ←', zh: '创建你的孪生 →', ja: 'ツインを作成する →', hi: 'अपना जुड़वां बनाएं →', ru: 'Создать своего двойника →', id: 'Buat kembaranmu →', tr: 'İkizini oluştur →', ko: '트윈 만들기 →', it: 'Crea il tuo gemello →', nl: 'Maak jouw tweeling →', pl: 'Utwórz swojego bliźniaka →', uk: 'Створити двійника →', vi: 'Tạo sinh đôi của bạn →', bn: 'তোমার যমজ তৈরি করো →', fa: 'دوقلوی خود را بسازید ←' },
  dq_label: { de: 'Frage des Tages', en: 'Question of the day', es: 'Pregunta del día', fr: 'Question du jour', pt: 'Pergunta do dia', ar: 'سؤال اليوم', zh: '每日一问', ja: '今日の質問', hi: 'आज का प्रश्न', ru: 'Вопрос дня', id: 'Pertanyaan hari ini', tr: 'Günün sorusu', ko: '오늘의 질문', it: 'Domanda del giorno', nl: 'Vraag van de dag', pl: 'Pytanie dnia', uk: 'Питання дня', vi: 'Câu hỏi trong ngày', bn: 'আজকের প্রশ্ন', fa: 'پرسش روز' },
  dq_guess: { de: 'Schätze: Wie viel % des Netzwerks sind dafür?', en: 'Guess: what % of the network supports this?', es: 'Adivina: ¿qué % de la red está a favor?', fr: 'Devine : quel % du réseau est pour ?', pt: 'Adivinhe: que % da rede é a favor?', ar: 'خمّن: كم % من الشبكة مؤيد؟', zh: '猜猜：网络中有多少%支持？', ja: '推測：ネットワークの何%が支持？', hi: 'अनुमान: नेटवर्क का कितना % पक्ष में है?', ru: 'Угадайте: сколько % сети за?', id: 'Tebak: berapa % jaringan yang mendukung?', tr: 'Tahmin et: ağın yüzde kaçı destekliyor?', ko: '추측: 네트워크의 몇 %가 찬성할까요?', it: 'Indovina: che % della rete è a favore?', nl: 'Gok: hoeveel % van het netwerk is voor?', pl: 'Zgadnij: ile % sieci jest za?', uk: 'Вгадайте: скільки % мережі за?', vi: 'Đoán: bao nhiêu % mạng ủng hộ?', bn: 'অনুমান: নেটওয়ার্কের কত % পক্ষে?', fa: 'حدس بزنید: چند درصد شبکه موافق است؟' },
  dq_lock:  { de: 'Schätzung einloggen', en: 'Lock in guess', es: 'Fijar estimación', fr: 'Valider', pt: 'Confirmar palpite', ar: 'تثبيت التخمين', zh: '锁定猜测', ja: '確定する', hi: 'अनुमान लॉक करें', ru: 'Зафиксировать', id: 'Kunci tebakan', tr: 'Tahmini kilitle', ko: '확정', it: 'Blocca stima', nl: 'Vastleggen', pl: 'Zatwierdź', uk: 'Зафіксувати', vi: 'Chốt dự đoán', bn: 'অনুমান লক করুন', fa: 'ثبت حدس' },
  dq_wait:  { de: 'Gespeichert. Die Auflösung kommt, sobald das Netzwerk live ist (25 Personen).', en: 'Saved. The reveal comes once the network is live (25 persons).', es: 'Guardado. La revelación llegará cuando la red esté viva (25 personas).', fr: 'Enregistré. La réponse viendra quand le réseau sera actif (25 personnes).', pt: 'Salvo. A revelação virá quando a rede estiver ativa (25 pessoas).', ar: 'حُفظ. سيظهر الحل عندما تصبح الشبكة نشطة (25 شخصًا).', zh: '已保存。网络达到25人后即可揭晓。', ja: '保存しました。ネットワークが25人になったら答え合わせ。', hi: 'सहेजा गया। नेटवर्क लाइव (25 व्यक्ति) होते ही खुलासा।', ru: 'Сохранено. Ответ появится, когда сеть оживёт (25 человек).', id: 'Tersimpan. Jawaban muncul saat jaringan aktif (25 orang).', tr: 'Kaydedildi. Ağ canlanınca (25 kişi) sonuç açıklanır.', ko: '저장됨. 네트워크가 활성화되면(25명) 공개됩니다.', it: 'Salvato. La risposta arriva quando la rete sarà attiva (25 persone).', nl: 'Opgeslagen. De onthulling volgt zodra het netwerk live is (25 personen).', pl: 'Zapisano. Wynik pojawi się, gdy sieć ożyje (25 osób).', uk: 'Збережено. Відповідь зʼявиться, коли мережа оживе (25 осіб).', vi: 'Đã lưu. Kết quả sẽ hiện khi mạng hoạt động (25 người).', bn: 'সংরক্ষিত। নেটওয়ার্ক লাইভ হলে (২৫ জন) ফলাফল আসবে।', fa: 'ذخیره شد. با فعال شدن شبکه (۲۵ نفر) نتیجه اعلام می‌شود.' },
  dq_net:   { de: 'Netzwerk', en: 'Network', es: 'Red', fr: 'Réseau', pt: 'Rede', ar: 'الشبكة', zh: '网络', ja: 'ネットワーク', hi: 'नेटवर्क', ru: 'Сеть', id: 'Jaringan', tr: 'Ağ', ko: '네트워크', it: 'Rete', nl: 'Netwerk', pl: 'Sieć', uk: 'Мережа', vi: 'Mạng', bn: 'নেটওয়ার্ক', fa: 'شبکه' },
  dq_yourguess: { de: 'Deine Schätzung', en: 'Your guess', es: 'Tu estimación', fr: 'Ton estimation', pt: 'Seu palpite', ar: 'تخمينك', zh: '你的猜测', ja: 'あなたの推測', hi: 'आपका अनुमान', ru: 'Ваша догадка', id: 'Tebakanmu', tr: 'Tahminin', ko: '내 추측', it: 'La tua stima', nl: 'Jouw gok', pl: 'Twój strzał', uk: 'Ваш здогад', vi: 'Dự đoán của bạn', bn: 'আপনার অনুমান', fa: 'حدس شما' },
  dq_off:   { de: 'Punkte daneben', en: 'points off', es: 'puntos de diferencia', fr: 'points d’écart', pt: 'pontos de diferença', ar: 'نقاط فرق', zh: '个百分点误差', ja: 'ポイントのずれ', hi: 'अंक का अंतर', ru: 'пунктов мимо', id: 'poin meleset', tr: 'puan fark', ko: '포인트 차이', it: 'punti di scarto', nl: 'punten ernaast', pl: 'punktów obok', uk: 'пунктів різниці', vi: 'điểm chênh lệch', bn: 'পয়েন্ট পার্থক্য', fa: 'واحد اختلاف' },
  dq_streak:{ de: 'Serie', en: 'Streak', es: 'Racha', fr: 'Série', pt: 'Sequência', ar: 'سلسلة', zh: '连续', ja: '連続', hi: 'सिलसिला', ru: 'Серия', id: 'Runtunan', tr: 'Seri', ko: '연속', it: 'Serie', nl: 'Reeks', pl: 'Seria', uk: 'Серія', vi: 'Chuỗi', bn: 'ধারা', fa: 'زنجیره' },
  dq_days:  { de: 'Tage', en: 'days', es: 'días', fr: 'jours', pt: 'dias', ar: 'أيام', zh: '天', ja: '日', hi: 'दिन', ru: 'дн.', id: 'hari', tr: 'gün', ko: '일', it: 'giorni', nl: 'dagen', pl: 'dni', uk: 'дн.', vi: 'ngày', bn: 'দিন', fa: 'روز' },
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
  const { stats, eose, phase, simView, setSimView, displayTwins } = useNetworkTwins();

  // ---- Question of the day: answer → guess the network → reveal ----
  const dq = AGENDA[dailyIndex(AGENDA.length)];
  const [dailyStore, setDailyStore] = useState<DailyStore>({});
  const [dqStance, setDqStance] = useState<'for' | 'against' | null>(null);
  const [dqGuess, setDqGuess] = useState(50);
  const todayEntry = dailyStore[dateKey()];
  const dqStreak = streak(dailyStore);

  function lockDaily() {
    if (!dqStance) return;
    setDailyStore(saveDailyEntry({ questionId: dq.id, stance: dqStance, guess: dqGuess }));
  }

  useEffect(() => {
    getMyTwin().then(t => { setMyTwin(t ?? null); setLoaded(true); });
    // deferred: keeps SSR markup and first client render identical
    queueMicrotask(() => setDailyStore(readDaily()));
  }, []);

  // Reveal rules ("answer first, see later"):
  //  - simulation: numbers visible, loudly labeled as fake
  //  - live network + own twin: real numbers, own position marked
  //  - live network, no twin yet: questions visible, numbers locked
  //  - founding phase: no numbers at all — the notice explains why
  const reveal = simView || (phase === 'live' && !!myTwin);
  const locked = !simView && phase === 'live' && !myTwin;

  const items = useMemo(() => {
    if (!reveal) return AGENDA.map(item => ({ item, support: null as number | null }));
    return AGENDA
      .map(item => ({ item, support: aggregateForItem(displayTwins, item).support as number | null }))
      .sort((a, b) => Math.abs((a.support ?? 0.5) - 0.5) - Math.abs((b.support ?? 0.5) - 0.5));
  }, [reveal, displayTwins]);

  const headCount = simView ? displayTwins.length : stats.persons;

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0' }}>
      <div className="container" style={{ maxWidth: '780px' }}>

        {simView && <SimulationBanner lang={lang} onExit={() => setSimView(false)} />}

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
              {eose || simView ? headCount.toLocaleString() : '…'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', marginTop: '4px' }}>
              {ntx(lang, 'persons')}
            </div>
          </div>
        </div>

        {/* Question of the day — answer first, then guess the network, then the truth */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '26px 24px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--accent, #4B9EFF)', textTransform: 'uppercase' }}>
              {tx(lang, 'dq_label')}
            </span>
            {dqStreak > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                {tx(lang, 'dq_streak')}: {dqStreak} {tx(lang, 'dq_days')}
              </span>
            )}
          </div>
          <p style={{ fontSize: '17px', lineHeight: 1.5, color: 'var(--text-1)', marginBottom: '20px', maxWidth: '640px' }}>
            {dq.text[lang] ?? dq.text['en']}
          </p>

          {!todayEntry && dqStance === null && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setDqStance('for')} style={{
                background: 'var(--text-1)', color: '#000', border: 'none',
                padding: '13px 32px', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                {tx(lang, 'support')}
              </button>
              <button onClick={() => setDqStance('against')} style={{
                background: 'transparent', color: 'var(--text-1)', border: '1px solid var(--text-1)',
                padding: '13px 32px', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                {tx(lang, 'oppose')}
              </button>
            </div>
          )}

          {!todayEntry && dqStance !== null && (
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', marginBottom: '10px' }}>
                {tx(lang, 'dq_guess')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <input
                  type="range" min={0} max={100} value={dqGuess}
                  onChange={e => setDqGuess(Number(e.target.value))}
                  className="spectrum-slider"
                  style={{ flex: 1 }}
                  aria-label={tx(lang, 'dq_guess')}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', minWidth: '52px', textAlign: 'right' }}>
                  {dqGuess}%
                </span>
              </div>
              <button onClick={lockDaily} style={{
                background: 'var(--text-1)', color: '#000', border: 'none',
                padding: '12px 28px', fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                {tx(lang, 'dq_lock')}
              </button>
            </div>
          )}

          {todayEntry && (() => {
            const canReveal = simView || phase === 'live';
            const item = AGENDA.find(a => a.id === todayEntry.questionId) ?? dq;
            if (!canReveal) {
              return (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.8, margin: 0 }}>
                  {tx(lang, 'dq_wait')}<br />
                  {tx(lang, 'you')}: {todayEntry.stance === 'for' ? tx(lang, 'support') : tx(lang, 'oppose')} · {tx(lang, 'dq_yourguess')}: {todayEntry.guess}%
                </p>
              );
            }
            const net = Math.round(aggregateForItem(displayTwins, item).support * 100);
            const diff = Math.abs(net - todayEntry.guess);
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                    {net}%
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {tx(lang, 'dq_net')} · {tx(lang, 'support')}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', margin: 0 }}>
                  {tx(lang, 'dq_yourguess')}: {todayEntry.guess}% · {diff} {tx(lang, 'dq_off')} · {tx(lang, 'you')}: {todayEntry.stance === 'for' ? tx(lang, 'support') : tx(lang, 'oppose')}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Founding phase — the honest cold start, right on the front door */}
        {!simView && eose && phase === 'founding' && (
          <FoundingNotice lang={lang} persons={stats.persons} onSimulate={() => setSimView(true)} />
        )}

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
                  {ntx(lang, 'locked_hint')}
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
            const pct = support !== null ? Math.round(support * 100) : null;
            const myScore = reveal && myTwin ? inferPosition(myTwin, item).score : null;
            const myPct = myScore !== null ? Math.round(myScore * 100) : null;
            const isSupport = pct !== null && pct >= 50;

            return (
              <div key={item.id} style={{
                padding: '28px 0',
                borderBottom: '1px solid var(--divider)',
              }}>
                <p style={{
                  fontSize: '15px', lineHeight: 1.55,
                  color: 'var(--text-1)', fontWeight: 400,
                  marginBottom: pct !== null || locked ? '20px' : 0, maxWidth: '680px',
                }}>
                  {item.text[lang] ?? item.text['en']}
                </p>

                {/* Numbers only after the network is live AND you positioned yourself
                    — one neutral color: a majority is a fact, not a victory */}
                {pct !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, height: '5px', background: 'var(--raised)', position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, height: '100%',
                        width: `${pct}%`, background: 'var(--text-2)',
                      }} />
                      <div style={{
                        position: 'absolute', left: '50%', top: '-3px',
                        width: '1px', height: '11px', background: 'var(--border)',
                      }} />
                      {myPct !== null && (
                        <div style={{
                          position: 'absolute', left: `${myPct}%`,
                          top: '-4px', transform: 'translateX(-50%)',
                          width: '3px', height: '13px', background: '#60a5fa',
                        }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '15px',
                        fontWeight: 700, color: 'var(--text-1)', minWidth: '40px', textAlign: 'right',
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
                )}

                {locked && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>
                    {ntx(lang, 'locked_hint')}
                  </p>
                )}
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
