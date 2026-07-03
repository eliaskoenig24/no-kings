'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { getOrCreateIdentity } from '@/lib/identity';
import type { Identity } from '@/lib/identity';
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
  share_twin:     { de: 'Zwilling teilen', en: 'Share twin', es: 'Compartir gemelo', fr: 'Partager le jumeau', pt: 'Compartilhar gêmeo', ar: 'مشاركة التوأم', zh: '分享孪生', ja: 'ツインを共有', hi: 'ट्विन शेयर करें', ru: 'Поделиться двойником', id: 'Bagikan kembaran', tr: 'İkizi paylaş', ko: '트윈 공유', it: 'Condividi gemello', nl: 'Tweeling delen', pl: 'Udostępnij bliźniaka', uk: 'Поділитися двійником', vi: 'Chia sẻ sinh đôi', bn: 'যমজ শেয়ার করুন', fa: 'اشتراک‌گذاری دوقلو' },
};

function tx(key: keyof typeof ID_TX, lang: string): string {
  const block = ID_TX[key] as Record<string, string>;
  return block[lang] ?? block.en;
}

export default function IdentityPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
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

        {/* Private key block */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '40px',
          marginBottom: '40px',
        }}>
          <p className="label" style={{ marginBottom: '12px' }}>{tx('private_key', lang)}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>
            {tx('private_desc', lang)}
          </p>
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
