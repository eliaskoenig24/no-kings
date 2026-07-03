import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Political Archetypes',
  description: 'How does your digital twin compare to 6 global political archetypes — Progressive, Social Democrat, Conservative, Libertarian? See your match score for each.',
  openGraph: {
    title: 'Political Archetypes — no kings',
    description: 'Compare your values to 6 political archetypes. Which one matches you most?',
    url: 'https://no-kings.world/politicians',
  },
};

export default function PoliticiansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
