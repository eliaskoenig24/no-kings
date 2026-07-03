import type { Metadata } from 'next';
import { AGENDA } from '@/data/agenda';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = AGENDA.find(a => a.id === params.id);
  if (!item) return { title: 'Question Not Found' };

  const text = item.text['en'] ?? item.text[Object.keys(item.text)[0]];
  const desc = item.description?.['en'];

  return {
    title: text.length > 80 ? text.slice(0, 78) + '…' : text,
    description: desc ?? `What do 2,500 digital twins think about this? See the democratic pulse on no-kings.world.`,
    openGraph: {
      title: text.length > 80 ? text.slice(0, 78) + '…' : text,
      description: desc?.slice(0, 150) ?? 'See the global democratic pulse on no-kings.world.',
      type: 'article',
    },
    twitter: { card: 'summary_large_image' },
  };
}

export async function generateStaticParams() {
  return AGENDA.map(item => ({ id: item.id }));
}

export default function QuestionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
