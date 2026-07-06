'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { makeTx } from '@/lib/tx';
import { DEMO_TWINS_TAGGED } from '@/data/demo-twins';

const WorldGlobe = dynamic(() => import('@/components/WorldGlobe'), { ssr: false });
import { useLang } from '@/context/LangContext';
import { AGENDA } from '@/data/agenda';
import { aggregateForItem, inferPosition } from '@/lib/inference';
import { getMyTwin } from '@/lib/db';
import { useNetworkTwins, SimulationBanner, FoundingNotice, ntx } from '@/components/NetworkTruth';
import { dailyIndex, dateKey, readDaily, saveDailyEntry, streak, aggregateDailyEntries, type DailyStore } from '@/lib/daily';
import { getOrCreateIdentity } from '@/lib/identity';
import { publishDailyAnswer } from '@/lib/nostr';
import { fetchDailyEntries } from '@/lib/nostr-reader';
import { MIN_AGGREGATE_PERSONS } from '@/lib/network-policy';
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
  dq_publish: { de: 'Anonym mitzählen — öffentlich & unlöschbar, wie beim Twin', en: 'Count me in anonymously — public & permanent, like the twin', es: 'Contarme anónimamente — público y permanente, como el gemelo', fr: 'Me compter anonymement — public et permanent, comme le jumeau', pt: 'Contar-me anonimamente — público e permanente, como o gêmeo', ar: 'احسبني بشكل مجهول — علني ودائم كما التوأم', zh: '匿名计入——公开且永久，如同孪生', ja: '匿名でカウント — ツインと同じく公開・永久', hi: 'गुमनाम रूप से गिनें — सार्वजनिक और स्थायी, जुड़वां की तरह', ru: 'Считать меня анонимно — публично и навсегда, как двойника', id: 'Hitung saya secara anonim — publik & permanen, seperti kembaran', tr: 'Beni anonim say — ikiz gibi herkese açık ve kalıcı', ko: '익명으로 집계 — 트윈처럼 공개·영구', it: 'Contami in modo anonimo — pubblico e permanente, come il gemello', nl: 'Tel mij anoniem mee — openbaar & permanent, net als de tweeling', pl: 'Policz mnie anonimowo — publicznie i trwale, jak bliźniaka', uk: 'Рахувати мене анонімно — публічно й назавжди, як двійника', vi: 'Tính tôi ẩn danh — công khai & vĩnh viễn, như sinh đôi', bn: 'বেনামে গণনা করুন — যমজের মতো প্রকাশ্য ও স্থায়ী', fa: 'ناشناس حسابم کن — مانند دوقلو عمومی و دائمی' },
  dq_gap_real: { de: 'Realität', en: 'Reality', es: 'Realidad', fr: 'Réalité', pt: 'Realidade', ar: 'الواقع', zh: '现实', ja: '現実', hi: 'वास्तविकता', ru: 'Реальность', id: 'Realitas', tr: 'Gerçek', ko: '현실', it: 'Realtà', nl: 'Realiteit', pl: 'Rzeczywistość', uk: 'Реальність', vi: 'Thực tế', bn: 'বাস্তবতা', fa: 'واقعیت' },
  dq_gap_guessed: { de: 'Ø-Schätzung', en: 'Avg. guess', es: 'Estimación media', fr: 'Estimation moy.', pt: 'Palpite médio', ar: 'متوسط التخمين', zh: '平均猜测', ja: '平均推測', hi: 'औसत अनुमान', ru: 'Средняя догадка', id: 'Rata-rata tebakan', tr: 'Ort. tahmin', ko: '평균 추측', it: 'Stima media', nl: 'Gem. gok', pl: 'Śr. strzał', uk: 'Середній здогад', vi: 'Dự đoán TB', bn: 'গড় অনুমান', fa: 'میانگین حدس' },
  wg_title: { de: 'So denkt die Welt — live', en: 'How the world thinks — live', es: 'Así piensa el mundo — en vivo', fr: 'Ce que pense le monde — en direct', pt: 'Como o mundo pensa — ao vivo', ar: 'هكذا يفكر العالم — مباشر', zh: '世界怎么想——实时', ja: '世界はこう考える — ライブ', hi: 'दुनिया ऐसा सोचती है — लाइव', ru: 'Как думает мир — вживую', id: 'Beginilah dunia berpikir — langsung', tr: 'Dünya böyle düşünüyor — canlı', ko: '세계는 이렇게 생각한다 — 라이브', it: 'Come pensa il mondo — dal vivo', nl: 'Zo denkt de wereld — live', pl: 'Tak myśli świat — na żywo', uk: 'Так думає світ — наживо', vi: 'Thế giới nghĩ gì — trực tiếp', bn: 'বিশ্ব যা ভাবে — লাইভ', fa: 'جهان چنین می‌اندیشد — زنده' },
  wg_hint: { de: 'Mit dem Finger drehen · Land antippen', en: 'Drag to spin · tap a country', es: 'Gira con el dedo · toca un país', fr: 'Fais tourner du doigt · touche un pays', pt: 'Gire com o dedo · toque num país', ar: 'أدر بإصبعك · انقر على دولة', zh: '手指旋转 · 点击国家', ja: '指で回す · 国をタップ', hi: 'उंगली से घुमाएं · देश पर टैप करें', ru: 'Вращайте пальцем · нажмите на страну', id: 'Putar dengan jari · ketuk negara', tr: 'Parmağınla çevir · ülkeye dokun', ko: '손가락으로 회전 · 국가를 탭', it: 'Ruota col dito · tocca un paese', nl: 'Draai met je vinger · tik op een land', pl: 'Obracaj palcem · dotknij kraju', uk: 'Обертайте пальцем · торкніться країни', vi: 'Xoay bằng ngón tay · chạm vào quốc gia', bn: 'আঙুল দিয়ে ঘোরান · দেশে ট্যাপ করুন', fa: 'با انگشت بچرخانید · روی کشور بزنید' },
  dq_gap: { de: 'Wahrnehmungs-Lücke', en: 'Perception gap', es: 'Brecha de percepción', fr: 'Écart de perception', pt: 'Lacuna de percepção', ar: 'فجوة الإدراك', zh: '认知差距', ja: '認識ギャップ', hi: 'धारणा अंतर', ru: 'Разрыв восприятия', id: 'Kesenjangan persepsi', tr: 'Algı farkı', ko: '인식 격차', it: 'Divario di percezione', nl: 'Perceptiekloof', pl: 'Luka percepcji', uk: 'Розрив сприйняття', vi: 'Khoảng cách nhận thức', bn: 'ধারণার ফারাক', fa: 'شکاف ادراک' },
  dq_streak:{ de: 'Serie', en: 'Streak', es: 'Racha', fr: 'Série', pt: 'Sequência', ar: 'سلسلة', zh: '连续', ja: '連続', hi: 'सिलसिला', ru: 'Серия', id: 'Runtunan', tr: 'Seri', ko: '연속', it: 'Serie', nl: 'Reeks', pl: 'Seria', uk: 'Серія', vi: 'Chuỗi', bn: 'ধারা', fa: 'زنجیره' },
  dq_days:  { de: 'Tage', en: 'days', es: 'días', fr: 'jours', pt: 'dias', ar: 'أيام', zh: '天', ja: '日', hi: 'दिन', ru: 'дн.', id: 'hari', tr: 'gün', ko: '일', it: 'giorni', nl: 'dagen', pl: 'dni', uk: 'дн.', vi: 'ngày', bn: 'দিন', fa: 'روز' },
  support:  { de: 'dafür', en: 'support', es: 'a favor', fr: 'pour', pt: 'a favor', ar: 'مؤيد', zh: '支持', ja: '支持', hi: 'पक्ष', ru: 'за', id: 'mendukung', tr: 'destek', ko: '찬성', it: 'a favore', nl: 'voor', pl: 'za', uk: 'за', vi: 'ủng hộ', bn: 'সমর্থন', fa: 'موافق' },
  oppose:   { de: 'dagegen', en: 'oppose', es: 'en contra', fr: 'contre', pt: 'contra', ar: 'معارض', zh: '反对', ja: '反対', hi: 'विरोध', ru: 'против', id: 'menolak', tr: 'karşı', ko: '반대', it: 'contro', nl: 'tegen', pl: 'przeciw', uk: 'проти', vi: 'phản đối', bn: 'বিরোধ', fa: 'مخالف' },
};

