import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Network',
  description: 'See what the world really thinks — live. Thousands of digital twins, aggregated in real-time on the Nostr network. No algorithm. No filter. Pure collective will.',
  openGraph: {
    title: 'Global Network — no kings',
    description: 'Live view of the world\'s political pulse. Thousands of digital twins, no filter.',
    url: 'https://no-kings.world/network',
  },
  twitter: {
    title: 'Global Network — no kings',
    description: 'What does humanity actually want? See live on the Nostr network.',
  },
};

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
