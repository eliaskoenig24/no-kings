import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Web of Trust',
  description: 'Build a decentralized web of trust with other users. Vouch for real people to strengthen the collective signal against Sybil attacks.',
  openGraph: {
    title: 'Web of Trust | no kings',
    description: 'A decentralized reputation layer: vouch for real people, strengthen the democratic signal.',
  },
  twitter: { card: 'summary_large_image' },
};

export default function TrustLayout({ children }: { children: React.ReactNode }) {
  return children;
}
