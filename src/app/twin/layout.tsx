import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Digital Twin',
  description: 'See your political values as a radar chart. Compare yourself to the global average. Share your twin to the Nostr network — your voice, permanent and equal.',
  openGraph: {
    title: 'My Digital Twin — no kings',
    description: 'Your political values visualized. How do you compare to 2,500+ voices worldwide?',
    url: 'https://no-kings.world/twin',
  },
  twitter: {
    title: 'My Digital Twin — no kings',
    description: 'Radar chart of my political values. Compare me to the world average.',
  },
};

export default function TwinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
