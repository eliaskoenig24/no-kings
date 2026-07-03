'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DEMO_TWINS, DEMO_TWINS_TAGGED } from '@/data/demo-twins';
import { calculateNetworkAggregate } from '@/lib/twin-engine';
import { getMyTwin } from '@/lib/db';
import {
  subscribeToUniqueNetworkTwins,
  fetchCountryStats,
  checkRelayStatus,
  type NetworkTwin,
  type NetworkStats,
} from '@/lib/nostr-reader';
import { getRelays, addRelay, removeRelay, DEFAULT_RELAYS } from '@/lib/relays';
import { MIN_AGGREGATE_PERSONS, networkPhase, foundingProgress } from '@/lib/network-policy';
import { TwinProfile, TOPICS } from '@/types';
import dynamic from 'next/dynamic';
const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });
import { useLang } from '@/context/LangContext';
import { t, getTopicLabel, getTopicDesc } from '@/lib/i18n';
import NostrErrorBoundary from '@/components/NostrErrorBoundary';

// Per-country averages computed once from demo data (simulation view only)
const COUNTRY_AVERAGES: Record<string, { count: number } & Record<string, number>> = (() => {
  const map: Record<string, { count: number; sums: Record<string, number> }> = {};
  for (const { twin, country } of DEMO_TWINS_TAGGED) {
    if (!map[country]) map[country] = { count: 0, sums: Object.fromEntries(TOPICS.map(k => [k, 0])) };
    map[country].count++;
    for (const k of TOPICS) map[country].sums[k] += twin[k];
  }
  return Object.fromEntries(
    Object.entries(map).map(([code, { count, sums }]) => [
      code,
      { count, ...Object.fromEntries(TOPICS.map(k => [k, sums[k] / count])) },
    ])
  );
})();

