'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { detectLang, saveLang, type Lang } from '@/lib/i18n';

// Countries where English is NOT the primary language → preferred lang
const COUNTRY_LANG: Record<string, Lang> = {
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', BO: 'es', UY: 'es', PY: 'es',
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt',
  SA: 'ar', AE: 'ar', EG: 'ar', MA: 'ar', DZ: 'ar', TN: 'ar', IQ: 'ar', JO: 'ar', KW: 'ar', LB: 'ar', LY: 'ar',
  CN: 'zh', TW: 'zh', HK: 'zh',
  JP: 'ja',
  KR: 'ko',
  IN: 'hi',
  RU: 'ru',
  UA: 'uk',
  PL: 'pl',
  IT: 'it',
  NL: 'nl',
  TR: 'tr',
  ID: 'id',
  VN: 'vi',
  BD: 'bn',
  IR: 'fa',
};

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  country: string | null;
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  country: null,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    // Detect language from browser / localStorage
    const detected = detectLang();
    setLangState(detected);

    // Detect country from our API (uses Vercel geo headers, no GPS)
    fetch('/api/location')
      .then(r => r.json())
      .then(d => {
        if (d.country) {
          setCountry(d.country);
          // If browser defaulted to English but user is in a non-English country
          // AND the user has no saved preference → apply country default
          const hasStoredPref = typeof window !== 'undefined' && localStorage.getItem('nk-lang');
          if (!hasStoredPref && detected === 'en' && COUNTRY_LANG[d.country]) {
            setLangState(COUNTRY_LANG[d.country]);
          }
        }
      })
      .catch(() => {});
  }, []);

  function setLang(l: Lang) {
    saveLang(l);
    setLangState(l);
    // Update html dir attribute for RTL languages (Arabic)
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, country }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
