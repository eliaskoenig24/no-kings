'use client';

import Link from 'next/link';
import { useLang } from '@/context/LangContext';

const TAGLINE: Record<string, string> = {
  de: 'Deine Stimme. Permanent. Für immer.',
  en: 'Your voice. Permanent. Forever.',
  es: 'Tu voz. Permanente. Para siempre.',
  fr: 'Ta voix. Permanente. Pour toujours.',
  pt: 'Sua voz. Permanente. Para sempre.',
  ar: 'صوتك. دائم. إلى الأبد.',
  zh: '你的声音。永久。永远。',
  ja: 'あなたの声。永続的。永遠に。',
  hi: 'तुम्हारी आवाज़। स्थायी। हमेशा के लिए।',
  ru: 'Ваш голос. Постоянно. Навсегда.',
  id: 'Suaramu. Permanen. Selamanya.',
  tr: 'Sesin. Kalıcı. Sonsuza kadar.',
  ko: '당신의 목소리. 영구적으로. 영원히.',
  it: 'La tua voce. Permanente. Per sempre.',
  nl: 'Jouw stem. Permanent. Voor altijd.',
  pl: 'Twój głos. Trwały. Na zawsze.',
  uk: 'Ваш голос. Назавжди. Постійно.',
  vi: 'Giọng nói của bạn. Vĩnh viễn. Mãi mãi.',
  bn: 'তোমার কণ্ঠ। স্থায়ী। চিরকালের জন্য।',
  fa: 'صدای شما. دائمی. برای همیشه.',
};

export default function Footer() {
  const { lang } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer style={{ borderTop: '1px solid var(--divider)', padding: '40px 0 32px', marginTop: '80px' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', letterSpacing: '0.08em', marginBottom: '6px' }}>
            no kings
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6 }}>
            {TAGLINE[lang] ?? TAGLINE.en}
          </p>
        </div>
        <nav style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/"         style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>Die Welt</Link>
          <Link href="/twin"     style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>Mein Zwilling</Link>
          <Link href="/training" style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>Training</Link>
          <Link href="/about"    style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>About</Link>
        </nav>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}>
          © {year} no kings · Open Source
        </span>
      </div>
    </footer>
  );
}
