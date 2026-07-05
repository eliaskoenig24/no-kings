import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import { LangProvider } from '@/context/LangContext';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  metadataBase: new URL('https://no-kings.world'),
  title: { default: 'no kings — Augmented Democracy', template: '%s | no kings' },
  description: 'Train your digital twin in 2 minutes. It speaks for you on every political question — permanently, without you having to be online. Equal voice for every human.',
  keywords: ['digital twin', 'democracy', 'political compass', 'civic tech', 'nostr', 'augmented democracy', 'political values', 'citizen voice'],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'no kings',
  },
  openGraph: {
    title: 'no kings — Augmented Democracy',
    description: 'Train your digital twin in 2 minutes. It speaks for you on every political question — permanently, without you having to be online.',
    url: 'https://no-kings.world',
    siteName: 'no kings',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'no kings — Augmented Democracy',
    description: 'Your digital twin speaks for you — 24/7, on every political question. Equal voice for every human.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  themeColor: '#080808',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'no kings',
  url: 'https://no-kings.world',
  description: 'The platform for the collective will of humanity. Train your digital twin and join the global network of equal voices.',
  inLanguage: ['de', 'en', 'es', 'fr', 'pt', 'ar', 'zh', 'ja', 'hi', 'ru', 'id', 'tr', 'ko', 'it', 'nl', 'pl', 'uk', 'vi', 'bn', 'fa'],
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://no-kings.world/twin/{pubkey}',
    'query-input': 'required name=pubkey',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen">
        <a href="#main-content" style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}>
          Skip to main content
        </a>
        <LangProvider>
          <Header />
          <OnboardingOverlay />
          <main id="main-content">{children}</main>
          <BottomNav />
          <Footer />
          <InstallPrompt />
        </LangProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
