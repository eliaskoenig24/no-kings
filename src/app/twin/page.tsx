'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getMyTwin, saveMyTwin } from '@/lib/db';
import { TwinProfile, TOPICS, TopicKey } from '@/types';
import dynamic from 'next/dynamic';
const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });
import { getOrCreateIdentity } from '@/lib/identity';
import { publishTwin } from '@/lib/nostr';
import { useLang } from '@/context/LangContext';
import { SPECTRUM, getTopicLabel } from '@/lib/i18n';
import { generateShareCard, shareOrDownloadCard } from '@/lib/share-card';
import { createTwinFromValues, classifyTwin } from '@/lib/twin-engine';
import { AGENDA } from '@/data/agenda';
import { inferPosition } from '@/lib/inference';
// Positions are shown in ONE neutral color: high/low is a stance, not a score.
// (Red-to-green coloring silently frames one pole as "good" — a neutrality bug.)
const POSITION_COLOR = '#4B9EFF';

const ARCHETYPE_NAMES: Record<string, Record<string, string>> = {
  progressive:  { de: 'Progressiv', en: 'Progressive', es: 'Progresista', fr: 'Progressiste', pt: 'Progressista', ar: 'تقدمي', zh: '进步派', ja: 'プログレッシブ', hi: 'प्रगतिशील', ru: 'Прогрессист', id: 'Progresif', tr: 'İlerici', ko: '진보적', it: 'Progressista', nl: 'Progressief', pl: 'Progresywny', uk: 'Прогресивний', vi: 'Tiến bộ', bn: 'প্রগতিশীল', fa: 'پیشرو' },
  socialdem:    { de: 'Sozialdemokrat', en: 'Social Democrat', es: 'Socialdemócrata', fr: 'Social-démocrate', pt: 'Social-democrata', ar: 'ديمقراطي اجتماعي', zh: '社会民主', ja: '社会民主', hi: 'सामाजिक लोकतांत्रिक', ru: 'Соц-демократ', id: 'Sosial-demokrat', tr: 'Sosyal-demokrat', ko: '사회민주', it: 'Socialdemocratico', nl: 'Sociaal-democraat', pl: 'Socjaldemokrata', uk: 'Соц-демократ', vi: 'Dân chủ xã hội', bn: 'সোশ্যাল ডেমোক্র্যাট', fa: 'سوسیال دموکرات' },
  liberal:      { de: 'Liberal', en: 'Liberal', es: 'Liberal', fr: 'Libéral', pt: 'Liberal', ar: 'ليبرالي', zh: '自由主义', ja: 'リベラル', hi: 'उदारवादी', ru: 'Либерал', id: 'Liberal', tr: 'Liberal', ko: '자유주의', it: 'Liberale', nl: 'Liberaal', pl: 'Liberał', uk: 'Ліберал', vi: 'Tự do', bn: 'উদারপন্থী', fa: 'لیبرال' },
  conservative: { de: 'Konservativ', en: 'Conservative', es: 'Conservador', fr: 'Conservateur', pt: 'Conservador', ar: 'محافظ', zh: '保守派', ja: '保守', hi: 'रूढ़िवादी', ru: 'Консерватор', id: 'Konservatif', tr: 'Muhafazakâr', ko: '보수', it: 'Conservatore', nl: 'Conservatief', pl: 'Konserwatysta', uk: 'Консерватор', vi: 'Bảo thủ', bn: 'রক্ষণশীল', fa: 'محافظه‌کار' },
  libertarian:  { de: 'Libertär', en: 'Libertarian', es: 'Libertario', fr: 'Libertarien', pt: 'Libertário', ar: 'ليبرتاري', zh: '自由意志', ja: 'リバタリアン', hi: 'स्वतंत्रतावादी', ru: 'Либертарий', id: 'Libertarian', tr: 'Liberteryenist', ko: '자유지상주의', it: 'Libertario', nl: 'Libertariër', pl: 'Libertarianin', uk: 'Лібертаріанець', vi: 'Tự do chủ nghĩa', bn: 'স্বাধীনতাবাদী', fa: 'آزادی‌خواه' },
  centrist:     { de: 'Zentristisch', en: 'Centrist', es: 'Centrista', fr: 'Centriste', pt: 'Centrista', ar: 'وسطي', zh: '中间派', ja: '中道', hi: 'मध्यमार्गी', ru: 'Центрист', id: 'Sentris', tr: 'Merkezi', ko: '중도', it: 'Centrista', nl: 'Centrist', pl: 'Centrysta', uk: 'Центрист', vi: 'Trung dung', bn: 'মধ্যপন্থী', fa: 'میانে‌رو' },
};

