'use client';

/**
 * The single source of truth for "what may this page claim?".
 *
 * Every page that shows collective numbers uses this hook + these components,
 * so the whole product follows ONE honesty regime:
 *   - real twins, deduplicated per person, from the relays
 *   - aggregates only above the k-anonymity threshold (founding phase below)
 *   - demo data only as an explicitly labeled, opt-in simulation
 */

import { useState, useSyncExternalStore } from 'react';
import { makeTx } from '@/lib/tx';
import { subscribeToUniqueNetworkTwins, type NetworkTwin, type NetworkStats } from '@/lib/nostr-reader';
import { networkPhase, type NetworkPhase } from '@/lib/network-policy';
import { DEMO_TWINS } from '@/data/demo-twins';
import type { TwinProfile } from '@/types';

export const NTX: Record<string, Record<string, string>> = {
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
  rg_title:     { de: 'Regionen', en: 'Regions', es: 'Regiones', fr: 'Régions', pt: 'Regiões', ar: 'المناطق', zh: '地区', ja: '地域', hi: 'क्षेत्र', ru: 'Регионы', id: 'Wilayah', tr: 'Bölgeler', ko: '지역', it: 'Regioni', nl: 'Regio’s', pl: 'Regiony', uk: 'Регіони', vi: 'Vùng', bn: 'অঞ্চল', fa: 'مناطق' },
  rg_yours:     { de: 'Deine Region', en: 'Your region', es: 'Tu región', fr: 'Ta région', pt: 'Sua região', ar: 'منطقتك', zh: '你的地区', ja: 'あなたの地域', hi: 'आपका क्षेत्र', ru: 'Ваш регион', id: 'Wilayahmu', tr: 'Senin bölgen', ko: '내 지역', it: 'La tua regione', nl: 'Jouw regio', pl: 'Twój region', uk: 'Ваш регіон', vi: 'Vùng của bạn', bn: 'আপনার অঞ্চল', fa: 'منطقه شما' },
  rg_until:     { de: 'Personen bis zur Freischaltung', en: 'persons until unlock', es: 'personas hasta el desbloqueo', fr: 'personnes avant le déblocage', pt: 'pessoas até desbloquear', ar: 'شخصًا حتى الفتح', zh: '人后解锁', ja: '人で解放', hi: 'व्यक्ति अनलॉक तक', ru: 'человек до открытия', id: 'orang hingga terbuka', tr: 'kişiye kadar kilit açılır', ko: '명이면 잠금 해제', it: 'persone allo sblocco', nl: 'personen tot ontgrendeling', pl: 'osób do odblokowania', uk: 'осіб до відкриття', vi: 'người để mở khóa', bn: 'জন হলে আনলক', fa: 'نفر تا بازگشایی' },
  rg_vs:        { de: 'Abweichung vom Netzwerk-Durchschnitt (Prozentpunkte)', en: 'deviation from the network average (percentage points)', es: 'desviación del promedio de la red (puntos porcentuales)', fr: 'écart par rapport à la moyenne du réseau (points de pourcentage)', pt: 'desvio da média da rede (pontos percentuais)', ar: 'الانحراف عن متوسط الشبكة (نقاط مئوية)', zh: '与网络平均值的偏差（百分点）', ja: 'ネットワーク平均からの乖離（ポイント）', hi: 'नेटवर्क औसत से विचलन (प्रतिशत अंक)', ru: 'отклонение от среднего по сети (п.п.)', id: 'penyimpangan dari rata-rata jaringan (poin persen)', tr: 'ağ ortalamasından sapma (yüzde puanı)', ko: '네트워크 평균과의 편차(퍼센트 포인트)', it: 'scostamento dalla media della rete (punti percentuali)', nl: 'afwijking van het netwerkgemiddelde (procentpunten)', pl: 'odchylenie od średniej sieci (punkty proc.)', uk: 'відхилення від середнього мережі (в. п.)', vi: 'độ lệch so với trung bình mạng (điểm phần trăm)', bn: 'নেটওয়ার্ক গড় থেকে বিচ্যুতি (শতাংশ পয়েন্ট)', fa: 'انحراف از میانگین شبکه (واحد درصد)' },
  rg_none:      { de: 'Noch keine Regionsangaben im Netzwerk — sei die erste Person aus deiner Region.', en: 'No regions in the network yet — be the first person from yours.', es: 'Aún no hay regiones en la red — sé la primera persona de la tuya.', fr: 'Pas encore de régions dans le réseau — sois la première personne de la tienne.', pt: 'Ainda não há regiões na rede — seja a primeira pessoa da sua.', ar: 'لا مناطق في الشبكة بعد — كن أول شخص من منطقتك.', zh: '网络中还没有地区数据——成为你所在地区的第一人。', ja: 'ネットワークにはまだ地域がありません — あなたの地域の第一号になりましょう。', hi: 'नेटवर्क में अभी कोई क्षेत्र नहीं — अपने क्षेत्र के पहले व्यक्ति बनें।', ru: 'В сети пока нет регионов — станьте первым из своего.', id: 'Belum ada wilayah di jaringan — jadilah orang pertama dari wilayahmu.', tr: 'Ağda henüz bölge yok — kendi bölgenden ilk kişi ol.', ko: '네트워크에 아직 지역이 없습니다 — 당신 지역의 첫 번째 사람이 되세요.', it: 'Ancora nessuna regione nella rete — sii la prima persona della tua.', nl: 'Nog geen regio’s in het netwerk — wees de eerste uit jouw regio.', pl: 'W sieci nie ma jeszcze regionów — bądź pierwszą osobą ze swojego.', uk: 'У мережі ще немає регіонів — станьте першим зі свого.', vi: 'Chưa có vùng nào trong mạng — hãy là người đầu tiên từ vùng của bạn.', bn: 'নেটওয়ার্কে এখনো কোনো অঞ্চল নেই — আপনার অঞ্চলের প্রথম ব্যক্তি হোন।', fa: 'هنوز منطقه‌ای در شبکه نیست — نخستین نفر از منطقه خود باشید.' },
  locked_hint:  { de: 'Positioniere deinen Zwilling, um zu sehen, wie das Netzwerk denkt.', en: 'Position your twin to see how the network thinks.', es: 'Posiciona tu gemelo para ver cómo piensa la red.', fr: 'Positionne ton jumeau pour voir ce que pense le réseau.', pt: 'Posicione seu gêmeo para ver como a rede pensa.', ar: 'حدد موقف توأمك لترى كيف تفكر الشبكة.', zh: '先确定你的孪生立场，再查看网络的想法。', ja: 'ツインの立場を決めると、ネットワークの考えが見られます。', hi: 'नेटवर्क की राय देखने के लिए पहले अपने जुड़वां की स्थिति तय करें।', ru: 'Определите позицию двойника, чтобы увидеть мнение сети.', id: 'Tentukan posisi kembaranmu untuk melihat pendapat jaringan.', tr: 'Ağın ne düşündüğünü görmek için önce ikizinin konumunu belirle.', ko: '네트워크의 생각을 보려면 먼저 트윈의 입장을 정하세요.', it: 'Posiziona il tuo gemello per vedere cosa pensa la rete.', nl: 'Positioneer je tweeling om te zien hoe het netwerk denkt.', pl: 'Określ pozycję bliźniaka, aby zobaczyć, co myśli sieć.', uk: 'Визначте позицію двійника, щоб побачити думку мережі.', vi: 'Xác định vị trí sinh đôi để xem mạng nghĩ gì.', bn: 'নেটওয়ার্ক কী ভাবে দেখতে আগে যমজের অবস্থান ঠিক করুন।', fa: 'موضع دوقلوی خود را مشخص کنید تا نظر شبکه را ببینید.' },
};

