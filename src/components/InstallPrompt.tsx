'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const { lang } = useLang();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('nk-install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || dismissed) return null;

  const labels: Record<string, { msg: string; install: string; later: string }> = {
    de: { msg: 'no kings als App installieren', install: 'Installieren', later: 'Später' },
    en: { msg: 'Install no kings as an app', install: 'Install', later: 'Later' },
    es: { msg: 'Instalar no kings como aplicación', install: 'Instalar', later: 'Después' },
    fr: { msg: 'Installer no kings comme application', install: 'Installer', later: 'Plus tard' },
    pt: { msg: 'Instalar no kings como aplicativo', install: 'Instalar', later: 'Depois' },
    ar: { msg: 'تثبيت no kings كتطبيق', install: 'تثبيت', later: 'لاحقاً' },
    zh: { msg: '将 no kings 安装为应用', install: '安装', later: '稍后' },
    ja: { msg: 'no kings をアプリとしてインストール', install: 'インストール', later: 'あとで' },
    hi: { msg: 'no kings को ऐप के रूप में इंस्टॉल करें', install: 'इंस्टॉल', later: 'बाद में' },
    ru: { msg: 'Установить no kings как приложение', install: 'Установить', later: 'Позже' },
    id: { msg: 'Pasang no kings sebagai aplikasi', install: 'Pasang', later: 'Nanti' },
    tr: { msg: 'no kings\'i uygulama olarak yükle', install: 'Yükle', later: 'Sonra' },
    ko: { msg: 'no kings를 앱으로 설치', install: '설치', later: '나중에' },
    it: { msg: 'Installa no kings come app', install: 'Installa', later: 'Dopo' },
    nl: { msg: 'Installeer no kings als app', install: 'Installeren', later: 'Later' },
    pl: { msg: 'Zainstaluj no kings jako aplikację', install: 'Zainstaluj', later: 'Później' },
    uk: { msg: 'Встановити no kings як додаток', install: 'Встановити', later: 'Пізніше' },
    vi: { msg: 'Cài đặt no kings như ứng dụng', install: 'Cài đặt', later: 'Để sau' },
    bn: { msg: 'no kings অ্যাপ হিসেবে ইনস্টল করুন', install: 'ইনস্টল', later: 'পরে' },
    fa: { msg: 'نصب no kings به عنوان برنامه', install: 'نصب', later: 'بعداً' },
  };

  const label = labels[lang] ?? labels.en;

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setPromptEvent(null);
  }

  function handleDismiss() {
    localStorage.setItem('nk-install-dismissed', '1');
    setDismissed(true);
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--raised)',
      border: '1px solid var(--border)',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 200,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      maxWidth: 'calc(100vw - 48px)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)' }}>
        {label.msg}
      </span>
      <button
        onClick={handleInstall}
        style={{
          background: 'var(--text-1)',
          color: 'var(--bg)',
          border: 'none',
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {label.install}
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-3)',
          fontSize: '12px',
          cursor: 'pointer',
          padding: '4px',
          flexShrink: 0,
        }}
      >
        {label.later}
      </button>
    </div>
  );
}