const TX = {
  no_twin:    { de: 'Noch kein Zwilling', en: 'No twin yet', es: 'Aún sin gemelo', fr: 'Pas encore de jumeau', pt: 'Ainda sem gêmeo', ar: 'لا توأم بعد', zh: '尚无孪生', ja: 'まだツインがありません', hi: 'अभी कोई जुड़वां नहीं', ru: 'Двойника ещё нет', id: 'Belum ada kembaran', tr: 'Henüz ikiz yok', ko: '아직 트윈 없음', it: 'Ancora nessun gemello', nl: 'Nog geen tweeling', pl: 'Jeszcze brak bliźniaka', uk: 'Двійника ще немає', vi: 'Chưa có sinh đôi', bn: 'এখনো কোনো যমজ নেই', fa: 'هنوز دوقلویی ندارید' },
  create:     { de: 'Zwilling trainieren →', en: 'Train your twin →', es: 'Entrena tu gemelo →', fr: 'Entraîne ton jumeau →', pt: 'Treine seu gêmeo →', ar: 'درّب توأمك ←', zh: '训练你的孪生 →', ja: 'ツインを訓練する →', hi: 'अपना जुड़वां प्रशिक्षित करें →', ru: 'Обучить своего двойника →', id: 'Latih kembaranmu →', tr: 'İkizini eğit →', ko: '트윈 훈련시키기 →', it: 'Allena il tuo gemello →', nl: 'Train jouw tweeling →', pl: 'Trenuj bliźniaka →', uk: 'Навчити двійника →', vi: 'Huấn luyện sinh đôi →', bn: 'যমজ প্রশিক্ষণ দাও →', fa: 'دوقلوی خود را آموزش دهید ←' },
  label:      { de: 'MEIN ZWILLING', en: 'MY TWIN', es: 'MI GEMELO', fr: 'MON JUMEAU', pt: 'MEU GÊMEO', ar: 'توأمي', zh: '我的孪生', ja: '私のツイン', hi: 'मेरा जुड़वां', ru: 'МОЙ ДВОЙНИК', id: 'KEMBARAN SAYA', tr: 'BENİM İKİZİM', ko: '내 트윈', it: 'IL MIO GEMELLO', nl: 'MIJN TWEELING', pl: 'MÓJ BLIŹNIAK', uk: 'МІЙ ДВІЙНИК', vi: 'SINH ĐÔI CỦA TÔI', bn: 'আমার যমজ', fa: 'دوقلوی من' },
  dims:       { de: 'Politische Dimensionen', en: 'Political dimensions', es: 'Dimensiones políticas', fr: 'Dimensions politiques', pt: 'Dimensões políticas', ar: 'الأبعاد السياسية', zh: '政治维度', ja: '政治的次元', hi: 'राजनीतिक आयाम', ru: 'Политические измерения', id: 'Dimensi politik', tr: 'Siyasi boyutlar', ko: '정치적 차원', it: 'Dimensioni politiche', nl: 'Politieke dimensies', pl: 'Wymiary polityczne', uk: 'Політичні виміри', vi: 'Các chiều chính trị', bn: 'রাজনৈতিক মাত্রা', fa: 'ابعاد سیاسی' },
  world:      { de: 'Welt-Ø', en: 'World avg', es: 'Prom. mundial', fr: 'Moy. mondiale', pt: 'Média mundial', ar: 'متوسط العالم', zh: '世界均值', ja: '世界平均', hi: 'विश्व औसत', ru: 'Мировой ср.', id: 'Rata-rata dunia', tr: 'Dünya ort.', ko: '세계 평균', it: 'Media mondiale', nl: 'Wereldgemiddelde', pl: 'Śr. świat.', uk: 'Середнє світу', vi: 'TB thế giới', bn: 'বিশ্ব গড়', fa: 'میانگین جهانی' },
  positions:  { de: 'Mein Zwilling bei globalen Fragen', en: 'My twin on global questions', es: 'Mi gemelo en preguntas globales', fr: 'Mon jumeau sur les questions mondiales', pt: 'Meu gêmeo nas questões globais', ar: 'توأمي حول الأسئلة العالمية', zh: '我的孪生对全球问题的立场', ja: 'グローバルな質問に対する私のツイン', hi: 'वैश्विक प्रश्नों पर मेरा जुड़वां', ru: 'Мой двойник по глобальным вопросам', id: 'Kembaranku tentang pertanyaan global', tr: 'İkizimin küresel sorulara cevabı', ko: '글로벌 질문에 대한 내 트윈', it: 'Il mio gemello sulle questioni globali', nl: 'Mijn tweeling over mondiale vragen', pl: 'Mój bliźniak o globalnych kwestiach', uk: 'Мій двійник з глобальних питань', vi: 'Sinh đôi của tôi về các câu hỏi toàn cầu', bn: 'বৈশ্বিক প্রশ্নে আমার যমজ', fa: 'دوقلوی من در سؤالات جهانی' },
  support:    { de: 'dafür', en: 'supports', es: 'a favor', fr: 'pour', pt: 'a favor', ar: 'مؤيد', zh: '支持', ja: '支持', hi: 'पक्ष में', ru: 'за', id: 'mendukung', tr: 'destek', ko: '찬성', it: 'a favore', nl: 'voor', pl: 'za', uk: 'за', vi: 'ủng hộ', bn: 'সমর্থন', fa: 'موافق' },
  oppose:     { de: 'dagegen', en: 'opposes', es: 'en contra', fr: 'contre', pt: 'contra', ar: 'معارض', zh: '反对', ja: '反対', hi: 'विरोध में', ru: 'против', id: 'menolak', tr: 'karşı', ko: '반대', it: 'contro', nl: 'tegen', pl: 'przeciw', uk: 'проти', vi: 'phản đối', bn: 'বিরোধ', fa: 'مخالف' },
  share_btn:  { de: 'Ins Netzwerk teilen', en: 'Share to network', es: 'Compartir en la red', fr: 'Partager sur le réseau', pt: 'Compartilhar na rede', ar: 'مشاركة في الشبكة', zh: '分享到网络', ja: 'ネットワークに共有', hi: 'नेटवर्क में साझा करें', ru: 'Поделиться в сети', id: 'Bagikan ke jaringan', tr: 'Ağa paylaş', ko: '네트워크에 공유', it: 'Condividi nella rete', nl: 'Delen met netwerk', pl: 'Udostępnij w sieci', uk: 'Поділитися в мережі', vi: 'Chia sẻ lên mạng', bn: 'নেটওয়ার্কে শেয়ার করুন', fa: 'اشتراک‌گذاری در شبکه' },
  shared:     { de: '✓ Zwilling ist im Netzwerk', en: '✓ Twin is in the network', es: '✓ Gemelo está en la red', fr: '✓ Jumeau dans le réseau', pt: '✓ Gêmeo na rede', ar: '✓ التوأم في الشبكة', zh: '✓ 孪生已在网络中', ja: '✓ ツインはネットワーク上', hi: '✓ जुड़वां नेटवर्क में है', ru: '✓ Двойник в сети', id: '✓ Kembaran ada di jaringan', tr: '✓ İkiz ağda', ko: '✓ 트윈이 네트워크에 있음', it: '✓ Gemello nella rete', nl: '✓ Tweeling in netwerk', pl: '✓ Bliźniak jest w sieci', uk: '✓ Двійник у мережі', vi: '✓ Sinh đôi đã trong mạng', bn: '✓ যমজ নেটওয়ার্কে আছে', fa: '✓ دوقلو در شبکه است' },
  sharing:    { de: 'Wird geteilt…', en: 'Sharing…', es: 'Compartiendo…', fr: 'Partage…', pt: 'Compartilhando…', ar: 'جارٍ المشاركة…', zh: '共享中…', ja: '共有中…', hi: 'साझा हो रहा है…', ru: 'Публикуется…', id: 'Berbagi…', tr: 'Paylaşılıyor…', ko: '공유 중…', it: 'Condivisione…', nl: 'Delen…', pl: 'Udostępnianie…', uk: 'Публікація…', vi: 'Đang chia sẻ…', bn: 'শেয়ার হচ্ছে…', fa: 'در حال اشتراک‌گذاری…' },
  share_hint: { de: 'Dein Profil wird anonym via Nostr geteilt — kein Name, kein Login.', en: 'Your profile is shared anonymously via Nostr — no name, no login.', es: 'Tu perfil se comparte de forma anónima a través de Nostr — sin nombre, sin inicio de sesión.', fr: 'Ton profil est partagé anonymement via Nostr — sans nom, sans connexion.', pt: 'Seu perfil é compartilhado anonimamente via Nostr — sem nome, sem login.', ar: 'ملفك الشخصي يُشارك بشكل مجهول عبر نوسترا — بدون اسم، بدون تسجيل دخول.', zh: '您的档案通过Nostr匿名共享——无姓名，无登录。', ja: 'プロフィールはNostr経由で匿名共有されます — 名前なし、ログインなし。', hi: 'आपका प्रोफ़ाइल Nostr के माध्यम से गुमनाम रूप से साझा किया जाता है — कोई नाम नहीं, कोई लॉगिन नहीं।', ru: 'Ваш профиль анонимно публикуется через Nostr — без имени, без входа.', id: 'Profil Anda dibagikan secara anonim melalui Nostr — tanpa nama, tanpa login.', tr: 'Profiliniz Nostr aracılığıyla anonim olarak paylaşılır — isim yok, giriş yok.', ko: '프로필이 Nostr를 통해 익명으로 공유됩니다 — 이름 없음, 로그인 없음.', it: 'Il tuo profilo viene condiviso anonimamente tramite Nostr — nessun nome, nessun login.', nl: 'Je profiel wordt anoniem gedeeld via Nostr — geen naam, geen login.', pl: 'Twój profil jest udostępniany anonimowo przez Nostr — bez nazwy, bez logowania.', uk: 'Ваш профіль анонімно публікується через Nostr — без імені, без входу.', vi: 'Hồ sơ của bạn được chia sẻ ẩn danh qua Nostr — không tên, không đăng nhập.', bn: 'তোমার প্রোফাইল Nostr এর মাধ্যমে বেনামে শেয়ার করা হয় — কোনো নাম নেই, কোনো লগইন নেই।', fa: 'پروفایل شما به صورت ناشناس از طریق Nostr به اشتراک گذاشته می‌شود — بدون نام، بدون ورود.' },
  backup_title: { de: 'Wichtig: Schlüssel sichern', en: 'Important: back up your key', es: 'Importante: guarda tu clave', fr: 'Important : sauvegarde ta clé', pt: 'Importante: faça backup da chave', ar: 'مهم: انسخ مفتاحك احتياطيًا', zh: '重要：请备份你的密钥', ja: '重要：鍵をバックアップして', hi: 'महत्वपूर्ण: कुंजी का बैकअप लें', ru: 'Важно: сохраните копию ключа', id: 'Penting: cadangkan kuncimu', tr: 'Önemli: anahtarını yedekle', ko: '중요: 키를 백업하세요', it: 'Importante: fai il backup della chiave', nl: 'Belangrijk: back-up je sleutel', pl: 'Ważne: zrób kopię klucza', uk: 'Важливо: збережіть копію ключа', vi: 'Quan trọng: sao lưu khóa của bạn', bn: 'গুরুত্বপূর্ণ: কী ব্যাকআপ করুন', fa: 'مهم: از کلیدتان پشتیبان بگیرید' },
  backup_body: { de: 'Dein Zwilling ist im Netzwerk — aber dein Schlüssel existiert nur auf diesem Gerät. Werden die Browserdaten gelöscht (iPhone macht das nach 7 Tagen ohne Besuch automatisch!), kannst du deinen Zwilling nie wieder ändern. Sichern dauert 30 Sekunden.', en: 'Your twin is in the network — but your key exists only on this device. If browser data is cleared (iPhone does this automatically after 7 days without a visit!), you can never change your twin again. Backing up takes 30 seconds.', es: 'Tu gemelo está en la red, pero tu clave solo existe en este dispositivo. Si se borran los datos del navegador (¡el iPhone lo hace automáticamente tras 7 días sin visitas!), nunca podrás volver a cambiar tu gemelo. La copia tarda 30 segundos.', fr: 'Ton jumeau est dans le réseau — mais ta clé n’existe que sur cet appareil. Si les données du navigateur sont effacées (l’iPhone le fait automatiquement après 7 jours sans visite !), tu ne pourras plus jamais modifier ton jumeau. La sauvegarde prend 30 secondes.', pt: 'Seu gêmeo está na rede — mas sua chave existe apenas neste dispositivo. Se os dados do navegador forem apagados (o iPhone faz isso automaticamente após 7 dias sem visitas!), você nunca mais poderá alterar seu gêmeo. O backup leva 30 segundos.', ar: 'توأمك في الشبكة — لكن مفتاحك موجود على هذا الجهاز فقط. إذا حُذفت بيانات المتصفح (يفعل الآيفون ذلك تلقائيًا بعد 7 أيام دون زيارة!) فلن تتمكن أبدًا من تغيير توأمك. النسخ الاحتياطي يستغرق 30 ثانية.', zh: '你的孪生已在网络中——但你的密钥只存在于此设备上。如果浏览器数据被清除（iPhone 在 7 天未访问后会自动清除！），你将永远无法再修改你的孪生。备份只需 30 秒。', ja: 'ツインはネットワーク上にありますが、鍵はこのデバイスにしか存在しません。ブラウザデータが消去されると（iPhoneは7日間アクセスがないと自動的に消去します！）、ツインを二度と変更できなくなります。バックアップは30秒で完了します。', hi: 'आपका जुड़वां नेटवर्क में है — लेकिन आपकी कुंजी केवल इस डिवाइस पर है। ब्राउज़र डेटा हटने पर (iPhone 7 दिन बिना विज़िट के इसे अपने आप हटा देता है!) आप अपना जुड़वां फिर कभी नहीं बदल पाएंगे। बैकअप में 30 सेकंड लगते हैं।', ru: 'Ваш двойник в сети — но ключ существует только на этом устройстве. Если данные браузера будут удалены (iPhone делает это автоматически после 7 дней без посещений!), вы больше никогда не сможете изменить своего двойника. Копирование занимает 30 секунд.', id: 'Kembaranmu ada di jaringan — tetapi kuncimu hanya ada di perangkat ini. Jika data browser dihapus (iPhone melakukannya otomatis setelah 7 hari tanpa kunjungan!), kamu tak akan pernah bisa mengubah kembaranmu lagi. Pencadangan hanya butuh 30 detik.', tr: 'İkizin ağda — ama anahtarın yalnızca bu cihazda var. Tarayıcı verileri silinirse (iPhone bunu 7 gün ziyaret olmayınca otomatik yapar!), ikizini bir daha asla değiştiremezsin. Yedekleme 30 saniye sürer.', ko: '트윈은 네트워크에 있지만 키는 이 기기에만 존재합니다. 브라우저 데이터가 삭제되면(iPhone은 7일간 방문이 없으면 자동 삭제합니다!) 트윈을 다시는 변경할 수 없습니다. 백업은 30초면 됩니다.', it: 'Il tuo gemello è nella rete — ma la tua chiave esiste solo su questo dispositivo. Se i dati del browser vengono cancellati (l’iPhone lo fa automaticamente dopo 7 giorni senza visite!), non potrai mai più modificare il tuo gemello. Il backup richiede 30 secondi.', nl: 'Je tweeling is in het netwerk — maar je sleutel bestaat alleen op dit apparaat. Als browserdata wordt gewist (iPhone doet dat automatisch na 7 dagen zonder bezoek!), kun je je tweeling nooit meer wijzigen. Back-uppen duurt 30 seconden.', pl: 'Twój bliźniak jest w sieci — ale klucz istnieje tylko na tym urządzeniu. Jeśli dane przeglądarki zostaną usunięte (iPhone robi to automatycznie po 7 dniach bez wizyty!), nigdy więcej nie zmienisz swojego bliźniaka. Kopia zajmuje 30 sekund.', uk: 'Ваш двійник у мережі — але ключ існує лише на цьому пристрої. Якщо дані браузера буде видалено (iPhone робить це автоматично після 7 днів без відвідувань!), ви більше ніколи не зможете змінити свого двійника. Копіювання триває 30 секунд.', vi: 'Sinh đôi của bạn đã ở trong mạng — nhưng khóa chỉ tồn tại trên thiết bị này. Nếu dữ liệu trình duyệt bị xóa (iPhone tự động xóa sau 7 ngày không truy cập!), bạn sẽ không bao giờ thay đổi được sinh đôi nữa. Sao lưu chỉ mất 30 giây.', bn: 'আপনার যমজ নেটওয়ার্কে আছে — কিন্তু কী শুধু এই ডিভাইসে আছে। ব্রাউজার ডেটা মুছে গেলে (iPhone ৭ দিন ভিজিট না হলে স্বয়ংক্রিয়ভাবে মুছে দেয়!) আপনি আর কখনো যমজ বদলাতে পারবেন না। ব্যাকআপে ৩০ সেকেন্ড লাগে।', fa: 'دوقلوی شما در شبکه است — اما کلیدتان فقط روی این دستگاه وجود دارد. اگر داده‌های مرورگر پاک شود (آیفون پس از ۷ روز بدون بازدید خودکار این کار را می‌کند!) دیگر هرگز نمی‌توانید دوقلوی خود را تغییر دهید. پشتیبان‌گیری ۳۰ ثانیه طول می‌کشد.' },
  backup_btn: { de: 'Schlüssel jetzt sichern →', en: 'Back up key now →', es: 'Guardar clave ahora →', fr: 'Sauvegarder la clé →', pt: 'Fazer backup agora →', ar: 'انسخ المفتاح الآن ←', zh: '立即备份密钥 →', ja: '今すぐバックアップ →', hi: 'अभी बैकअप लें →', ru: 'Сохранить ключ →', id: 'Cadangkan sekarang →', tr: 'Şimdi yedekle →', ko: '지금 백업하기 →', it: 'Salva la chiave ora →', nl: 'Nu back-uppen →', pl: 'Zapisz klucz teraz →', uk: 'Зберегти ключ →', vi: 'Sao lưu ngay →', bn: 'এখনই ব্যাকআপ করুন →', fa: 'همین حالا پشتیبان بگیرید ←' },
  card_btn: { de: 'Als Bild teilen', en: 'Share as image', es: 'Compartir como imagen', fr: 'Partager en image', pt: 'Compartilhar como imagem', ar: 'مشاركة كصورة', zh: '以图片分享', ja: '画像として共有', hi: 'छवि के रूप में साझा करें', ru: 'Поделиться картинкой', id: 'Bagikan sebagai gambar', tr: 'Görsel olarak paylaş', ko: '이미지로 공유', it: 'Condividi come immagine', nl: 'Delen als afbeelding', pl: 'Udostępnij jako obraz', uk: 'Поділитися зображенням', vi: 'Chia sẻ dưới dạng ảnh', bn: 'ছবি হিসেবে শেয়ার করুন', fa: 'اشتراک به صورت تصویر' },
  card_making: { de: 'Erstelle Bild…', en: 'Creating image…', es: 'Creando imagen…', fr: 'Création de l’image…', pt: 'Criando imagem…', ar: 'جارٍ إنشاء الصورة…', zh: '正在生成图片…', ja: '画像を作成中…', hi: 'छवि बन रही है…', ru: 'Создание картинки…', id: 'Membuat gambar…', tr: 'Görsel oluşturuluyor…', ko: '이미지 생성 중…', it: 'Creazione immagine…', nl: 'Afbeelding maken…', pl: 'Tworzenie obrazu…', uk: 'Створення зображення…', vi: 'Đang tạo ảnh…', bn: 'ছবি তৈরি হচ্ছে…', fa: 'در حال ساخت تصویر…' },
  card_headline: { de: 'Mein digitaler Zwilling', en: 'My digital twin', es: 'Mi gemelo digital', fr: 'Mon jumeau numérique', pt: 'Meu gêmeo digital', ar: 'توأمي الرقمي', zh: '我的数字孪生', ja: '私のデジタルツイン', hi: 'मेरा डिजिटल जुड़वां', ru: 'Мой цифровой двойник', id: 'Kembaran digitalku', tr: 'Dijital ikizim', ko: '나의 디지털 트윈', it: 'Il mio gemello digitale', nl: 'Mijn digitale tweeling', pl: 'Mój cyfrowy bliźniak', uk: 'Мій цифровий двійник', vi: 'Sinh đôi kỹ thuật số của tôi', bn: 'আমার ডিজিটাল যমজ', fa: 'دوقلوی دیجیتال من' },
  consent_title: { de: 'Bevor du teilst', en: 'Before you share', es: 'Antes de compartir', fr: 'Avant de partager', pt: 'Antes de compartilhar', ar: 'قبل المشاركة', zh: '分享之前', ja: '共有する前に', hi: 'साझा करने से पहले', ru: 'Прежде чем поделиться', id: 'Sebelum berbagi', tr: 'Paylaşmadan önce', ko: '공유하기 전에', it: 'Prima di condividere', nl: 'Voordat je deelt', pl: 'Zanim udostępnisz', uk: 'Перш ніж поділитися', vi: 'Trước khi chia sẻ', bn: 'শেয়ার করার আগে', fa: 'پیش از اشتراک‌گذاری' },
  consent_body: { de: 'Dein Zwilling wird pseudonym, aber öffentlich und dauerhaft auf dezentralen Nostr-Relays gespeichert. Politische Positionen sind sensible Daten — von den Relays kann nichts gelöscht werden. Es gilt: ein Schlüsselpaar, ein Zwilling; erneutes Teilen ersetzt deinen Eintrag, statt einen zweiten anzulegen.', en: 'Your twin is stored pseudonymously but publicly and permanently on decentralized Nostr relays. Political positions are sensitive data — nothing can be deleted from the relays. One keypair, one twin: sharing again replaces your record instead of adding a second one.', es: 'Tu gemelo se guarda de forma seudónima pero pública y permanente en relés Nostr descentralizados. Las posiciones políticas son datos sensibles — nada puede borrarse de los relés. Un par de claves, un gemelo: compartir de nuevo reemplaza tu registro en vez de crear otro.', fr: 'Ton jumeau est stocké de façon pseudonyme mais publique et permanente sur des relais Nostr décentralisés. Les positions politiques sont des données sensibles — rien ne peut être effacé des relais. Une paire de clés, un jumeau : repartager remplace ton enregistrement au lieu d’en créer un second.', pt: 'Seu gêmeo é armazenado de forma pseudônima, mas pública e permanente em relays Nostr descentralizados. Posições políticas são dados sensíveis — nada pode ser apagado dos relays. Um par de chaves, um gêmeo: compartilhar de novo substitui seu registro em vez de criar outro.', ar: 'يُخزَّن توأمك باسم مستعار لكن بشكل علني ودائم على مرحّلات نوستر لامركزية. المواقف السياسية بيانات حساسة — لا يمكن حذف شيء من المرحّلات. زوج مفاتيح واحد، توأم واحد: المشاركة مجددًا تستبدل سجلك بدلًا من إضافة ثانٍ.', zh: '你的孪生以化名但公开且永久的方式存储在去中心化的 Nostr 中继上。政治立场是敏感数据——中继上的内容无法删除。一对密钥，一个孪生：再次分享会替换你的记录，而不是新增一条。', ja: 'ツインは仮名ですが、分散型Nostrリレー上に公開かつ永久に保存されます。政治的立場はセンシティブなデータです — リレーからは何も削除できません。鍵ペアは1つ、ツインも1つ：再共有すると記録は置き換えられます。', hi: 'आपका जुड़वां छद्म नाम से लेकिन सार्वजनिक और स्थायी रूप से विकेंद्रीकृत Nostr रिले पर संग्रहीत होता है। राजनीतिक स्थितियां संवेदनशील डेटा हैं — रिले से कुछ भी हटाया नहीं जा सकता। एक कुंजी-युग्म, एक जुड़वां: दोबारा साझा करने से रिकॉर्ड बदल जाता है, दूसरा नहीं बनता।', ru: 'Ваш двойник хранится псевдонимно, но публично и навсегда на децентрализованных релеях Nostr. Политические позиции — чувствительные данные; с релеев ничего нельзя удалить. Одна пара ключей — один двойник: повторная публикация заменяет запись, а не добавляет вторую.', id: 'Kembaranmu disimpan secara pseudonim tetapi publik dan permanen di relay Nostr terdesentralisasi. Posisi politik adalah data sensitif — tidak ada yang bisa dihapus dari relay. Satu pasangan kunci, satu kembaran: berbagi lagi menggantikan catatanmu, bukan menambah yang kedua.', tr: 'İkizin takma adla ama herkese açık ve kalıcı olarak merkeziyetsiz Nostr rölelerinde saklanır. Siyasi görüşler hassas veridir — rölelerden hiçbir şey silinemez. Bir anahtar çifti, bir ikiz: yeniden paylaşmak kaydını değiştirir, ikincisini eklemez.', ko: '트윈은 가명이지만 공개적으로, 영구히 분산형 Nostr 릴레이에 저장됩니다. 정치적 입장은 민감한 데이터이며 릴레이에서는 아무것도 삭제할 수 없습니다. 키 쌍 하나에 트윈 하나: 다시 공유하면 기록이 교체됩니다.', it: 'Il tuo gemello è salvato in forma pseudonima ma pubblica e permanente su relay Nostr decentralizzati. Le posizioni politiche sono dati sensibili — nulla può essere cancellato dai relay. Una coppia di chiavi, un gemello: ricondividere sostituisce il tuo record invece di crearne un secondo.', nl: 'Je tweeling wordt pseudoniem maar openbaar en permanent opgeslagen op gedecentraliseerde Nostr-relays. Politieke standpunten zijn gevoelige data — van de relays kan niets worden verwijderd. Eén sleutelpaar, één tweeling: opnieuw delen vervangt je record in plaats van een tweede toe te voegen.', pl: 'Twój bliźniak jest zapisywany pseudonimowo, ale publicznie i na stałe na zdecentralizowanych przekaźnikach Nostr. Poglądy polityczne to dane wrażliwe — z przekaźników nic nie da się usunąć. Jedna para kluczy, jeden bliźniak: ponowne udostępnienie zastępuje wpis, zamiast dodawać drugi.', uk: 'Ваш двійник зберігається псевдонімно, але публічно й назавжди на децентралізованих релеях Nostr. Політичні позиції — чутливі дані; з релеїв нічого не можна видалити. Одна пара ключів — один двійник: повторна публікація замінює запис, а не додає другий.', vi: 'Sinh đôi của bạn được lưu dưới bút danh nhưng công khai và vĩnh viễn trên các relay Nostr phi tập trung. Quan điểm chính trị là dữ liệu nhạy cảm — không gì có thể xóa khỏi relay. Một cặp khóa, một sinh đôi: chia sẻ lại sẽ thay thế bản ghi thay vì thêm bản thứ hai.', bn: 'আপনার যমজ ছদ্মনামে কিন্তু প্রকাশ্যে ও স্থায়ীভাবে বিকেন্দ্রীভূত Nostr রিলেতে সংরক্ষিত হয়। রাজনৈতিক অবস্থান সংবেদনশীল ডেটা — রিলে থেকে কিছুই মোছা যায় না। এক জোড়া কী, এক যমজ: আবার শেয়ার করলে রেকর্ড প্রতিস্থাপিত হয়।', fa: 'دوقلوی شما با نام مستعار اما به صورت عمومی و دائمی روی رله‌های غیرمتمرکز Nostr ذخیره می‌شود. مواضع سیاسی داده حساس‌اند — از رله‌ها هیچ چیز پاک نمی‌شود. یک جفت کلید، یک دوقلو: اشتراک دوباره رکورد شما را جایگزین می‌کند.' },
  consent_ok: { de: 'Verstanden — jetzt teilen', en: 'Understood — share now', es: 'Entendido — compartir ahora', fr: 'Compris — partager maintenant', pt: 'Entendi — compartilhar agora', ar: 'فهمت — شارك الآن', zh: '明白了——立即分享', ja: '了解 — 今すぐ共有', hi: 'समझ गया — अभी साझा करें', ru: 'Понятно — поделиться', id: 'Mengerti — bagikan sekarang', tr: 'Anladım — şimdi paylaş', ko: '이해했습니다 — 지금 공유', it: 'Capito — condividi ora', nl: 'Begrepen — nu delen', pl: 'Rozumiem — udostępnij', uk: 'Зрозуміло — поділитися', vi: 'Đã hiểu — chia sẻ ngay', bn: 'বুঝেছি — এখনই শেয়ার', fa: 'فهمیدم — همین حالا اشتراک' },
  pow_mining: { de: 'Proof-of-Work wird berechnet…', en: 'Computing proof-of-work…', es: 'Calculando proof-of-work…', fr: 'Calcul du proof-of-work…', pt: 'Calculando proof-of-work…', ar: 'جارٍ حساب إثبات العمل…', zh: '正在计算工作量证明…', ja: 'プルーフ・オブ・ワークを計算中…', hi: 'प्रूफ-ऑफ-वर्क की गणना हो रही है…', ru: 'Вычисляется proof-of-work…', id: 'Menghitung proof-of-work…', tr: 'Proof-of-work hesaplanıyor…', ko: '작업 증명 계산 중…', it: 'Calcolo del proof-of-work…', nl: 'Proof-of-work berekenen…', pl: 'Obliczanie proof-of-work…', uk: 'Обчислюється proof-of-work…', vi: 'Đang tính proof-of-work…', bn: 'প্রুফ-অফ-ওয়ার্ক গণনা হচ্ছে…', fa: 'در حال محاسبه اثبات کار…' },
  edit:       { de: 'Bearbeiten', en: 'Edit', es: 'Editar', fr: 'Modifier', pt: 'Editar', ar: 'تعديل', zh: '编辑', ja: '編集', hi: 'संपादित करें', ru: 'Изменить', id: 'Edit', tr: 'Düzenle', ko: '편집', it: 'Modifica', nl: 'Bewerken', pl: 'Edytuj', uk: 'Редагувати', vi: 'Sửa', bn: 'সম্পাদনা', fa: 'ویرایش' },
  save:       { de: 'Speichern', en: 'Save', es: 'Guardar', fr: 'Enregistrer', pt: 'Salvar', ar: 'حفظ', zh: '保存', ja: '保存', hi: 'सहेजें', ru: 'Сохранить', id: 'Simpan', tr: 'Kaydet', ko: '저장', it: 'Salva', nl: 'Opslaan', pl: 'Zapisz', uk: 'Зберегти', vi: 'Lưu', bn: 'সংরক্ষণ', fa: 'ذخیره' },
  cancel:     { de: 'Abbrechen', en: 'Cancel', es: 'Cancelar', fr: 'Annuler', pt: 'Cancelar', ar: 'إلغاء', zh: '取消', ja: 'キャンセル', hi: 'रद्द करें', ru: 'Отмена', id: 'Batal', tr: 'İptal', ko: '취소', it: 'Annulla', nl: 'Annuleren', pl: 'Anuluj', uk: 'Скасувати', vi: 'Hủy', bn: 'বাতিল', fa: 'لغو' },
};

