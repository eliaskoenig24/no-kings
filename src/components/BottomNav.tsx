'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/context/LangContext';

const ITEMS = [
  {
    href: '/',
    label: { de: 'Welt', en: 'World', es: 'Mundo', fr: 'Monde', pt: 'Mundo', ar: 'العالم', zh: '世界', ja: '世界', hi: 'दुनिया', ru: 'Мир', id: 'Dunia', tr: 'Dünya', ko: '세계', it: 'Mondo', nl: 'Wereld', pl: 'Świat', uk: 'Світ', vi: 'Thế giới', bn: 'বিশ্ব', fa: 'جهان' },
  },
  {
    href: '/training',
    label: { de: 'Trainieren', en: 'Train', es: 'Entrenar', fr: 'Entraîner', pt: 'Treinar', ar: 'تدريب', zh: '训练', ja: '訓練', hi: 'प्रशिक्षण', ru: 'Тренировка', id: 'Latihan', tr: 'Eğitim', ko: '훈련', it: 'Allenare', nl: 'Trainen', pl: 'Trening', uk: 'Тренування', vi: 'Huấn luyện', bn: 'প্রশিক্ষণ', fa: 'تمرین' },
  },
  {
    href: '/twin',
    label: { de: 'Zwilling', en: 'Twin', es: 'Gemelo', fr: 'Jumeau', pt: 'Gêmeo', ar: 'توأم', zh: '孪生', ja: 'ツイン', hi: 'जुड़वां', ru: 'Двойник', id: 'Kembaran', tr: 'İkiz', ko: '트윈', it: 'Gemello', nl: 'Tweeling', pl: 'Bliźniak', uk: 'Двійник', vi: 'Sinh đôi', bn: 'যমজ', fa: 'دوقلو' },
  },
];

/** Mobile-only bottom tab bar — navigation must be visible, not hidden behind an icon. */
export default function BottomNav() {
  const pathname = usePathname();
  const { lang } = useLang();

  return (
    <nav
      className="bottom-nav"
      aria-label="Primary mobile"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45,
        background: 'rgba(8,8,8,0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--divider)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {ITEMS.map(({ href, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '3px', minHeight: '52px', padding: '6px 4px',
              textDecoration: 'none',
              color: active ? 'var(--text-1)' : 'var(--text-3)',
            }}
          >
            <span aria-hidden="true" style={{
              width: '14px', height: '2px',
              background: active ? 'var(--accent)' : 'transparent',
            }} />
            <span style={{ fontSize: '11px', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
              {(label as Record<string, string>)[lang] ?? (label as Record<string, string>)['en']}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
