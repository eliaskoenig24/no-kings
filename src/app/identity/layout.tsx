import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nostr Identity',
  description: 'Your cryptographic Nostr identity. No email, no account — just a keypair that is yours alone, stored locally in your browser.',
  openGraph: {
    title: 'Nostr Identity | no kings',
    description: 'Your pseudonymous keypair. No account required — just a cryptographic identity stored in your browser.',
  },
  twitter: { card: 'summary_large_image' },
};

export default function IdentityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