export const ntx = makeTx(NTX);

/**
 * Session-wide cache: at thousands of visitors, every page navigation must NOT
 * re-query six relays. One fetch feeds all pages; refreshed after a short TTL.
 */
type TruthState = { twins: NetworkTwin[]; stats: NetworkStats; eose: boolean };
let truthCache: TruthState = { twins: [], stats: { events: 0, persons: 0, verified: 0 }, eose: false };
let truthFetchedAt = 0;
let truthInflight = false;
const truthListeners = new Set<() => void>();
const TRUTH_TTL_MS = 60_000;

function notifyTruth() {
  for (const l of truthListeners) l();
}

// useSyncExternalStore contract: subscribe + snapshot of the module-level cache
function subscribeTruth(cb: () => void) {
  truthListeners.add(cb);
  ensureTruthSubscription();
  return () => { truthListeners.delete(cb); };
}
const getTruth = () => truthCache;

function ensureTruthSubscription() {
  if (truthInflight) return;
  if (truthCache.eose && Date.now() - truthFetchedAt < TRUTH_TTL_MS) return;
  truthInflight = true;

  const settle = () => {
    if (!truthInflight) return;
    truthInflight = false;
    truthCache = { ...truthCache, eose: true };
    truthFetchedAt = Date.now();
    notifyTruth();
  };

  subscribeToUniqueNetworkTwins(
    (twins, stats) => {
      truthCache = { ...truthCache, twins, stats };
      notifyTruth();
    },
    settle,
    30000,
  );
  setTimeout(settle, 8000); // relays that never answer must not block the UI
}

export function useNetworkTwins() {
  const state = useSyncExternalStore(subscribeTruth, getTruth, getTruth);
  const [simView, setSimView] = useState(false);

  const { twins, stats, eose } = state;
  const phase: NetworkPhase = networkPhase(stats.persons);
  const showAggregates = simView || phase === 'live';
  const displayTwins: TwinProfile[] = simView ? DEMO_TWINS : twins;

  return { twins, stats, eose, phase, simView, setSimView, showAggregates, displayTwins };
}

export function SimulationBanner({ lang, onExit }: { lang: string; onExit: () => void }) {
  return (
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
        {ntx(lang, 'sim_badge')}
      </span>
      <button
        onClick={onExit}
        style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
      >
        {ntx(lang, 'sim_off')}
      </button>
    </div>
  );
}

export function FoundingNotice({ lang, persons, onSimulate }: {
  lang: string;
  persons: number;
  onSimulate?: () => void;
}) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '32px 28px',
      marginBottom: '48px',
    }}>
      <p className="label" style={{ marginBottom: '16px' }}>{ntx(lang, 'founding_title')}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '34px', color: 'var(--text-1)' }}>{persons}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>{ntx(lang, 'persons')}</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: onSimulate ? '20px' : 0, maxWidth: '520px' }}>
        {ntx(lang, 'founding_cta')}
      </p>
      {onSimulate && (
        <>
          <button
            onClick={onSimulate}
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', padding: '11px 20px', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}
          >
            {ntx(lang, 'sim_on')}
          </button>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '14px', maxWidth: '520px' }}>
            {ntx(lang, 'sim_why')}
          </p>
        </>
      )}
    </div>
  );
}