const tx = makeTx(TX);

export default function HomePage() {
  const { lang } = useLang();
  const [myTwin, setMyTwin] = useState<TwinProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { twins, stats, eose, phase, simView, setSimView, displayTwins } = useNetworkTwins();

  // ---- Question of the day: answer → guess the network → reveal ----
  const dq = AGENDA[dailyIndex(AGENDA.length)];
  const [dailyStore, setDailyStore] = useState<DailyStore>({});
  const [dqStance, setDqStance] = useState<'for' | 'against' | null>(null);
  const [dqGuess, setDqGuess] = useState(50);
  const todayEntry = dailyStore[dateKey()];
  const dqStreak = streak(dailyStore);
  const [dqPublish, setDqPublish] = useState(false);
  const [dailyAgg, setDailyAgg] = useState<{ n: number; support: number; meanGuess: number; gap: number } | null>(null);

  function lockDaily() {
    if (!dqStance) return;
    setDailyStore(saveDailyEntry({ questionId: dq.id, stance: dqStance, guess: dqGuess }));
    if (dqPublish) {
      // fire-and-forget: the local entry is the source of truth for the UI
      getOrCreateIdentity()
        .then(id => publishDailyAnswer({ questionId: dq.id, stance: dqStance!, guess: dqGuess }, id.privkey, dateKey()))
        .catch(() => { /* network unavailable — local entry stands */ });
    }
  }

  // Perception gap: real published answers vs. what people guessed
  useEffect(() => {
    if (!todayEntry || simView || phase !== 'live') return;
    let cancelled = false;
    const knownPubkeys = new Set(twins.map(t => t.pubkey));
    fetchDailyEntries(dateKey()).then(entries => {
      if (!cancelled) setDailyAgg(aggregateDailyEntries(entries, knownPubkeys));
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!todayEntry, simView, phase, twins.length]);

  useEffect(() => {
    getMyTwin().then(t => { setMyTwin(t ?? null); setLoaded(true); });
    // deferred: keeps SSR markup and first client render identical
    queueMicrotask(() => setDailyStore(readDaily()));
  }, []);

  // Per-country data for the globe: how each country leans on today's question.
  // Real twins by default; the labeled simulation shows the fully lit world.
  const countryData = useMemo(() => {
    const acc: Record<string, { count: number; sum: number }> = {};
    if (simView) {
      for (const { twin, country } of DEMO_TWINS_TAGGED) {
        (acc[country] ??= { count: 0, sum: 0 });
        acc[country].count++;
        acc[country].sum += inferPosition(twin, dq).score;
      }
    } else {
      for (const t of twins) {
        if (!t.country) continue;
        (acc[t.country] ??= { count: 0, sum: 0 });
        acc[t.country].count++;
        acc[t.country].sum += inferPosition(t, dq).score;
      }
    }
    return Object.fromEntries(
      Object.entries(acc).map(([a2, { count, sum }]) => [a2, { count, support: sum / count }]),
    );
  }, [simView, twins, dq]);

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
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px', cursor: 'pointer', maxWidth: '520px' }}>
                <input
                  type="checkbox"
                  checked={dqPublish}
                  onChange={e => setDqPublish(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: 'var(--accent, #4B9EFF)' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.6 }}>
                  {tx(lang, 'dq_publish')}
                </span>
              </label>
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

                {/* The perception gap — what nobody else can show: reality vs. what
                    people believed the majority thinks. Gated at 25 real answers. */}
                {dailyAgg && dailyAgg.n >= MIN_AGGREGATE_PERSONS && (() => {
                  const real = Math.round(dailyAgg.support * 100);
                  const guessed = Math.round(dailyAgg.meanGuess);
                  return (
                    <div style={{ marginTop: '24px', borderTop: '1px solid var(--divider)', paddingTop: '18px' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent, #4B9EFF)', marginBottom: '14px' }}>
                        {tx(lang, 'dq_gap')} · n={dailyAgg.n}
                      </p>
                      {[{ label: tx(lang, 'dq_gap_real'), v: real, strong: true }, { label: tx(lang, 'dq_gap_guessed'), v: guessed, strong: false }].map(({ label, v, strong }) => (
                        <div key={label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 44px', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                          <div style={{ height: strong ? '8px' : '5px', background: 'var(--raised)', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${v}%`, background: strong ? 'var(--text-1)' : 'var(--text-3)' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: strong ? 700 : 400, color: strong ? 'var(--text-1)' : 'var(--text-3)', textAlign: 'right' }}>{v}%</span>
                        </div>
                      ))}
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', margin: '10px 0 0' }}>
                        Δ {dailyAgg.gap > 0 ? '+' : ''}{dailyAgg.gap}
                      </p>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>

        {/* The world, lit country by country — dark until 25 persons per country */}
        <div style={{ marginBottom: '48px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '18px' }}>
            {tx(lang, 'wg_title')}
          </p>
          <WorldGlobe
            data={countryData}
            lang={lang}
            hint={tx(lang, 'wg_hint')}
            lockedLabel={ntx(lang, 'rg_until')}
            supportLabel={`${tx(lang, 'support')} · ${tx(lang, 'dq_label')}`}
          />
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