// Founding-phase / honesty strings (de + en; en is the fallback for all other langs)
const NX: Record<string, Record<string, string>> = {
  sim_badge:    { de: 'SIMULATION — Beispieldaten, keine echten Menschen', en: 'SIMULATION — sample data, not real people', es: 'SIMULACIÓN — datos de ejemplo, no personas reales', fr: 'SIMULATION — données fictives, pas de vraies personnes', pt: 'SIMULAÇÃO — dados de exemplo, não pessoas reais', ar: 'محاكاة — بيانات تجريبية، ليست أشخاصًا حقيقيين', zh: '模拟——示例数据，并非真实人群', ja: 'シミュレーション — サンプルデータ、実在の人ではありません', hi: 'सिमुलेशन — नमूना डेटा, वास्तविक लोग नहीं', ru: 'СИМУЛЯЦИЯ — примерные данные, не реальные люди', id: 'SIMULASI — data contoh, bukan orang sungguhan', tr: 'SİMÜLASYON — örnek veri, gerçek insanlar değil', ko: '시뮬레이션 — 샘플 데이터, 실제 사람이 아님', it: 'SIMULAZIONE — dati di esempio, non persone reali', nl: 'SIMULATIE — voorbeelddata, geen echte mensen', pl: 'SYMULACJA — dane przykładowe, nie prawdziwi ludzie', uk: 'СИМУЛЯЦІЯ — приклад даних, не реальні люди', vi: 'MÔ PHỎNG — dữ liệu mẫu, không phải người thật', bn: 'সিমুলেশন — নমুনা ডেটা, প্রকৃত মানুষ নয়', fa: 'شبیه‌سازی — داده نمونه، نه افراد واقعی' },
  sim_on:       { de: 'Simulation ansehen', en: 'View simulation', es: 'Ver simulación', fr: 'Voir la simulation', pt: 'Ver simulação', ar: 'عرض المحاكاة', zh: '查看模拟', ja: 'シミュレーションを見る', hi: 'सिमुलेशन देखें', ru: 'Смотреть симуляцию', id: 'Lihat simulasi', tr: 'Simülasyonu gör', ko: '시뮬레이션 보기', it: 'Vedi simulazione', nl: 'Simulatie bekijken', pl: 'Zobacz symulację', uk: 'Переглянути симуляцію', vi: 'Xem mô phỏng', bn: 'সিমুলেশন দেখুন', fa: 'مشاهده شبیه‌سازی' },
  sim_off:      { de: '← Zurück zu echten Daten', en: '← Back to real data', es: '← Volver a datos reales', fr: '← Retour aux données réelles', pt: '← Voltar aos dados reais', ar: '← العودة إلى البيانات الحقيقية', zh: '← 返回真实数据', ja: '← 実データに戻る', hi: '← वास्तविक डेटा पर लौटें', ru: '← К реальным данным', id: '← Kembali ke data asli', tr: '← Gerçek verilere dön', ko: '← 실제 데이터로 돌아가기', it: '← Torna ai dati reali', nl: '← Terug naar echte data', pl: '← Wróć do prawdziwych danych', uk: '← До реальних даних', vi: '← Về dữ liệu thật', bn: '← আসল ডেটায় ফিরুন', fa: '← بازگشت به داده‌های واقعی' },
  sim_why:      { de: 'Die Simulation zeigt, wie diese Seite mit tausenden Zwillingen aussehen wird. Nichts davon fließt in echte Auswertungen ein.', en: 'The simulation shows what this page will look like with thousands of twins. None of it feeds into real results.', es: 'La simulación muestra cómo se verá esta página con miles de gemelos. Nada de esto entra en los resultados reales.', fr: 'La simulation montre à quoi ressemblera cette page avec des milliers de jumeaux. Rien de tout cela n’entre dans les résultats réels.', pt: 'A simulação mostra como esta página ficará com milhares de gêmeos. Nada disso entra nos resultados reais.', ar: 'تعرض المحاكاة كيف ستبدو هذه الصفحة مع آلاف التوائم. لا شيء منها يدخل في النتائج الحقيقية.', zh: '模拟展示了这个页面在拥有数千个孪生时的样子。这些数据不会进入真实结果。', ja: 'シミュレーションは、数千のツインがいる場合のこのページの姿を示します。実際の結果には一切反映されません。', hi: 'सिमुलेशन दिखाता है कि हज़ारों जुड़वां होने पर यह पेज कैसा दिखेगा। इसमें से कुछ भी वास्तविक परिणामों में नहीं जाता।', ru: 'Симуляция показывает, как будет выглядеть эта страница с тысячами двойников. Ничего из этого не попадает в реальные результаты.', id: 'Simulasi menunjukkan seperti apa halaman ini dengan ribuan kembaran. Tidak ada yang masuk ke hasil nyata.', tr: 'Simülasyon, binlerce ikizle bu sayfanın nasıl görüneceğini gösterir. Hiçbiri gerçek sonuçlara karışmaz.', ko: '시뮬레이션은 수천 개의 트윈이 있을 때 이 페이지의 모습을 보여줍니다. 어떤 것도 실제 결과에 반영되지 않습니다.', it: 'La simulazione mostra come apparirà questa pagina con migliaia di gemelli. Nulla di ciò entra nei risultati reali.', nl: 'De simulatie toont hoe deze pagina eruitziet met duizenden twins. Niets hiervan telt mee in echte resultaten.', pl: 'Symulacja pokazuje, jak ta strona będzie wyglądać z tysiącami bliźniaków. Nic z tego nie trafia do prawdziwych wyników.', uk: 'Симуляція показує, як виглядатиме ця сторінка з тисячами двійників. Ніщо з цього не потрапляє в реальні результати.', vi: 'Mô phỏng cho thấy trang này sẽ trông thế nào với hàng nghìn sinh đôi. Không dữ liệu nào được đưa vào kết quả thật.', bn: 'সিমুলেশন দেখায় হাজারো যমজ নিয়ে এই পেজ কেমন দেখাবে। এর কিছুই আসল ফলাফলে যায় না।', fa: 'شبیه‌سازی نشان می‌دهد این صفحه با هزاران دوقلو چگونه خواهد بود. هیچ‌کدام وارد نتایج واقعی نمی‌شود.' },
  founding_title: { de: 'Gründungsphase', en: 'Founding phase', es: 'Fase fundacional', fr: 'Phase fondatrice', pt: 'Fase de fundação', ar: 'مرحلة التأسيس', zh: '创始阶段', ja: '創設フェーズ', hi: 'स्थापना चरण', ru: 'Этап основания', id: 'Fase pendirian', tr: 'Kuruluş aşaması', ko: '창립 단계', it: 'Fase fondativa', nl: 'Oprichtingsfase', pl: 'Faza założycielska', uk: 'Етап заснування', vi: 'Giai đoạn sáng lập', bn: 'প্রতিষ্ঠা পর্যায়', fa: 'مرحله بنیان‌گذاری' },
  founding_body: { de: 'Das Netzwerk ist live — und jung. Auswertungen des kollektiven Willens zeigen wir erst ab', en: 'The network is live — and young. We only show aggregates of the collective will once there are', es: 'La red está viva — y es joven. Solo mostramos agregados de la voluntad colectiva a partir de', fr: 'Le réseau est en ligne — et jeune. Nous n’affichons les agrégats de la volonté collective qu’à partir de', pt: 'A rede está no ar — e é jovem. Só mostramos agregados da vontade coletiva a partir de', ar: 'الشبكة تعمل — وهي فتية. لا نعرض تجميعات الإرادة الجماعية إلا بدءًا من', zh: '网络已上线——但还很年轻。集体意愿的汇总数据要达到', ja: 'ネットワークは稼働中 — まだ若いのです。集合的意思の集計を表示するのは', hi: 'नेटवर्क लाइव है — और युवा है। हम सामूहिक इच्छा के समुच्चय तभी दिखाते हैं जब कम से कम', ru: 'Сеть работает — и она молода. Агрегаты коллективной воли мы показываем только начиная с', id: 'Jaringan sudah aktif — dan masih muda. Kami hanya menampilkan agregat kehendak kolektif mulai dari', tr: 'Ağ canlı — ve genç. Kolektif iradenin toplamlarını ancak şu sayıdan itibaren gösteriyoruz:', ko: '네트워크는 가동 중이며 아직 젊습니다. 집단 의지의 집계는 최소', it: 'La rete è attiva — ed è giovane. Mostriamo gli aggregati della volontà collettiva solo a partire da', nl: 'Het netwerk is live — en jong. We tonen aggregaten van de collectieve wil pas vanaf', pl: 'Sieć działa — i jest młoda. Agregaty zbiorowej woli pokazujemy dopiero od', uk: 'Мережа працює — і вона молода. Агрегати колективної волі ми показуємо лише від', vi: 'Mạng đã hoạt động — và còn non trẻ. Chúng tôi chỉ hiển thị tổng hợp ý chí tập thể khi có ít nhất', bn: 'নেটওয়ার্ক লাইভ — এবং তরুণ। সমষ্টিগত ইচ্ছার সমষ্টি আমরা তখনই দেখাই যখন অন্তত', fa: 'شبکه فعال است — و جوان. تجمیع اراده جمعی را فقط از' },
  founding_body2: { de: 'Personen. Darunter wäre ein Durchschnitt statistisches Rauschen und könnte einzelne Profile verraten. Ehrliche Zahlen von Anfang an: Das ist der Punkt dieser Plattform.', en: 'persons. Below that, an average is statistical noise and could expose individual profiles. Honest numbers from day one — that is the point of this platform.', es: 'personas. Por debajo, un promedio es ruido estadístico y podría exponer perfiles individuales. Números honestos desde el primer día — de eso trata esta plataforma.', fr: 'personnes. En dessous, une moyenne n’est que du bruit statistique et pourrait exposer des profils individuels. Des chiffres honnêtes dès le premier jour — c’est tout le sens de cette plateforme.', pt: 'pessoas. Abaixo disso, uma média é ruído estatístico e poderia expor perfis individuais. Números honestos desde o primeiro dia — esse é o propósito desta plataforma.', ar: 'شخصًا. دون ذلك يكون المتوسط ضجيجًا إحصائيًا وقد يكشف ملفات فردية. أرقام صادقة من اليوم الأول — هذا هو جوهر هذه المنصة.', zh: '人后才会显示。低于此数，平均值只是统计噪音，还可能暴露个人档案。从第一天起就用诚实的数字——这正是这个平台的意义。', ja: '人以上になってからです。それ未満では平均は統計的ノイズであり、個人のプロフィールを暴露しかねません。初日から正直な数字を — それがこのプラットフォームの本質です。', hi: 'व्यक्ति हों। इससे कम पर औसत सांख्यिकीय शोर है और व्यक्तिगत प्रोफ़ाइल उजागर कर सकता है। पहले दिन से ईमानदार आंकड़े — यही इस मंच का उद्देश्य है।', ru: 'человек. Ниже этого среднее — статистический шум, который может раскрыть отдельные профили. Честные цифры с первого дня — в этом суть платформы.', id: 'orang. Di bawah itu, rata-rata hanyalah derau statistik dan bisa membocorkan profil individu. Angka jujur sejak hari pertama — itulah inti platform ini.', tr: 'kişi. Bunun altında ortalama istatistiksel gürültüdür ve bireysel profilleri açığa çıkarabilir. İlk günden dürüst rakamlar — bu platformun amacı budur.', ko: '명입니다. 그 미만에서 평균은 통계적 잡음이며 개인 프로필이 노출될 수 있습니다. 첫날부터 정직한 숫자 — 그것이 이 플랫폼의 존재 이유입니다.', it: 'persone. Sotto questa soglia una media è rumore statistico e potrebbe esporre profili individuali. Numeri onesti dal primo giorno — è questo il senso di questa piattaforma.', nl: 'personen. Daaronder is een gemiddelde statistische ruis en kan het individuele profielen blootleggen. Eerlijke cijfers vanaf dag één — daar draait dit platform om.', pl: 'osób. Poniżej tego średnia to szum statystyczny, który mógłby ujawnić pojedyncze profile. Uczciwe liczby od pierwszego dnia — o to chodzi w tej platformie.', uk: 'осіб. Нижче цього середнє — статистичний шум, який може розкрити окремі профілі. Чесні цифри з першого дня — у цьому суть платформи.', vi: 'người. Dưới mức đó, giá trị trung bình chỉ là nhiễu thống kê và có thể làm lộ hồ sơ cá nhân. Những con số trung thực từ ngày đầu — đó là ý nghĩa của nền tảng này.', bn: 'জন হয়। এর নিচে গড় কেবল পরিসংখ্যানগত শব্দ এবং ব্যক্তিগত প্রোফাইল ফাঁস করতে পারে। প্রথম দিন থেকে সৎ সংখ্যা — এটাই এই প্ল্যাটফর্মের মূল কথা।', fa: 'نفر نشان می‌دهیم. کمتر از آن، میانگین نویز آماری است و می‌تواند پروفایل‌های فردی را فاش کند. اعداد صادقانه از روز اول — هدف این پلتفرم همین است.' },
  founding_progress: { de: 'Personen bis zur ersten Auswertung', en: 'persons until the first aggregate', es: 'personas hasta el primer agregado', fr: 'personnes avant le premier agrégat', pt: 'pessoas até o primeiro agregado', ar: 'شخصًا حتى أول تجميع', zh: '人后显示首个汇总', ja: '人で最初の集計', hi: 'व्यक्ति पहले समुच्चय तक', ru: 'человек до первого агрегата', id: 'orang hingga agregat pertama', tr: 'kişiye kadar ilk toplam', ko: '명이 되면 첫 집계', it: 'persone al primo aggregato', nl: 'personen tot het eerste aggregaat', pl: 'osób do pierwszego agregatu', uk: 'осіб до першого агрегату', vi: 'người là có tổng hợp đầu tiên', bn: 'জন হলে প্রথম সমষ্টি', fa: 'نفر تا نخستین تجمیع' },
  founding_cta: { de: 'Du kannst eine der ersten sein: Trainiere deinen Zwilling und teile ihn ins Netzwerk.', en: 'You can be one of the first: train your twin and share it to the network.', es: 'Puedes ser de los primeros: entrena tu gemelo y compártelo en la red.', fr: 'Tu peux être parmi les premiers : entraîne ton jumeau et partage-le sur le réseau.', pt: 'Você pode ser um dos primeiros: treine seu gêmeo e compartilhe na rede.', ar: 'يمكنك أن تكون من الأوائل: درّب توأمك وشاركه في الشبكة.', zh: '你可以成为最早的一批人：训练你的孪生并分享到网络。', ja: '最初の一人になれます：ツインを訓練してネットワークに共有しましょう。', hi: 'आप पहले लोगों में हो सकते हैं: अपना जुड़वां प्रशिक्षित करें और नेटवर्क में साझा करें।', ru: 'Вы можете стать одним из первых: обучите двойника и поделитесь им в сети.', id: 'Kamu bisa jadi salah satu yang pertama: latih kembaranmu dan bagikan ke jaringan.', tr: 'İlklerden biri olabilirsin: ikizini eğit ve ağa paylaş.', ko: '첫 번째 사람 중 하나가 될 수 있습니다: 트윈을 훈련시키고 네트워크에 공유하세요.', it: 'Puoi essere tra i primi: allena il tuo gemello e condividilo nella rete.', nl: 'Jij kunt een van de eersten zijn: train je tweeling en deel hem met het netwerk.', pl: 'Możesz być jednym z pierwszych: wytrenuj bliźniaka i udostępnij go w sieci.', uk: 'Ви можете стати одним із перших: навчіть двійника й поділіться ним у мережі.', vi: 'Bạn có thể là một trong những người đầu tiên: huấn luyện sinh đôi và chia sẻ lên mạng.', bn: 'আপনি প্রথমদের একজন হতে পারেন: যমজ প্রশিক্ষণ দিন ও নেটওয়ার্কে শেয়ার করুন।', fa: 'می‌توانید از نخستین‌ها باشید: دوقلوی خود را آموزش دهید و در شبکه به اشتراک بگذارید.' },
  persons:      { de: 'Personen', en: 'persons', es: 'personas', fr: 'personnes', pt: 'pessoas', ar: 'أشخاص', zh: '人', ja: '人', hi: 'व्यक्ति', ru: 'человек', id: 'orang', tr: 'kişi', ko: '명', it: 'persone', nl: 'personen', pl: 'osób', uk: 'осіб', vi: 'người', bn: 'জন', fa: 'نفر' },
  verified:     { de: 'mit Proof-of-Work', en: 'with proof-of-work', es: 'con proof-of-work', fr: 'avec proof-of-work', pt: 'com proof-of-work', ar: 'مع إثبات العمل', zh: '含工作量证明', ja: 'プルーフ・オブ・ワーク付き', hi: 'प्रूफ-ऑफ-वर्क सहित', ru: 'с proof-of-work', id: 'dengan proof-of-work', tr: 'proof-of-work ile', ko: '작업 증명 포함', it: 'con proof-of-work', nl: 'met proof-of-work', pl: 'z proof-of-work', uk: 'з proof-of-work', vi: 'có proof-of-work', bn: 'প্রুফ-অফ-ওয়ার্ক সহ', fa: 'با اثبات کار' },
  dedup_note:   { de: 'dedupliziert aus', en: 'deduplicated from', es: 'deduplicado de', fr: 'dédupliqué depuis', pt: 'deduplicado de', ar: 'بعد إزالة التكرار من', zh: '去重自', ja: '重複排除元:', hi: 'डुप्लिकेट हटाकर', ru: 'дедуплицировано из', id: 'dideduplikasi dari', tr: 'tekilleştirildi:', ko: '중복 제거:', it: 'deduplicato da', nl: 'gededupliceerd uit', pl: 'zdeduplikowano z', uk: 'дедупліковано з', vi: 'khử trùng lặp từ', bn: 'ডুপ্লিকেট বাদে', fa: 'حذف تکرار از' },
  events_word:  { de: 'Events — jede Person zählt genau einmal', en: 'events — every person counts exactly once', es: 'eventos — cada persona cuenta exactamente una vez', fr: 'événements — chaque personne compte exactement une fois', pt: 'eventos — cada pessoa conta exatamente uma vez', ar: 'حدثًا — كل شخص يُحسب مرة واحدة فقط', zh: '个事件——每人只计一次', ja: 'イベント — 一人は必ず1回だけカウント', hi: 'इवेंट — हर व्यक्ति ठीक एक बार गिना जाता है', ru: 'событий — каждый человек учитывается ровно один раз', id: 'event — setiap orang dihitung tepat sekali', tr: 'olaydan — her kişi tam bir kez sayılır', ko: '개 이벤트 — 한 사람은 정확히 한 번만 집계', it: 'eventi — ogni persona conta esattamente una volta', nl: 'events — iedere persoon telt precies één keer', pl: 'zdarzeń — każda osoba liczona dokładnie raz', uk: 'подій — кожна людина рахується рівно один раз', vi: 'sự kiện — mỗi người chỉ được tính đúng một lần', bn: 'ইভেন্ট — প্রতিটি ব্যক্তি ঠিক একবার গণনা হয়', fa: 'رویداد — هر نفر دقیقاً یک بار شمرده می‌شود' },
};
function nx(lang: string, key: keyof typeof NX): string {
  return NX[key][lang] ?? NX[key]['en'];
}

