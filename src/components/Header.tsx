'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { SUPPORTED_LANGS } from '@/lib/i18n';

const NAV = [
  {
    href: '/',
    label: { de: 'Die Welt', en: 'The World', es: 'El Mundo', fr: 'Le Monde', pt: 'O Mundo', ar: 'العالم', zh: '世界', ja: '世界', hi: 'दुनिया', ru: 'Мир', id: 'Dunia', tr: 'Dünya', ko: '세계', it: 'Il Mondo', nl: 'De Wereld', pl: 'Świat', uk: 'Світ', vi: 'Thế Giới', bn: 'বিশ্ব', fa: 'جهان' },
  },
  {
    href: '/twin',
    label: { de: 'Mein Zwilling', en: 'My Twin', es: 'Mi Gemelo', fr: 'Mon Jumeau', pt: 'Meu Gêmeo', ar: 'توأمي', zh: '我的孪生', ja: '私のツイン', hi: 'मेरा जुड़वां', ru: 'Мой двойник', id: 'Kembaran Saya', tr: 'Benim İkizim', ko: '내 트윈', it: 'Il Mio Gemello', nl: 'Mijn Tweeling', pl: 'Mój Bliźniak', uk: 'Мій двійник', vi: 'Sinh Đôi Của Tôi', bn: 'আমার যমজ', fa: 'دوقلوی من' },
  },
  {
    href: '/pulse',
    label: { de: 'Trainieren', en: 'Train', es: 'Entrenar', fr: 'Entraîner', pt: 'Treinar', ar: 'تدريب', zh: '训练', ja: 'トレーニング', hi: 'प्रशिक्षण', ru: 'Тренировка', id: 'Latihan', tr: 'Eğitim', ko: '훈련', it: 'Allenare', nl: 'Trainen', pl: 'Trenować', uk: 'Тренування', vi: 'Huấn luyện', bn: 'প্রশিক্ষণ', fa: 'تمرین' },
  },
];

export default function Header() {
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--divider)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '0.12em',
          color: 'var(--text-1)',
          textDecoration: 'none',
        }}>
          no kings
        </Link>

        {/* Desktop nav */}
        <nav className="header-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {NAV.map(({ href, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                fontSize: '13px',
                color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                textDecoration: 'none',
                letterSpacing: '0.02em',
                borderBottom: isActive ? '1px solid var(--text-1)' : '1px solid transparent',
                paddingBottom: '2px',
                transition: 'color 150ms',
              }}>
                {(label as Record<string, string>)[lang] ?? (label as Record<string, string>)['en']}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Language switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen(o => !o)}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
                fontSize: '11px', letterSpacing: '0.1em',
                textTransform: 'uppercase', cursor: 'pointer', padding: '4px 0',
              }}
            >
              {lang}
            </button>
            {langOpen && (
              <>
                <div onClick={() => setLangOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  background: 'var(--raised)', border: '1px solid var(--border)',
                  zIndex: 50, minWidth: '120px', maxHeight: '320px', overflowY: 'auto',
                }}>
                  {SUPPORTED_LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '10px 16px',
                        background: l.code === lang ? 'var(--border)' : 'transparent',
                        border: 'none', textAlign: 'left', fontSize: '13px',
                        color: l.code === lang ? 'var(--text-1)' : 'var(--text-2)',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Hamburger — mobile */}
          <button
            className="header-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
            style={{
              background: 'none', border: 'none', color: 'var(--text-2)',
              cursor: 'pointer', padding: '4px', display: 'none',
              flexDirection: 'column', gap: '5px',
              alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px',
            }}
          >
            <span style={{ display: 'block', width: '18px', height: '1.5px', background: 'currentColor' }} />
            <span style={{ display: 'block', width: '18px', height: '1.5px', background: 'currentColor' }} />
            <span style={{ display: 'block', width: '18px', height: '1.5px', background: 'currentColor' }} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
          <div style={{
            position: 'absolute', top: '56px', left: 0, right: 0,
            background: 'var(--bg)', borderBottom: '1px solid var(--divider)',
            zIndex: 49, padding: '8px 24px 16px',
          }}>
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
                display: 'block', fontSize: '15px', padding: '14px 0',
                borderBottom: '1px solid var(--divider)',
                color: pathname === href ? 'var(--text-1)' : 'var(--text-2)',
                textDecoration: 'none',
              }}>
                {(label as Record<string, string>)[lang] ?? (label as Record<string, string>)['en']}
              </Link>
            ))}
          </div>
        </>
      )}
    </header>
  );
}
