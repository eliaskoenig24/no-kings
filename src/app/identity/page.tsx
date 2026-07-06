'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { makeTx } from '@/lib/tx';
import { getOrCreateIdentity, encodeSecretKey, importIdentity } from '@/lib/identity';
import type { Identity } from '@/lib/identity';
import { fetchTwinByPubkey } from '@/lib/nostr-reader';
import { saveMyTwin } from '@/lib/db';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';

function truncateKey(key: string): string {
  return key.slice(0, 8) + '…' + key.slice(-8);
}

const ID_TX = {
  loading:        { de: 'Wird geladen…', en: 'Loading…', es: 'Cargando…', fr: 'Chargement…', pt: 'Carregando…', ar: 'جارٍ التحميل…', zh: '加载中…', ja: '読み込み中…', hi: 'लोड हो रहा है…', ru: 'Загрузка…', id: 'Memuat…', tr: 'Yükleniyor…', ko: '로딩 중…', it: 'Caricamento…', nl: 'Laden…', pl: 'Ładowanie…', uk: 'Завантаження…', vi: 'Đang tải…', bn: 'লোড হচ্ছে…', fa: 'در حال بارگذاری…' },
  page_label:     { de: 'DEINE IDENTITÄT', en: 'YOUR IDENTITY', es: 'TU IDENTIDAD', fr: 'TON IDENTITÉ', pt: 'SUA IDENTIDADE', ar: 'هويتك', zh: '你的身份', ja: 'あなたの身元', hi: 'आपकी पहचान', ru: 'ВАША ЛИЧНОСТЬ', id: 'IDENTITASMU', tr: 'KİMLİĞİN', ko: '내 신원', it: 'LA TUA IDENTITÀ', nl: 'JOUW IDENTITEIT', pl: 'TWOJA TOŻSAMOŚĆ', uk: 'ВАША ІДЕНТИЧНІСТЬ', vi: 'DANH TÍNH CỦA BẠN', bn: 'আপনার পরিচয়', fa: 'هویت شما' },
  key_title:      { de: 'Kryptografischer Schlüssel', en: 'Cryptographic Key', es: 'Clave Criptográfica', fr: 'Clé Cryptographique', pt: 'Chave Criptográfica', ar: 'مفتاح تشفير', zh: '加密密钥', ja: '暗号鍵', hi: 'क्रिप्टोग्राफ़िक कुंजी', ru: 'Криптографический ключ', id: 'Kunci Kriptografi', tr: 'Kriptografik Anahtar', ko: '암호화 키', it: 'Chiave Crittografica', nl: 'Cryptografische sleutel', pl: 'Klucz kryptograficzny', uk: 'Криптографічний ключ', vi: 'Khóa mã hóa', bn: 'ক্রিপ্টোগ্রাফিক কী', fa: 'کلید رمزنگاری' },
  created_at:     { de: 'Erstellt am', en: 'Created on', es: 'Creado el', fr: 'Créé le', pt: 'Criado em', ar: 'أُنشئ في', zh: '创建于', ja: '作成日', hi: 'बनाया गया', ru: 'Создан', id: 'Dibuat pada', tr: 'Oluşturuldu', ko: '생성일', it: 'Creato il', nl: 'Aangemaakt op', pl: 'Utworzono', uk: 'Створено', vi: 'Ngày tạo', bn: 'তৈরি হয়েছে', fa: 'ایجاد شده در' },
  locally_stored: { de: 'Lokal gespeichert', en: 'Stored locally', es: 'Almacenado localmente', fr: 'Stocké localement', pt: 'Armazenado localmente', ar: 'مخزَّن محليًا', zh: '本地存储', ja: 'ローカル保存', hi: 'स्थानीय रूप से सहेजा', ru: 'Хранится локально', id: 'Disimpan secara lokal', tr: 'Yerel olarak depolandı', ko: '로컬 저장됨', it: 'Memorizzato localmente', nl: 'Lokaal opgeslagen', pl: 'Przechowywany lokalnie', uk: 'Зберігається локально', vi: 'Lưu trữ cục bộ', bn: 'স্থানীয়ভাবে সংরক্ষিত', fa: 'ذخیره‌شده به صورت محلی' },
  key_desc:       { de: 'Dein kryptografischer Schlüssel. Nicht teilbar, nicht rückverfolgbar.', en: 'Your cryptographic key. Not shareable, not traceable.', es: 'Tu clave criptográfica. No compartible, no rastreable.', fr: 'Ta clé cryptographique. Non partageable, non traçable.', pt: 'Sua chave criptográfica. Não compartilhável, não rastreável.', ar: 'مفتاحك التشفيري. غير قابل للمشاركة وغير قابل للتتبع.', zh: '您的加密密钥。不可共享，不可追踪。', ja: 'あなたの暗号鍵。共有不可、追跡不可。', hi: 'आपकी क्रिप्टोग्राफ़िक कुंजी। साझा नहीं की जा सकती, ट्रेस नहीं की जा सकती।', ru: 'Ваш криптографический ключ. Не делится, не отслеживается.', id: 'Kunci kriptografi Anda. Tidak dapat dibagikan, tidak dapat dilacak.', tr: 'Kriptografik anahtarınız. Paylaşılamaz, izlenemez.', ko: '귀하의 암호화 키. 공유 불가, 추적 불가.', it: 'La tua chiave crittografica. Non condivisibile, non tracciabile.', nl: 'Uw cryptografische sleutel. Niet deelbaar, niet traceerbaar.', pl: 'Twój klucz kryptograficzny. Nieudostępnialny, nieśledzony.', uk: 'Ваш криптографічний ключ. Не ділиться, не відстежується.', vi: 'Khóa mã hóa của bạn. Không thể chia sẻ, không thể theo dõi.', bn: 'আপনার ক্রিপ্টোগ্রাফিক কী। শেয়ারযোগ্য নয়, ট্র্যাকযোগ্য নয়।', fa: 'کلید رمزنگاری شما. قابل اشتراک‌گذاری نیست، قابل ردیابی نیست.' },
  private_key:    { de: 'Privater Schlüssel', en: 'PRIVATE KEY', es: 'CLAVE PRIVADA', fr: 'CLÉ PRIVÉE', pt: 'CHAVE PRIVADA', ar: 'المفتاح الخاص', zh: '私钥', ja: '秘密鍵', hi: 'निजी कुंजी', ru: 'ПРИВАТНЫЙ КЛЮЧ', id: 'KUNCI PRIVAT', tr: 'ÖZEL ANAHTAR', ko: '비밀 키', it: 'CHIAVE PRIVATA', nl: 'PRIVÉSLEUTEL', pl: 'KLUCZ PRYWATNY', uk: 'ПРИВАТНИЙ КЛЮЧ', vi: 'KHÓA RIÊNG TƯ', bn: 'ব্যক্তিগত কী', fa: 'کلید خصوصی' },
  private_desc:   { de: 'Sicher auf diesem Gerät gespeichert. Niemals exportiert.', en: 'Securely stored on this device. Never exported.', es: 'Almacenado de forma segura en este dispositivo. Nunca exportado.', fr: 'Stocké en toute sécurité sur cet appareil. Jamais exporté.', pt: 'Armazenado com segurança neste dispositivo. Nunca exportado.', ar: 'مُخزَّن بأمان على هذا الجهاز. لم يُصدَّر قط.', zh: '安全存储在本设备上。从未导出。', ja: 'このデバイスに安全に保存。エクスポートされることはありません。', hi: 'इस डिवाइस पर सुरक्षित रूप से संग्रहीत। कभी निर्यात नहीं किया गया।', ru: 'Надёжно хранится на этом устройстве. Никогда не экспортируется.', id: 'Tersimpan dengan aman di perangkat ini. Tidak pernah diekspor.', tr: 'Bu cihazda güvenle saklandı. Hiç dışa aktarılmadı.', ko: '이 장치에 안전하게 저장됨. 내보낸 적 없음.', it: 'Memorizzato in modo sicuro su questo dispositivo. Mai esportato.', nl: 'Veilig opgeslagen op dit apparaat. Nooit geëxporteerd.', pl: 'Bezpiecznie przechowywany na tym urządzeniu. Nigdy nie wyeksportowany.', uk: 'Надійно зберігається на цьому пристрої. Ніколи не експортується.', vi: 'Được lưu trữ an toàn trên thiết bị này. Chưa bao giờ xuất.', bn: 'এই ডিভাইসে নিরাপদে সংরক্ষিত। কখনো রপ্তানি হয়নি।', fa: 'به صورت امن در این دستگاه ذخیره شده. هرگز صادر نشده.' },
  pseudonym:      { de: 'Diese Identität ist pseudonym — sie enthält keinen Namen, keine E-Mail, keine IP-Adresse.', en: 'This identity is pseudonymous — it contains no name, no email, no IP address.', es: 'Esta identidad es seudónima: no contiene nombre, correo electrónico ni dirección IP.', fr: 'Cette identité est pseudonyme — elle ne contient ni nom, ni email, ni adresse IP.', pt: 'Esta identidade é pseudônima — não contém nome, email nem endereço IP.', ar: 'هذه الهوية مستعارة — لا تحتوي على اسم أو بريد إلكتروني أو عنوان IP.', zh: '该身份是匿名的——不包含姓名、邮箱或IP地址。', ja: 'この身元は匿名です — 名前、メール、IPアドレスを含みません。', hi: 'यह पहचान छद्म है — इसमें कोई नाम, ईमेल या IP पता नहीं है।', ru: 'Эта личность псевдонимна — не содержит имени, email и IP-адреса.', id: 'Identitas ini pseudonim — tidak mengandung nama, email, atau alamat IP.', tr: 'Bu kimlik takma adlıdır — isim, e-posta veya IP adresi içermez.', ko: '이 신원은 익명입니다 — 이름, 이메일, IP 주소가 없습니다.', it: 'Questa identità è pseudonima — non contiene nome, email o indirizzo IP.', nl: 'Deze identiteit is pseudoniem — bevat geen naam, e-mail of IP-adres.', pl: 'Ta tożsamość jest pseudonimowa — nie zawiera imienia, emaila ani adresu IP.', uk: 'Ця ідентичність є псевдонімною — не містить імені, email чи IP-адреси.', vi: 'Danh tính này là bút danh — không chứa tên, email hay địa chỉ IP.', bn: 'এই পরিচয়টি ছদ্মনামীয় — এটিতে কোনো নাম, ইমেল বা আইপি ঠিকানা নেই।', fa: 'این هویت مستعار است — شامل هیچ نام، ایمیل یا آدرس IP نیست.' },
  copy_id:        { de: 'Identität kopieren', en: 'Copy identity', es: 'Copiar identidad', fr: 'Copier l\'identité', pt: 'Copiar identidade', ar: 'نسخ الهوية', zh: '复制身份', ja: 'IDをコピー', hi: 'पहचान कॉपी करें', ru: 'Копировать ключ', id: 'Salin identitas', tr: 'Kimliği kopyala', ko: '신원 복사', it: 'Copia identità', nl: 'Identiteit kopiëren', pl: 'Kopiuj tożsamość', uk: 'Копіювати ідентичність', vi: 'Sao chép danh tính', bn: 'পরিচয় কপি করুন', fa: 'کپی هویت' },
  copied:         { de: 'Kopiert ✓', en: 'Copied ✓', es: 'Copiado ✓', fr: 'Copié ✓', pt: 'Copiado ✓', ar: 'تم النسخ ✓', zh: '已复制 ✓', ja: 'コピー済み ✓', hi: 'कॉपी हो गया ✓', ru: 'Скопировано ✓', id: 'Disalin ✓', tr: 'Kopyalandı ✓', ko: '복사됨 ✓', it: 'Copiato ✓', nl: 'Gekopieerd ✓', pl: 'Skopiowano ✓', uk: 'Скопійовано ✓', vi: 'Đã sao chép ✓', bn: 'কপি হয়েছে ✓', fa: 'کپی شد ✓' },
  transfer_title: { de: 'Gerät wechseln / sichern', en: 'Transfer / back up', es: 'Cambiar de dispositivo / copia', fr: 'Changer d’appareil / sauvegarde', pt: 'Trocar de dispositivo / backup', ar: 'تغيير الجهاز / نسخ احتياطي', zh: '更换设备 / 备份', ja: '端末の変更 / バックアップ', hi: 'डिवाइस बदलें / बैकअप', ru: 'Смена устройства / копия', id: 'Ganti perangkat / cadangan', tr: 'Cihaz değiştir / yedekle', ko: '기기 이전 / 백업', it: 'Cambia dispositivo / backup', nl: 'Apparaat wisselen / back-up', pl: 'Zmiana urządzenia / kopia', uk: 'Зміна пристрою / копія', vi: 'Đổi thiết bị / sao lưu', bn: 'ডিভাইস বদল / ব্যাকআপ', fa: 'تغییر دستگاه / پشتیبان' },
  transfer_desc:  { de: 'Mit deinem geheimen Schlüssel bist du auf jedem Gerät dieselbe Person im Netzwerk — ein Mensch, ein Zwilling, statt doppelt zu zählen. Zeige ihn niemandem: Wer diesen Schlüssel besitzt, ist im Netzwerk du.', en: 'With your secret key you are the same person in the network on every device — one human, one twin, instead of counting twice. Show it to no one: whoever holds this key, is you.', es: 'Con tu clave secreta eres la misma persona en la red en todos tus dispositivos — un humano, un gemelo, en vez de contar dos veces. No se la muestres a nadie: quien tiene esta clave, eres tú.', fr: 'Avec ta clé secrète, tu es la même personne du réseau sur chaque appareil — un humain, un jumeau, au lieu de compter deux fois. Ne la montre à personne : qui détient cette clé, c’est toi.', pt: 'Com sua chave secreta você é a mesma pessoa na rede em todos os dispositivos — um humano, um gêmeo, em vez de contar duas vezes. Não a mostre a ninguém: quem tem esta chave, é você.', ar: 'بمفتاحك السري تكون الشخص نفسه في الشبكة على كل جهاز — إنسان واحد، توأم واحد، بدل أن تُحسب مرتين. لا تُرِه لأحد: من يملك هذا المفتاح، هو أنت.', zh: '有了你的私钥，你在任何设备上都是网络中的同一个人——一个人一个孪生，而不是被计算两次。不要给任何人看：谁持有这把密钥，谁就是你。', ja: '秘密鍵があれば、どの端末でもネットワーク上の同一人物です — 二重カウントではなく、一人につきツイン1つ。誰にも見せないでください：この鍵を持つ者があなたです。', hi: 'अपनी गुप्त कुंजी से आप हर डिवाइस पर नेटवर्क में एक ही व्यक्ति हैं — एक इंसान, एक जुड़वां, दो बार गिनती नहीं। इसे किसी को न दिखाएं: जिसके पास यह कुंजी है, वही आप हैं।', ru: 'С секретным ключом вы — один и тот же человек в сети на любом устройстве: один человек, один двойник, вместо двойного счёта. Никому его не показывайте: кто владеет ключом, тот и есть вы.', id: 'Dengan kunci rahasiamu kamu adalah orang yang sama di jaringan pada setiap perangkat — satu manusia, satu kembaran, bukan dihitung dua kali. Jangan tunjukkan pada siapa pun: siapa pun yang memegang kunci ini, adalah kamu.', tr: 'Gizli anahtarınla her cihazda ağdaki aynı kişisin — iki kez sayılmak yerine bir insan, bir ikiz. Kimseye gösterme: bu anahtarı elinde tutan, sensin.', ko: '비밀 키가 있으면 어떤 기기에서든 네트워크상 같은 사람입니다 — 두 번 집계되는 대신 한 사람, 한 트윈. 아무에게도 보여주지 마세요: 이 키를 가진 사람이 곧 당신입니다.', it: 'Con la tua chiave segreta sei la stessa persona nella rete su ogni dispositivo — un umano, un gemello, invece di contare due volte. Non mostrarla a nessuno: chi possiede questa chiave, sei tu.', nl: 'Met je geheime sleutel ben je op elk apparaat dezelfde persoon in het netwerk — één mens, één tweeling, in plaats van dubbel tellen. Laat hem aan niemand zien: wie deze sleutel heeft, is jou.', pl: 'Dzięki tajnemu kluczowi jesteś tą samą osobą w sieci na każdym urządzeniu — jeden człowiek, jeden bliźniak, zamiast liczenia podwójnie. Nie pokazuj go nikomu: kto ma ten klucz, ten jest tobą.', uk: 'Із секретним ключем ви — та сама особа в мережі на будь-якому пристрої: одна людина, один двійник, а не подвійний облік. Нікому його не показуйте: хто володіє ключем, той і є ви.', vi: 'Với khóa bí mật, bạn là cùng một người trong mạng trên mọi thiết bị — một người, một sinh đôi, thay vì bị đếm hai lần. Đừng cho ai xem: ai giữ khóa này, người đó chính là bạn.', bn: 'গোপন কী দিয়ে আপনি প্রতিটি ডিভাইসে নেটওয়ার্কে একই ব্যক্তি — একজন মানুষ, একটি যমজ, দুবার গণনা নয়। কাউকে দেখাবেন না: এই কী যার কাছে, সে-ই আপনি।', fa: 'با کلید مخفی، روی هر دستگاهی همان شخص در شبکه هستید — یک انسان، یک دوقلو، به جای دو بار شمرده شدن. آن را به کسی نشان ندهید: هر که این کلید را دارد، شماست.' },
  reveal_btn:     { de: 'Geheimen Schlüssel anzeigen', en: 'Reveal secret key', es: 'Mostrar clave secreta', fr: 'Afficher la clé secrète', pt: 'Mostrar chave secreta', ar: 'إظهار المفتاح السري', zh: '显示私钥', ja: '秘密鍵を表示', hi: 'गुप्त कुंजी दिखाएं', ru: 'Показать секретный ключ', id: 'Tampilkan kunci rahasia', tr: 'Gizli anahtarı göster', ko: '비밀 키 표시', it: 'Mostra chiave segreta', nl: 'Geheime sleutel tonen', pl: 'Pokaż tajny klucz', uk: 'Показати секретний ключ', vi: 'Hiện khóa bí mật', bn: 'গোপন কী দেখান', fa: 'نمایش کلید مخفی' },
  hide_btn:       { de: 'Verbergen', en: 'Hide', es: 'Ocultar', fr: 'Masquer', pt: 'Ocultar', ar: 'إخفاء', zh: '隐藏', ja: '隠す', hi: 'छिपाएं', ru: 'Скрыть', id: 'Sembunyikan', tr: 'Gizle', ko: '숨기기', it: 'Nascondi', nl: 'Verbergen', pl: 'Ukryj', uk: 'Сховати', vi: 'Ẩn', bn: 'লুকান', fa: 'پنهان کردن' },
  copy_secret:    { de: 'Schlüssel kopieren', en: 'Copy key', es: 'Copiar clave', fr: 'Copier la clé', pt: 'Copiar chave', ar: 'نسخ المفتاح', zh: '复制密钥', ja: '鍵をコピー', hi: 'कुंजी कॉपी करें', ru: 'Копировать ключ', id: 'Salin kunci', tr: 'Anahtarı kopyala', ko: '키 복사', it: 'Copia chiave', nl: 'Sleutel kopiëren', pl: 'Kopiuj klucz', uk: 'Копіювати ключ', vi: 'Sao chép khóa', bn: 'কী কপি করুন', fa: 'کپی کلید' },
  scan_hint:      { de: 'Auf dem anderen Gerät: Identität → Importieren → Schlüssel scannen oder einfügen.', en: 'On the other device: Identity → Import → scan or paste the key.', es: 'En el otro dispositivo: Identidad → Importar → escanea o pega la clave.', fr: 'Sur l’autre appareil : Identité → Importer → scanne ou colle la clé.', pt: 'No outro dispositivo: Identidade → Importar → escaneie ou cole a chave.', ar: 'على الجهاز الآخر: الهوية ← استيراد ← امسح المفتاح أو الصقه.', zh: '在另一台设备上：身份 → 导入 → 扫描或粘贴密钥。', ja: 'もう一方の端末で：身元 → インポート → 鍵をスキャンまたは貼り付け。', hi: 'दूसरे डिवाइस पर: पहचान → आयात → कुंजी स्कैन करें या पेस्ट करें।', ru: 'На другом устройстве: Личность → Импорт → отсканируйте или вставьте ключ.', id: 'Di perangkat lain: Identitas → Impor → pindai atau tempel kunci.', tr: 'Diğer cihazda: Kimlik → İçe aktar → anahtarı tara veya yapıştır.', ko: '다른 기기에서: 신원 → 가져오기 → 키를 스캔하거나 붙여넣기.', it: 'Sull’altro dispositivo: Identità → Importa → scansiona o incolla la chiave.', nl: 'Op het andere apparaat: Identiteit → Importeren → scan of plak de sleutel.', pl: 'Na drugim urządzeniu: Tożsamość → Import → zeskanuj lub wklej klucz.', uk: 'На іншому пристрої: Ідентичність → Імпорт → відскануйте або вставте ключ.', vi: 'Trên thiết bị kia: Danh tính → Nhập → quét hoặc dán khóa.', bn: 'অন্য ডিভাইসে: পরিচয় → আমদানি → কী স্ক্যান বা পেস্ট করুন।', fa: 'در دستگاه دیگر: هویت ← وارد کردن ← کلید را اسکن یا جای‌گذاری کنید.' },
  import_title:   { de: 'Identität importieren', en: 'Import identity', es: 'Importar identidad', fr: 'Importer une identité', pt: 'Importar identidade', ar: 'استيراد الهوية', zh: '导入身份', ja: '身元をインポート', hi: 'पहचान आयात करें', ru: 'Импорт личности', id: 'Impor identitas', tr: 'Kimliği içe aktar', ko: '신원 가져오기', it: 'Importa identità', nl: 'Identiteit importeren', pl: 'Importuj tożsamość', uk: 'Імпортувати ідентичність', vi: 'Nhập danh tính', bn: 'পরিচয় আমদানি', fa: 'وارد کردن هویت' },
  import_desc:    { de: 'Füge den geheimen Schlüssel (nsec… oder Hex) von deinem anderen Gerät ein. Achtung: Die aktuelle Identität dieses Geräts wird dabei ersetzt — sichere sie vorher, falls du sie behalten willst.', en: 'Paste the secret key (nsec… or hex) from your other device. Warning: this device’s current identity will be replaced — back it up first if you want to keep it.', es: 'Pega la clave secreta (nsec… o hex) de tu otro dispositivo. Atención: la identidad actual de este dispositivo será reemplazada — guárdala antes si quieres conservarla.', fr: 'Colle la clé secrète (nsec… ou hex) de ton autre appareil. Attention : l’identité actuelle de cet appareil sera remplacée — sauvegarde-la d’abord si tu veux la garder.', pt: 'Cole a chave secreta (nsec… ou hex) do seu outro dispositivo. Atenção: a identidade atual deste dispositivo será substituída — faça backup antes se quiser mantê-la.', ar: 'الصق المفتاح السري (nsec… أو hex) من جهازك الآخر. تحذير: سيتم استبدال هوية هذا الجهاز الحالية — انسخها احتياطيًا أولًا إن أردت الاحتفاظ بها.', zh: '粘贴另一台设备上的私钥（nsec… 或十六进制）。注意：此设备当前的身份将被替换——若想保留请先备份。', ja: 'もう一方の端末の秘密鍵（nsec…または16進数）を貼り付けてください。注意：この端末の現在の身元は置き換えられます — 残したい場合は先にバックアップを。', hi: 'अपने दूसरे डिवाइस की गुप्त कुंजी (nsec… या hex) पेस्ट करें। चेतावनी: इस डिवाइस की वर्तमान पहचान बदल दी जाएगी — रखना चाहें तो पहले बैकअप लें।', ru: 'Вставьте секретный ключ (nsec… или hex) с другого устройства. Внимание: текущая личность этого устройства будет заменена — сначала сохраните её, если хотите оставить.', id: 'Tempel kunci rahasia (nsec… atau hex) dari perangkat lainmu. Perhatian: identitas perangkat ini akan diganti — cadangkan dulu jika ingin menyimpannya.', tr: 'Diğer cihazındaki gizli anahtarı (nsec… veya hex) yapıştır. Uyarı: bu cihazın mevcut kimliği değiştirilecek — saklamak istiyorsan önce yedekle.', ko: '다른 기기의 비밀 키(nsec… 또는 hex)를 붙여넣으세요. 주의: 이 기기의 현재 신원이 교체됩니다 — 유지하려면 먼저 백업하세요.', it: 'Incolla la chiave segreta (nsec… o hex) dell’altro dispositivo. Attenzione: l’identità attuale di questo dispositivo verrà sostituita — falle prima un backup se vuoi conservarla.', nl: 'Plak de geheime sleutel (nsec… of hex) van je andere apparaat. Let op: de huidige identiteit van dit apparaat wordt vervangen — maak eerst een back-up als je die wilt houden.', pl: 'Wklej tajny klucz (nsec… lub hex) z drugiego urządzenia. Uwaga: obecna tożsamość tego urządzenia zostanie zastąpiona — najpierw zrób kopię, jeśli chcesz ją zachować.', uk: 'Вставте секретний ключ (nsec… або hex) з іншого пристрою. Увага: поточну ідентичність цього пристрою буде замінено — спершу збережіть її, якщо хочете лишити.', vi: 'Dán khóa bí mật (nsec… hoặc hex) từ thiết bị kia. Cảnh báo: danh tính hiện tại của thiết bị này sẽ bị thay thế — hãy sao lưu trước nếu muốn giữ.', bn: 'অন্য ডিভাইসের গোপন কী (nsec… বা hex) পেস্ট করুন। সতর্কতা: এই ডিভাইসের বর্তমান পরিচয় প্রতিস্থাপিত হবে — রাখতে চাইলে আগে ব্যাকআপ করুন।', fa: 'کلید مخفی (nsec… یا hex) دستگاه دیگرتان را جای‌گذاری کنید. هشدار: هویت فعلی این دستگاه جایگزین می‌شود — اگر می‌خواهید نگهش دارید اول پشتیبان بگیرید.' },
  import_btn:     { de: 'Importieren', en: 'Import', es: 'Importar', fr: 'Importer', pt: 'Importar', ar: 'استيراد', zh: '导入', ja: 'インポート', hi: 'आयात करें', ru: 'Импортировать', id: 'Impor', tr: 'İçe aktar', ko: '가져오기', it: 'Importa', nl: 'Importeren', pl: 'Importuj', uk: 'Імпортувати', vi: 'Nhập', bn: 'আমদানি', fa: 'وارد کردن' },
  importing:      { de: 'Importiere…', en: 'Importing…', es: 'Importando…', fr: 'Importation…', pt: 'Importando…', ar: 'جارٍ الاستيراد…', zh: '导入中…', ja: 'インポート中…', hi: 'आयात हो रहा है…', ru: 'Импорт…', id: 'Mengimpor…', tr: 'İçe aktarılıyor…', ko: '가져오는 중…', it: 'Importazione…', nl: 'Importeren…', pl: 'Importowanie…', uk: 'Імпорт…', vi: 'Đang nhập…', bn: 'আমদানি হচ্ছে…', fa: 'در حال وارد کردن…' },
  import_invalid: { de: 'Ungültiger Schlüssel — erwartet nsec1… oder 64 Hex-Zeichen.', en: 'Invalid key — expected nsec1… or 64 hex characters.', es: 'Clave no válida — se espera nsec1… o 64 caracteres hex.', fr: 'Clé invalide — attendu : nsec1… ou 64 caractères hex.', pt: 'Chave inválida — esperado nsec1… ou 64 caracteres hex.', ar: 'مفتاح غير صالح — المتوقع nsec1… أو 64 حرفًا سداسيًا.', zh: '密钥无效——应为 nsec1… 或 64 位十六进制字符。', ja: '無効な鍵です — nsec1…または64桁の16進数が必要です。', hi: 'अमान्य कुंजी — nsec1… या 64 हेक्स वर्ण अपेक्षित।', ru: 'Неверный ключ — ожидается nsec1… или 64 hex-символа.', id: 'Kunci tidak valid — diharapkan nsec1… atau 64 karakter hex.', tr: 'Geçersiz anahtar — nsec1… veya 64 hex karakter bekleniyor.', ko: '잘못된 키 — nsec1… 또는 64자리 hex여야 합니다.', it: 'Chiave non valida — attesi nsec1… o 64 caratteri hex.', nl: 'Ongeldige sleutel — verwacht nsec1… of 64 hex-tekens.', pl: 'Nieprawidłowy klucz — oczekiwano nsec1… lub 64 znaków hex.', uk: 'Невірний ключ — очікується nsec1… або 64 hex-символи.', vi: 'Khóa không hợp lệ — cần nsec1… hoặc 64 ký tự hex.', bn: 'অবৈধ কী — nsec1… বা ৬৪টি হেক্স অক্ষর প্রত্যাশিত।', fa: 'کلید نامعتبر — nsec1… یا ۶۴ نویسه هگز انتظار می‌رود.' },
  import_ok_twin: { de: '✓ Identität importiert — dein Zwilling wurde aus dem Netzwerk geladen.', en: '✓ Identity imported — your twin was loaded from the network.', es: '✓ Identidad importada — tu gemelo se cargó desde la red.', fr: '✓ Identité importée — ton jumeau a été chargé depuis le réseau.', pt: '✓ Identidade importada — seu gêmeo foi carregado da rede.', ar: '✓ تم استيراد الهوية — تم تحميل توأمك من الشبكة.', zh: '✓ 身份已导入——你的孪生已从网络加载。', ja: '✓ 身元をインポートしました — ツインをネットワークから読み込みました。', hi: '✓ पहचान आयात हुई — आपका जुड़वां नेटवर्क से लोड हुआ।', ru: '✓ Личность импортирована — двойник загружен из сети.', id: '✓ Identitas diimpor — kembaranmu dimuat dari jaringan.', tr: '✓ Kimlik içe aktarıldı — ikizin ağdan yüklendi.', ko: '✓ 신원을 가져왔습니다 — 트윈을 네트워크에서 불러왔습니다.', it: '✓ Identità importata — il tuo gemello è stato caricato dalla rete.', nl: '✓ Identiteit geïmporteerd — je tweeling is uit het netwerk geladen.', pl: '✓ Tożsamość zaimportowana — bliźniak wczytany z sieci.', uk: '✓ Ідентичність імпортовано — двійника завантажено з мережі.', vi: '✓ Đã nhập danh tính — sinh đôi của bạn đã được tải từ mạng.', bn: '✓ পরিচয় আমদানি হয়েছে — যমজ নেটওয়ার্ক থেকে লোড হয়েছে।', fa: '✓ هویت وارد شد — دوقلوی شما از شبکه بارگیری شد.' },
  import_ok_notwin: { de: '✓ Identität importiert — im Netzwerk ist noch kein Zwilling für diesen Schlüssel veröffentlicht.', en: '✓ Identity imported — no published twin found for this key yet.', es: '✓ Identidad importada — aún no hay gemelo publicado para esta clave.', fr: '✓ Identité importée — aucun jumeau publié pour cette clé pour l’instant.', pt: '✓ Identidade importada — ainda não há gêmeo publicado para esta chave.', ar: '✓ تم استيراد الهوية — لا يوجد توأم منشور لهذا المفتاح بعد.', zh: '✓ 身份已导入——此密钥暂无已发布的孪生。', ja: '✓ 身元をインポートしました — この鍵で公開されたツインはまだありません。', hi: '✓ पहचान आयात हुई — इस कुंजी के लिए अभी कोई प्रकाशित जुड़वां नहीं।', ru: '✓ Личность импортирована — для этого ключа пока нет опубликованного двойника.', id: '✓ Identitas diimpor — belum ada kembaran terpublikasi untuk kunci ini.', tr: '✓ Kimlik içe aktarıldı — bu anahtar için yayımlanmış ikiz henüz yok.', ko: '✓ 신원을 가져왔습니다 — 이 키로 공개된 트윈이 아직 없습니다.', it: '✓ Identità importata — nessun gemello pubblicato per questa chiave.', nl: '✓ Identiteit geïmporteerd — nog geen gepubliceerde tweeling voor deze sleutel.', pl: '✓ Tożsamość zaimportowana — brak opublikowanego bliźniaka dla tego klucza.', uk: '✓ Ідентичність імпортовано — опублікованого двійника для цього ключа ще немає.', vi: '✓ Đã nhập danh tính — chưa có sinh đôi nào được công bố cho khóa này.', bn: '✓ পরিচয় আমদানি হয়েছে — এই কী-র জন্য এখনো প্রকাশিত যমজ নেই।', fa: '✓ هویت وارد شد — هنوز دوقلوی منتشرشده‌ای برای این کلید نیست.' },
  share_twin:     { de: 'Zwilling teilen', en: 'Share twin', es: 'Compartir gemelo', fr: 'Partager le jumeau', pt: 'Compartilhar gêmeo', ar: 'مشاركة التوأم', zh: '分享孪生', ja: 'ツインを共有', hi: 'ट्विन शेयर करें', ru: 'Поделиться двойником', id: 'Bagikan kembaran', tr: 'İkizi paylaş', ko: '트윈 공유', it: 'Condividi gemello', nl: 'Tweeling delen', pl: 'Udostępnij bliźniaka', uk: 'Поділитися двійником', vi: 'Chia sẻ sinh đôi', bn: 'যমজ শেয়ার করুন', fa: 'اشتراک‌گذاری دوقلو' },
};