function MiniHistogram({ buckets, userBucket }: { buckets: number[]; userBucket?: number }) {
  const max = Math.max(...buckets, 1);
  return (
    <div style={{ display: 'flex', gap: '1.5px', height: '28px', alignItems: 'flex-end', marginTop: '8px', marginBottom: '10px' }}>
      {buckets.map((count, i) => {
        const heightPct = (count / max) * 100;
        const isUser = i === userBucket;
        return (
          <div
            key={i}
            title={`${i * 10}–${(i + 1) * 10}%: ${count}`}
            style={{
              flex: 1,
              height: `${Math.max(6, heightPct)}%`,
              background: isUser ? 'var(--accent)' : '#1e1e1e',
              borderTop: isUser ? '2px solid var(--accent)' : '1px solid #2a2a2a',
              transition: 'height 0.8s ease',
            }}
          />
        );
      })}
    </div>
  );
}

function CompareBar({ networkValue, userValue }: { networkValue: number; userValue?: number }) {
  const networkPct = Math.round(networkValue * 100);
  const userPct = userValue !== undefined ? Math.round(userValue * 100) : null;

  return (
    <div style={{ position: 'relative', height: '3px', background: 'var(--divider)', marginTop: '12px', marginBottom: '6px' }}>
      {/* Network bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        width: `${networkPct}%`,
        background: 'var(--text-3)',
        transition: 'width 0.8s ease',
      }} />
      {/* User marker */}
      {userPct !== null && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: `${userPct}%`,
          transform: 'translateX(-50%)',
          width: '3px',
          height: '11px',
          background: 'var(--accent)',
        }} />
      )}
    </div>
  );
}

