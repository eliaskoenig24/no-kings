'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/context/LangContext';

const ITEMS = [
  {
    href: '/',
    label: { de: 'Warum', en: 'Why', es: 'Por qué', fr: 'Pourquoi', pt: 'Por quê', ar: 'لماذا', zh: '为什么', ja: 'なぜ', hi: 'क्यों', ru: 'Почему', id: 'Mengapa', tr: 'Neden', ko: '왜', it: 'Perché', nl: 'Waarom', pl: 'Dlaczego', uk: 'Чому', vi: 'Tại sao', bn: 'কেন', fa: 'چرا' },
  },
    {
    href: '/twin',
    label: { de: 'Zwilling', en: 'Twin', es: 'Gemelo', fr: 'Jumeau', pt: 'Gêmeo', ar: 'توأم', zh: '孪生', ja: 'ツイン', hi: 'जुड़वां', ru: 'Двойник', id: 'Kembaran', tr: 'İkiz', ko: '트윈', it: 'Gemello', nl: 'Tweeling', pl: 'Bliźniak', uk: 'Двійник', vi: 'Sinh đôi', bn: 'যমজ', fa: 'دوقلو' },
  },
  {
    href: '/world',
    label: { de: 'Welt', en: 'World', es: 'Mundo', fr: 'Monde', pt: 'Mundo', ar: 'العالم', zh: '世界', ja: '世界', hi: 'दुनिया', ru: 'Мир', id: 'Dunia', tr: 'Dünya', ko: '세계', it: 'Mondo', nl: 'Wereld', pl: 'Świat', uk: 'Світ', vi: 'Thế giới', bn: 'বিশ্ব', fa: 'جهان' },
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
