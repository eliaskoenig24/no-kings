'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/context/LangContext';
import { SUPPORTED_LANGS, t } from '@/lib/i18n';

export default function OnboardingOverlay() {
  const { lang } = useLang();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('nk-onboarded')) {
      const timer = setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => setMounted(true));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem('nk-onboarded', '1');
    setMounted(false);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  const isRTL = SUPPORTED_LANGS.find((l) => l.code === lang)?.dir === 'rtl';

  return (
    <div
      role="banner"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        transform: mounted ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 350ms cubic-bezier(0.16,1,0.3,1)',
        direction: isRTL ? 'rtl' : 'ltr',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px clamp(20px, 5vw, 80px)',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-1)', margin: 0, lineHeight: 1.4 }}>
            {t(lang, 'onboard_title')}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.4, fontFamily: 'var(--font-mono)' }}>
            {t(lang, 'onboard_privacy')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          <Link
            href="/training"
            onClick={handleDismiss}
            style={{
              display: 'inline-block',
              background: 'var(--text-1)',
              color: '#080808',
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {t(lang, 'onboard_cta')}
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
