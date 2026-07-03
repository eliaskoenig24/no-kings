import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Train Your Digital Twin',
  description: 'Set 8 sliders, 2 minutes. Your digital twin learns your political values and speaks for you permanently — on every political question, 24/7.',
  openGraph: {
    title: 'Train Your Digital Twin — no kings',
    description: 'Set 8 sliders, 2 minutes. Your values become a permanent voice in the global network.',
    url: 'https://no-kings.world/training',
  },
  twitter: {
    title: 'Train Your Digital Twin — no kings',
    description: '2 minutes. 8 sliders. Your political voice — permanently active.',
  },
};

export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