function tx(lang: string, key: keyof typeof TX): string {
  return (TX[key] as Record<string, string>)[lang] ?? (TX[key] as Record<string, string>)['en'];
}

export default function TwinPage() {
  const { lang, country } = useLang();
  const topics = SPECTRUM[lang as keyof typeof SPECTRUM] ?? SPECTRUM.en;

  const [twin, setTwin] = useState<TwinProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [confirming, setConfirming] = useState(false);
  const [mining, setMining] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editVals, setEditVals] = useState<Record<TopicKey, number>>(
    Object.fromEntries(TOPICS.map(k => [k, 50])) as Record<TopicKey, number>
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyTwin().then(t => {
      setTwin(t ?? null);
      if (t) setEditVals(Object.fromEntries(TOPICS.map(k => [k, Math.round(t[k] * 100)])) as Record<TopicKey, number>);
      setLoading(false);
    });
  }, []);

  const archetype = useMemo(() => twin ? classifyTwin(twin) : null, [twin]);
  const archetypeLabel = archetype ? (ARCHETYPE_NAMES[archetype]?.[lang] ?? ARCHETYPE_NAMES[archetype]?.en ?? '') : '';

  // Top 10 agenda positions (most decisive = furthest from 50%)
  const agendaPositions = useMemo(() => {
    if (!twin) return [];
    return AGENDA.map(item => ({
      item,
      score: inferPosition(twin, item).score,
    }))
      .sort((a, b) => Math.abs(b.score - 0.5) - Math.abs(a.score - 0.5))
      .slice(0, 10);
  }, [twin]);

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const vals = Object.fromEntries(TOPICS.map(k => [k, editVals[k] / 100])) as Record<TopicKey, number>;
      const updated = createTwinFromValues(vals);
      await saveMyTwin(updated);
      setTwin(updated);
      setEditMode(false);
      setSharing('idle');
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    if (!twin) return;
    if (!confirming) {
      // First click opens the consent notice — publishing is public and irreversible.
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setSharing('loading');
    setMining(true);
    try {
      const identity = await getOrCreateIdentity();
      const result = await publishTwin(twin, identity.privkey, country, () => {
        // proof-of-work in progress; keep the mining hint visible
      });
      setMining(false);
      setSharing(result.success ? 'done' : 'error');
    } catch {
      setMining(false);
      setSharing('error');
    }
  }

  async function handleShareCard() {
    if (!twin || cardBusy) return;
    setCardBusy(true);
    try {
      const blob = await generateShareCard({
        values: twin,
        archetypeLabel,
        topicLabels: Object.fromEntries(TOPICS.map((k) => [k, getTopicLabel(k, lang)])),
        headline: tx(lang, 'card_headline'),
      });
      await shareOrDownloadCard(blob);
    } finally {
      setCardBusy(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>…</span>
    </div>
  );

  if (!twin) return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: '24px', textTransform: 'uppercase' }}>
          {tx(lang, 'label')}
        </p>
        <p style={{ fontSize: '20px', color: 'var(--text-2)', marginBottom: '32px' }}>
          {tx(lang, 'no_twin')}
        </p>
        <Link href="/training" style={{
          display: 'inline-block', background: 'var(--text-1)', color: '#000',
          padding: '14px 32px', fontSize: '13px', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
        }}>
          {tx(lang, 'create')}
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '56px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: '14px', textTransform: 'uppercase' }}>
              {tx(lang, 'label')}
            </p>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 400, lineHeight: 1.1, marginBottom: '8px' }}>
              {archetypeLabel}
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
              no-kings.world/twin
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <RadarChart values={twin} size={120} animated />
          </div>
        </div>

        {/* 8 Dimension bars */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {tx(lang, 'dims')}
            </p>
            <button
              onClick={() => setEditMode(e => !e)}
              style={{
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-3)', fontSize: '11px', padding: '4px 12px',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              }}
            >
              {editMode ? tx(lang, 'cancel') : tx(lang, 'edit')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: editMode ? '32px' : '16px' }}>
            {topics.map(topic => {
              const val = twin[topic.key];
              const pct = Math.round(val * 100);
              const color = POSITION_COLOR;

              if (editMode) {
                const eVal = editVals[topic.key];
                return (
                  <div key={topic.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>
                        {topic.title}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: POSITION_COLOR }}>
                        {eVal}%
                      </span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={eVal}
                      onChange={e => setEditVals(v => ({ ...v, [topic.key]: Number(e.target.value) }))}
                      className="spectrum-slider"
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{topic.left}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', textAlign: 'right' }}>{topic.right}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={topic.key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 48px', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
                    {topic.title}
                  </span>
                  <div style={{ height: '4px', background: 'var(--raised)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color, textAlign: 'right' }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>

          {editMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
              <button onClick={() => setEditMode(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', padding: '10px 20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                {tx(lang, 'cancel')}
              </button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ background: 'var(--text-1)', color: '#000', border: 'none', padding: '10px 24px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
                {saving ? '…' : tx(lang, 'save')}
              </button>
            </div>
          )}
        </div>

        {/* Agenda positions */}
        {!editMode && (
          <div style={{ marginBottom: '64px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '24px' }}>
              {tx(lang, 'positions')}
            </p>
            <div>
              {agendaPositions.map(({ item, score }) => {
                const pct = Math.round(score * 100);
                const isFor = pct >= 50;
                const color = isFor ? '#22c55e' : '#ef4444';
                return (
                  <div key={item.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <p style={{ flex: 1, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.4 }}>
                      {item.text[lang] ?? item.text['en']}
                    </p>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color, flexShrink: 0 }}>
                      {isFor ? tx(lang, 'support') : tx(lang, 'oppose')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Share */}
        {!editMode && (
          <div style={{
            border: sharing === 'done' ? '1px solid rgba(74,222,128,0.3)' : '1px solid var(--border)',
            padding: '32px',
            background: sharing === 'done' ? 'rgba(74,222,128,0.03)' : 'var(--surface)',
            transition: 'all 300ms',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>
              nostr
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '24px', maxWidth: '480px' }}>
              {tx(lang, 'share_hint')}
            </p>
            {confirming && (
              <div style={{
                border: '1px solid rgba(250,180,50,0.45)',
                background: 'rgba(250,180,50,0.05)',
                padding: '20px 24px',
                marginBottom: '24px',
                maxWidth: '520px',
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgb(250,180,50)', marginBottom: '10px' }}>
                  {tx(lang, 'consent_title')}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
                  {tx(lang, 'consent_body')}
                </p>
              </div>
            )}
            {mining && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '16px' }}>
                ⛏ {tx(lang, 'pow_mining')}
              </p>
            )}
            <button
              onClick={handleShare}
              disabled={sharing === 'loading' || sharing === 'done'}
              style={{
                background: sharing === 'done' ? 'transparent' : 'var(--text-1)',
                color: sharing === 'done' ? 'var(--positive)' : '#000',
                border: sharing === 'done' ? '1px solid var(--positive)' : 'none',
                padding: '14px 32px', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: sharing === 'loading' || sharing === 'done' ? 'default' : 'pointer',
                opacity: sharing === 'loading' ? 0.6 : 1,
                fontFamily: 'var(--font-sans)',
                transition: 'all 300ms',
              }}
            >
              {sharing === 'loading' ? tx(lang, 'sharing') :
               sharing === 'done' ? tx(lang, 'shared') :
               confirming ? tx(lang, 'consent_ok') :
               tx(lang, 'share_btn')}
            </button>
            <button
              onClick={handleShareCard}
              disabled={cardBusy}
              style={{
                background: 'transparent',
                color: 'var(--text-2)',
                border: '1px solid var(--border)',
                padding: '14px 28px', fontSize: '13px',
                letterSpacing: '0.06em',
                cursor: cardBusy ? 'default' : 'pointer',
                opacity: cardBusy ? 0.6 : 1,
                marginLeft: '12px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {cardBusy ? tx(lang, 'card_making') : tx(lang, 'card_btn')}
            </button>

            {/* Key backup nudge — the twin is now public, the key is still mortal */}
            {sharing === 'done' && (
              <div style={{
                marginTop: '28px',
                border: '1px solid rgba(250,180,50,0.45)',
                background: 'rgba(250,180,50,0.05)',
                padding: '20px 24px',
                maxWidth: '520px',
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgb(250,180,50)', marginBottom: '10px' }}>
                  {tx(lang, 'backup_title')}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '16px' }}>
                  {tx(lang, 'backup_body')}
                </p>
                <Link href="/identity" style={{
                  display: 'inline-block',
                  background: 'var(--text-1)', color: '#000',
                  padding: '10px 22px', fontSize: '12px', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  textDecoration: 'none',
                }}>
                  {tx(lang, 'backup_btn')}
                </Link>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