const idTx = makeTx(ID_TX);
const tx = (key: keyof typeof ID_TX & string, lang: string) => idTx(lang, key);

export default function IdentityPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [importVal, setImportVal] = useState('');
  const [importState, setImportState] = useState<'idle' | 'busy' | 'invalid' | 'ok-twin' | 'ok-notwin'>('idle');
  const { lang } = useLang();
  const router = useRouter();
  const isRtl = lang === 'ar' || lang === 'fa';

  useEffect(() => {
    getOrCreateIdentity().then((id) => {
      setIdentity(id);
      setLoading(false);
    });
  }, []);

  async function handleCopy() {
    if (!identity) return;
    await navigator.clipboard.writeText(identity.pubkey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopySecret() {
    if (!identity) return;
    await navigator.clipboard.writeText(encodeSecretKey(identity.privkey));
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  async function handleImport() {
    setImportState('busy');
    const imported = await importIdentity(importVal);
    if (!imported) {
      setImportState('invalid');
      return;
    }
    setIdentity(imported);
    setImportVal('');
    setRevealed(false);
    // Adopt the twin this identity already published, if any
    try {
      const networkTwin = await fetchTwinByPubkey(imported.pubkey, 6000);
      if (networkTwin) {
        await saveMyTwin(networkTwin);
        setImportState('ok-twin');
        return;
      }
    } catch { /* network unavailable — identity import still succeeded */ }
    setImportState('ok-notwin');
  }

  function shareLink() {
    if (!identity) return;
    const url = `${window.location.origin}/twin/${identity.pubkey}`;
    if (navigator.share) {
      navigator.share({ url, title: tx('share_twin', lang) });
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">{tx('loading', lang)}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(60px, 8vw, 100px) 0' }} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="container">

        <div style={{ marginBottom: '80px' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx('page_label', lang)}</p>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', marginBottom: '16px' }}>
            {tx('key_title', lang)}
          </h1>
          <p style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {tx('created_at', lang)} {identity ? new Date(identity.createdAt).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            {' · '}{tx('locally_stored', lang)}
          </p>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '40px',
          marginBottom: '40px',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(13px, 2vw, 16px)',
            color: 'var(--accent, #4B9EFF)',
            letterSpacing: '0.06em',
            wordBreak: 'break-all',
            marginBottom: '16px',
          }}>
            {identity ? truncateKey(identity.pubkey) : '—'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
            {tx('key_desc', lang)}
          </p>
        </div>

        {/* QR Code block */}
        {identity && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '40px',
            marginBottom: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-3)',
              margin: 0,
              letterSpacing: '0.08em',
            }}>
              {t(lang, 'identity_qr_label')}
            </p>
            <QRCodeSVG
              value={`nostr:${identity.pubkey}`}
              size={160}
              bgColor="#080808"
              fgColor="#F0F0F0"
            />
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-3)',
              margin: 0,
            }}>
              {t(lang, 'identity_qr_hint')}
            </p>
          </div>
        )}

        {/* Transfer / backup — the secret key moves you between devices */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '40px',
          marginBottom: '40px',
        }}>
          <p className="label" style={{ marginBottom: '12px' }}>{tx('transfer_title', lang)}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '24px', maxWidth: '560px' }}>
            {tx('transfer_desc', lang)}
          </p>
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              style={{
                background: 'transparent', color: 'var(--text-2)',
                border: '1px solid var(--border)', padding: '12px 24px',
                fontSize: '12px', letterSpacing: '0.06em', cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {tx('reveal_btn', lang)}
            </button>
          ) : identity && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
              <QRCodeSVG
                value={encodeSecretKey(identity.privkey)}
                size={160}
                bgColor="#080808"
                fgColor="#F0F0F0"
              />
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)',
                wordBreak: 'break-all', margin: 0, maxWidth: '480px',
              }}>
                {encodeSecretKey(identity.privkey)}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                {tx('scan_hint', lang)}
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCopySecret}
                  style={{
                    background: 'var(--text-1)', color: '#000', border: 'none',
                    padding: '10px 20px', fontSize: '12px', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >
                  {secretCopied ? tx('copied', lang) : tx('copy_secret', lang)}
                </button>
                <button
                  onClick={() => setRevealed(false)}
                  style={{
                    background: 'transparent', color: 'var(--text-3)',
                    border: '1px solid var(--border)', padding: '10px 20px',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                  }}
                >
                  {tx('hide_btn', lang)}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Import — become the same person as on your other device */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '40px',
          marginBottom: '40px',
        }}>
          <p className="label" style={{ marginBottom: '12px' }}>{tx('import_title', lang)}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '20px', maxWidth: '560px' }}>
            {tx('import_desc', lang)}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', maxWidth: '560px' }}>
            <input
              value={importVal}
              onChange={(e) => { setImportVal(e.target.value); setImportState('idle'); }}
              placeholder="nsec1…"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: '1 1 260px', background: 'var(--raised, #111)', color: 'var(--text-1)',
                border: '1px solid var(--border)', padding: '12px 14px',
                fontFamily: 'var(--font-mono)', fontSize: '12px',
              }}
            />
            <button
              onClick={handleImport}
              disabled={importState === 'busy' || importVal.trim().length === 0}
              style={{
                background: 'var(--text-1)', color: '#000', border: 'none',
                padding: '12px 24px', fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: importState === 'busy' ? 'default' : 'pointer',
                opacity: importState === 'busy' || importVal.trim().length === 0 ? 0.6 : 1,
              }}
            >
              {importState === 'busy' ? tx('importing', lang) : tx('import_btn', lang)}
            </button>
          </div>
          {importState === 'invalid' && (
            <p style={{ fontSize: '12px', color: 'var(--negative, #ef4444)', marginTop: '14px', fontFamily: 'var(--font-mono)' }}>
              {tx('import_invalid', lang)}
            </p>
          )}
          {importState === 'ok-twin' && (
            <p style={{ fontSize: '12px', color: 'var(--positive, #22c55e)', marginTop: '14px', fontFamily: 'var(--font-mono)' }}>
              {tx('import_ok_twin', lang)}
            </p>
          )}
          {importState === 'ok-notwin' && (
            <p style={{ fontSize: '12px', color: 'var(--positive, #22c55e)', marginTop: '14px', fontFamily: 'var(--font-mono)' }}>
              {tx('import_ok_notwin', lang)}
            </p>
          )}
        </div>

        {/* Pseudonym explanation */}
        <p style={{
          fontSize: '13px',
          color: 'var(--text-3)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.7,
          marginBottom: '40px',
          maxWidth: '560px',
        }}>
          {tx('pseudonym', lang)}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? 'var(--raised)' : 'var(--text-1)',
              color: copied ? 'var(--text-2)' : '#000',
              border: copied ? '1px solid var(--border)' : 'none',
              padding: '14px 32px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {copied ? tx('copied', lang) : tx('copy_id', lang)}
          </button>
          <button
            onClick={() => router.push('/twin')}
            style={{
              background: 'transparent',
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
              padding: '14px 32px',
              fontSize: '13px',
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            {tx('share_twin', lang)}
          </button>
        </div>

        {/* Share twin link */}
        {identity && (
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={shareLink}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
              }}
            >
              {t(lang, 'identity_share_link')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
