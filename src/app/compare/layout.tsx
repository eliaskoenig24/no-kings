import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare Values',
  description: 'Compare your digital twin to the global network and to political archetypes — Progressive, Conservative, Libertarian. See exactly where you agree and diverge.',
  openGraph: {
    title: 'Compare Values — no kings',
    description: 'Your values vs. the world. Your values vs. political archetypes. Radar chart comparison.',
    url: 'https://no-kings.world/compare',
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
