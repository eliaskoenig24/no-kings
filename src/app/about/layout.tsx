import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'The open formula behind no kings: how your 8 values become autonomous political positions. No black box. Every calculation visible and verifiable.',
  openGraph: {
    title: 'How It Works — no kings',
    description: 'The open formula behind augmented democracy. Every vote derivation visible.',
    url: 'https://no-kings.world/about',
  },
  twitter: {
    title: 'How It Works — no kings',
    description: 'Transparent. Open. No black box. See how your twin computes every position.',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
