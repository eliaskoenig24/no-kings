import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Twin History',
  description: 'Track how your political values have evolved over time. See every version of your digital twin and the changes between them.',
  openGraph: {
    title: 'Twin History | no kings',
    description: 'Track how your political values have evolved. Every version of your digital twin, timestamped.',
  },
  twitter: { card: 'summary_large_image' },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
