import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insights',
  description: 'What do 2,500 digital twins from 44 countries reveal? Most divided questions, strongest consensus, country outliers, and the global political thermostat.',
  openGraph: {
    title: 'Insights — no kings',
    description: 'The most divided questions, strongest consensus, and country outliers from 2,500 digital twins across 44 countries.',
    url: 'https://no-kings.world/insights',
  },
  twitter: {
    title: 'Insights — no kings',
    description: 'What do 2,500 digital twins from 44 countries really think? See the patterns.',
  },
};

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