export default function NetworkPage() {
  const { lang } = useLang();
  const [myTwin, setMyTwin] = useState<TwinProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [networkTwins, setNetworkTwins] = useState<NetworkTwin[]>([]);
  const [stats, setStats] = useState<NetworkStats>({ events: 0, persons: 0, verified: 0 });
  const [eose, setEose] = useState(false);
  const [simView, setSimView] = useState(false);
  const [countryStats, setCountryStats] = useState<Record<string, number>>({});
  const [relayStatus, setRelayStatus] = useState<Record<string, 'online' | 'offline' | 'checking'>>({});
  const [relayList, setRelayList] = useState<string[]>(DEFAULT_RELAYS);
  const [relayInput, setRelayInput] = useState('');
  const [relayInvalid, setRelayInvalid] = useState(false);
  const relayKey = relayList.join('|');

  useEffect(() => {
    // deferred: SSR markup renders the defaults, then the user's list takes over
    queueMicrotask(() => setRelayList(getRelays()));
  }, []);

  useEffect(() => {
    getMyTwin().then((result) => {
      setMyTwin(result ?? null);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const cleanup = subscribeToUniqueNetworkTwins(
      (twins, s) => {
        setNetworkTwins(twins);
        setStats(s);
      },
      () => setEose(true),
      30000,
    );
    // After 8s treat the network as settled even if a relay never answers
    const fallback = setTimeout(() => setEose(true), 8000);
    return () => { cleanup(); clearTimeout(fallback); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayKey]);

  useEffect(() => {
    fetchCountryStats(5000).then((s) => {
      if (Object.keys(s).length > 0) setCountryStats(s);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayKey]);

  useEffect(() => {
    checkRelayStatus(4000).then(setRelayStatus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayKey]);

  function handleAddRelay() {
    const next = addRelay(relayInput);
    if (!next) {
      setRelayInvalid(true);
      setTimeout(() => setRelayInvalid(false), 1600);
      return;
    }
    setRelayInput('');
    setRelayList(next);
  }

  const phase = networkPhase(stats.persons);
  const showAggregates = simView || phase === 'live';
  const displayTwins: TwinProfile[] = simView ? DEMO_TWINS : networkTwins;

  const aggregate = useMemo(() => calculateNetworkAggregate(displayTwins), [displayTwins]);

  const histograms = useMemo(() => {
    return Object.fromEntries(
      TOPICS.map(topic => {
        const buckets = Array(10).fill(0) as number[];
        for (const twin of displayTwins) {
          const idx = Math.min(9, Math.floor(twin[topic] * 10));
          buckets[idx]++;
        }
        return [topic, buckets];
      })
    ) as Record<string, number[]>;
  }, [displayTwins]);

  // Animated counter: smoothly count up when new twins arrive
  const headCount = simView ? DEMO_TWINS.length : stats.persons;
  const [displayCount, setDisplayCount] = useState(0);
  const [flashNew, setFlashNew] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  useEffect(() => {
    const target = headCount;
    if (target === displayCount) return;
    const shouldFlash = target > displayCount && !simView;
    const start = displayCount;
    const duration = Math.min(800, Math.abs(target - start) * 40);
    const startTime = performance.now();
    let flashed = false;
    function tick(now: number) {
      if (shouldFlash && !flashed) {
        flashed = true;
        setFlashNew(true);
        setTimeout(() => setFlashNew(false), 600);
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(start + (target - start) * eased));
      if (progress < 1) animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headCount]);

  const topTopics = [...TOPICS]
    .sort((a, b) => aggregate.averages[b] - aggregate.averages[a])
    .slice(0, 3);

  return (
    <NostrErrorBoundary>
    <div style={{ padding: 'clamp(60px, 8vw, 100px) 0' }}>
      <div className="container">

        {/* Simulation banner */}
        {simView && (
          <div style={{
            border: '1px solid rgba(250,180,50,0.45)',
            background: 'rgba(250,180,50,0.06)',
            padding: '14px 20px',
            marginBottom: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', color: 'rgb(250,180,50)' }}>
              {nx(lang, 'sim_badge')}
            </span>
            <button
              onClick={() => setSimView(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {nx(lang, 'sim_off')}
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <p className="label" style={{ margin: 0 }}>{t(lang, 'net_label')}</p>
            {!eose && !simView && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                {t(lang, 'net_loading')}
              </span>
            )}
            {eose && !simView && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--positive)' }}>
                {stats.persons.toLocaleString()} {nx(lang, 'persons')} · {stats.verified.toLocaleString()} {nx(lang, 'verified')}
              </span>
            )}
            {eose && !simView && stats.events > stats.persons && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}>
                {nx(lang, 'dedup_note')} {stats.events.toLocaleString()} {nx(lang, 'events_word')}
              </span>
            )}
          </div>
          {/* Relay status bar — user-configurable: your relays, your network */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.08em' }}>
              {t(lang, 'net_relays')}
            </span>
            {relayList.map((url) => {
              const status = relayStatus[url] ?? 'checking';
              const label = url.replace('wss://', '').replace(/\/$/, '');
              const color =
                status === 'online' ? 'var(--positive)' :
                status === 'offline' ? 'var(--negative)' :
                'var(--text-3)';
              const dot = status === 'offline' ? '○' : '●';
              return (
                <span key={url} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {dot} {label}
                  {relayList.length > 1 && (
                    <button
                      onClick={() => setRelayList(removeRelay(url))}
                      aria-label={`remove ${label}`}
                      style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '10px', padding: '0 2px', lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  )}
                </span>
              );
            })}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <input
                value={relayInput}
                onChange={(e) => setRelayInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && relayInput.trim()) handleAddRelay(); }}
                placeholder="wss://…"
                spellCheck={false}
                style={{
                  width: '140px', background: 'var(--raised, #111)',
                  border: `1px solid ${relayInvalid ? 'var(--negative, #ef4444)' : 'var(--border)'}`,
                  color: 'var(--text-2)', padding: '3px 8px',
                  fontFamily: 'var(--font-mono)', fontSize: '10px', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              <button
                onClick={handleAddRelay}
                disabled={!relayInput.trim()}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '3px 8px' }}
              >
                +
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '24px' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
              {t(lang, 'net_title')}
            </h1>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '32px',
                fontWeight: 400,
                color: flashNew ? 'var(--positive)' : 'var(--text-1)',
                transition: 'color 0.3s',
              }}>
                {displayCount.toLocaleString()}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                {simView ? t(lang, 'net_twins_demo') : t(lang, 'net_twins_real')}
              </div>
            </div>
          </div>
        </div>

        {/* Founding phase — the honest cold start */}
        {!simView && eose && phase === 'founding' && (
          <div style={{
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: '48px 40px',
            marginBottom: '64px',
          }}>
            <p className="label" style={{ marginBottom: '20px' }}>{nx(lang, 'founding_title')}</p>
            <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '620px', marginBottom: '32px', color: 'var(--text-2)' }}>
              {nx(lang, 'founding_body')} <strong style={{ color: 'var(--text-1)' }}>{MIN_AGGREGATE_PERSONS}</strong> {nx(lang, 'founding_body2')}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '40px', color: 'var(--text-1)' }}>
                {stats.persons}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)' }}>
                / {MIN_AGGREGATE_PERSONS} {nx(lang, 'founding_progress')}
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--divider)', marginBottom: '32px', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${Math.round(foundingProgress(stats.persons) * 100)}%`,
                background: 'var(--accent)',
                transition: 'width 0.8s ease',
              }} />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '28px', maxWidth: '520px' }}>
              {nx(lang, 'founding_cta')}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href={myTwin ? '/twin' : '/training'} style={{
                display: 'inline-block',
                background: 'var(--text-1)',
                color: '#000',
                padding: '14px 32px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}>
                {myTwin ? t(lang, 'twin_action_network') : t(lang, 'twin_create')}
              </Link>
              <button
                onClick={() => setSimView(true)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', padding: '13px 24px', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}
              >
                {nx(lang, 'sim_on')}
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '20px', maxWidth: '520px' }}>
              {nx(lang, 'sim_why')}
            </p>
          </div>
        )}

        {/* User notice */}
        {showAggregates && loaded && myTwin && (
          <div style={{
            border: '1px solid var(--border)',
            padding: '20px 24px',
            marginBottom: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--surface)',
          }}>
            <div style={{ width: '3px', height: '40px', background: 'var(--accent)', flexShrink: 0 }} />
            <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>
              {t(lang, 'net_hint_user')}
            </p>
          </div>
        )}
        {showAggregates && loaded && !myTwin && (
          <div style={{
            border: '1px solid var(--border)',
            padding: '20px 24px',
            marginBottom: '48px',
            background: 'var(--surface)',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>
              <Link href="/training" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                {t(lang, 'net_hint_create_link')}
              </Link>{' '}
              {t(lang, 'net_hint_create')}
            </p>
          </div>
        )}

        {/* Aggregates: only live (n >= threshold) or clearly-labeled simulation */}
        {showAggregates && (
          <>
            {/* Radar Chart */}
            <div style={{ marginBottom: '56px' }}>
              <div style={{ maxWidth: '200px', margin: '0 auto' }}>
                <RadarChart
                  values={aggregate.averages}
                  compare={myTwin ?? undefined}
                  size={200}
                  animated
                />
              </div>
              {myTwin && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '24px',
                  marginTop: '16px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: '#4B9EFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#4B9EFF' }} />
                    {t(lang, 'nav_twin')}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '2px', background: 'var(--text-3)', borderBottom: '1px dashed var(--text-3)' }} />
                    {t(lang, 'net_label')}
                  </span>
                </div>
              )}
            </div>

            {/* Topic rows */}
            <div style={{ marginBottom: '80px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '40px', flexWrap: 'wrap', gap: '12px' }}>
                <p className="label" style={{ margin: 0 }}>{t(lang, 'net_dimensions')}</p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                  {({ de: 'Verteilung aller Zwillinge · blau = deine Position', en: 'distribution of all twins · blue = your position', es: 'distribución de todos los gemelos · azul = tu posición', fr: 'répartition de tous les jumeaux · bleu = ta position', pt: 'distribuição de todos os gêmeos · azul = sua posição', ar: 'توزيع كل التوائم · أزرق = موضعك', zh: '所有双胞胎的分布 · 蓝色 = 你的位置', ja: 'すべてのツインの分布 · 青 = あなたの位置', hi: 'सभी जुड़वाँ का वितरण · नीला = आपकी स्थिति', ru: 'распределение всех двойников · синий = ваша позиция', id: 'distribusi semua kembar · biru = posisi Anda', tr: 'tüm ikizlerin dağılımı · mavi = sizin konumunuz', ko: '모든 트윈 분포 · 파란색 = 당신의 위치', it: 'distribuzione di tutti i gemelli · blu = la tua posizione', nl: 'verdeling van alle twins · blauw = jouw positie', pl: 'rozkład wszystkich bliźniąt · niebieski = twoja pozycja', uk: 'розподіл усіх двійників · синій = ваша позиція', vi: 'phân bổ của tất cả các cặp sinh đôi · xanh = vị trí của bạn', bn: 'সকল যমজের বিতরণ · নীল = আপনার অবস্থান', fa: 'توزیع همه دوقلوها · آبی = موقعیت شما' } as Record<string, string>)[lang] ?? 'distribution of all twins · blue = your position'}
                </span>
              </div>
              <div>
                {TOPICS.map((topic) => {
                  const networkVal = aggregate.averages[topic];
                  const userVal = myTwin ? myTwin[topic] : undefined;
                  const networkPct = Math.round(networkVal * 100);
                  const desc = getTopicDesc(topic, lang);

                  return (
                    <div key={topic} style={{
                      padding: '28px 0',
                      borderTop: '1px solid var(--divider)',
                    }}>
                      <div className="network-topic-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-1)', flexShrink: 0 }}>
                          {getTopicLabel(topic, lang)}
                        </span>
                        <div className="network-pct-group" style={{ display: 'flex', gap: '24px', alignItems: 'center', flexShrink: 0 }}>
                          {userVal !== undefined && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                              {({ de: 'Du', en: 'You', es: 'Tú', fr: 'Toi', pt: 'Tu', ar: 'أنت', zh: '你', ja: 'あなた', hi: 'आप', ru: 'Вы', id: 'Anda', tr: 'Sen', ko: '당신', it: 'Tu', nl: 'Jij', pl: 'Ty', uk: 'Ви', vi: 'Bạn', bn: 'আপনি', fa: 'شما' } as Record<string, string>)[lang] ?? 'You'}: {Math.round(userVal * 100)}%
                            </span>
                          )}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                            Ø {networkPct}%
                          </span>
                        </div>
                      </div>
                      <CompareBar networkValue={networkVal} userValue={userVal} />
                      {histograms[topic] && (
                        <MiniHistogram
                          buckets={histograms[topic]}
                          userBucket={userVal !== undefined ? Math.min(9, Math.floor(userVal * 10)) : undefined}
                        />
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', maxWidth: '45%' }}>{desc.low}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', maxWidth: '45%', textAlign: 'right' }}>{desc.high}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interpretation */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '40px',
              marginBottom: '64px',
            }}>
              <p className="label" style={{ marginBottom: '24px' }}>{t(lang, 'net_interpretation')}</p>
              <p style={{ fontSize: '15px', lineHeight: 1.9, marginBottom: '16px', maxWidth: '620px' }}>
                {t(lang, 'net_top_topics')}{' '}
                <span style={{ color: 'var(--text-1)' }}>
                  {topTopics.map((topic) => getTopicLabel(topic, lang)).join(', ')}.
                </span>
              </p>
              {simView && (
                <p style={{ fontSize: '14px', lineHeight: 1.9, color: 'var(--text-3)', maxWidth: '620px' }}>
                  {t(lang, 'net_demo_note')}
                </p>
              )}
            </div>
          </>
        )}

        {/* Country Stats — real network only */}
        {!simView && Object.keys(countryStats).length > 0 && (() => {
          const sorted = Object.entries(countryStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
          const max = sorted[0]?.[1] ?? 1;
          const totalCountries = Object.keys(countryStats).length;
          const flagOf = (code: string) =>
            code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
          return (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '40px',
              marginBottom: '64px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '32px', flexWrap: 'wrap', gap: '8px' }}>
                <p className="label" style={{ margin: 0 }}>{t(lang, 'net_by_country')}</p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                  {totalCountries} {totalCountries === 1
                    ? (({ de: 'Land', en: 'country', es: 'país', fr: 'pays', pt: 'país', ar: 'دولة', zh: '个国家', ja: 'か国', hi: 'देश', ru: 'страна', id: 'negara', tr: 'ülke', ko: '개국', it: 'paese', nl: 'land', pl: 'kraj', uk: 'країна', vi: 'quốc gia', bn: 'দেশ', fa: 'کشور' } as Record<string, string>)[lang] ?? 'country')
                    : (({ de: 'Länder', en: 'countries', es: 'países', fr: 'pays', pt: 'países', ar: 'دول', zh: '个国家', ja: 'か国', hi: 'देश', ru: 'страны', id: 'negara', tr: 'ülke', ko: '개국', it: 'paesi', nl: 'landen', pl: 'kraje', uk: 'країни', vi: 'quốc gia', bn: 'দেশ', fa: 'کشور' } as Record<string, string>)[lang] ?? 'countries')
                  }
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sorted.map(([code, count]) => (
                  <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '18px', minWidth: '28px', flexShrink: 0 }} aria-hidden="true">
                      {flagOf(code)}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-3)',
                      minWidth: '28px',
                      flexShrink: 0,
                    }}>
                      {code}
                    </span>
                    <div style={{ flex: 1, height: '4px', background: 'var(--divider)', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${Math.round((count / max) * 100)}%`,
                        background: 'var(--accent)',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--text-3)',
                      minWidth: '48px',
                      textAlign: 'right',
                      flexShrink: 0,
                    }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Demo country breakdown — simulation view only */}
        {simView && (() => {
          const flagOf = (code: string) =>
            code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
          const sorted = Object.entries(COUNTRY_AVERAGES)
            .filter(([, d]) => d.count >= 20)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 12);
          const countryLabel = ({ de: 'Länder im Demo-Netzwerk', en: 'Countries in demo network', es: 'Países en la red demo', fr: 'Pays dans le réseau démo', pt: 'Países na rede demo', ar: 'الدول في الشبكة التجريبية', zh: '演示网络中的国家', ja: 'デモネットワークの国', hi: 'डेमो नेटवर्क में देश', ru: 'Страны в демо-сети', id: 'Negara di jaringan demo', tr: 'Demo ağındaki ülkeler', ko: '데모 네트워크의 국가', it: 'Paesi nella rete demo', nl: 'Landen in het demonetwerk', pl: 'Kraje w sieci demo', uk: 'Країни в демо-мережі', vi: 'Quốc gia trong mạng lưới demo', bn: 'ডেমো নেটওয়ার্কে দেশ', fa: 'کشورها در شبکه نمایشی' } as Record<string, string>)[lang] ?? 'Countries in demo network';
          const climateLabel = getTopicLabel('klimaschutz', lang);
          const socialLabel = getTopicLabel('sozialstaat', lang);
          return (
            <div style={{ marginBottom: '64px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
                <p className="label" style={{ margin: 0 }}>{countryLabel}</p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                  {climateLabel} · {socialLabel}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {sorted.map(([code, data]) => {
                  const klimaPct = Math.round((data['klimaschutz'] as number) * 100);
                  const sozialPct = Math.round((data['sozialstaat'] as number) * 100);
                  return (
                    <div key={code} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '16px' }} aria-hidden="true">{flagOf(code)}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-1)', letterSpacing: '0.08em' }}>{code}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', marginLeft: 'auto' }}>{data.count}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', minWidth: '40px' }}>🌍 {klimaPct}%</span>
                          <div style={{ flex: 1, height: '2px', background: 'var(--divider)', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${klimaPct}%`, background: '#22c55e' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-3)', minWidth: '40px' }}>🤝 {sozialPct}%</span>
                          <div style={{ flex: 1, height: '2px', background: 'var(--divider)', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${sozialPct}%`, background: '#ef4444' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* CTA */}
        {!myTwin && loaded && showAggregates && (
          <Link href="/training" style={{
            display: 'inline-block',
            background: 'var(--text-1)',
            color: '#000',
            padding: '14px 32px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {t(lang, 'twin_create')}
          </Link>
        )}

      </div>
    </div>
    </NostrErrorBoundary>
  );
}
