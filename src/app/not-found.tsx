'use client';

import Link from 'next/link';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';

const NOT_FOUND_TITLE: Record<string, string> = {
  de: 'Diese Seite existiert nicht.', en: 'This page does not exist.',
  es: 'Esta página no existe.', fr: 'Cette page n\'existe pas.',
  pt: 'Esta página não existe.', ar: 'هذه الصفحة غير موجودة.',
  zh: '该页面不存在。', ja: 'このページは存在しません。',
  hi: 'यह पृष्ठ मौजूद नहीं है।', ru: 'Такой страницы не существует.',
  id: 'Halaman ini tidak ada.', tr: 'Bu sayfa mevcut değil.',
  ko: '이 페이지는 존재하지 않습니다.', it: 'Questa pagina non esiste.',
  nl: 'Deze pagina bestaat niet.', pl: 'Ta strona nie istnieje.',
  uk: 'Ця сторінка не існує.', vi: 'Trang này không tồn tại.',
  bn: 'এই পৃষ্ঠাটি বিদ্যমান নেই।', fa: 'این صفحه وجود ندارد.',
};

const NOT_FOUND_SUB: Record<string, string> = {
  de: 'Geh zurück zur Startseite oder trainiere deinen Zwilling.',
  en: 'Go back to the homepage or train your twin.',
  es: 'Vuelve a la página principal o entrena tu gemelo.',
  fr: 'Retournez à la page d\'accueil ou entraînez votre jumeau.',
  pt: 'Volte para a página inicial ou treine seu gêmeo.',
  ar: 'عد إلى الصفحة الرئيسية أو درّب توأمك.',
  zh: '返回首页或训练您的数字孪生。', ja: 'ホームに戻るか、ツインを訓練してください。',
  hi: 'होम पर वापस जाएं या अपना ट्विन ट्रेन करें।',
  ru: 'Вернитесь на главную страницу или тренируйте своего двойника.',
  id: 'Kembali ke beranda atau latih kembaran Anda.',
  tr: 'Ana sayfaya dönün veya ikizinizi eğitin.',
  ko: '홈페이지로 돌아가거나 트윈을 훈련하세요.',
  it: 'Torna alla homepage o allena il tuo gemello.',
  nl: 'Ga terug naar de homepage of train je tweeling.',
  pl: 'Wróć do strony głównej lub wytrenuj swojego bliźniaka.',
  uk: 'Поверніться на головну або тренуйте свого двійника.',
  vi: 'Quay lại trang chủ hoặc huấn luyện sinh đôi của bạn.',
  bn: 'হোমপেজে ফিরে যান বা আপনার যমজ প্রশিক্ষণ দিন।',
  fa: 'به صفحه اصلی برگردید یا دوقلوی خود را آموزش دهید.',
};

export default function NotFound() {
  const { lang } = useLang();
  const isRtl = lang === 'ar' || lang === 'fa';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(80px, 10vw, 140px) 0',
      }}
    >
      <div className="container" style={{ maxWidth: '520px' }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-3)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '32px',
        }}>
          404
        </p>
        <h1 style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.8rem)',
          marginBottom: '24px',
          fontWeight: 400,
          lineHeight: 1.2,
        }}>
          {NOT_FOUND_TITLE[lang] ?? NOT_FOUND_TITLE.en}
        </h1>
        <p style={{
          fontSize: '15px',
          lineHeight: 1.85,
          color: 'var(--text-2)',
          marginBottom: '48px',
        }}>
          {NOT_FOUND_SUB[lang] ?? NOT_FOUND_SUB.en}
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            display: 'inline-block',
            background: 'var(--text-1)',
            color: 'var(--bg)',
            padding: '12px 28px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            ← Home
          </Link>
          <Link href="/training" style={{
            display: 'inline-block',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            padding: '12px 28px',
            fontSize: '12px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {t(lang, 'nav_create')}
          </Link>
        </div>
      </div>
    </div>
  );
}
