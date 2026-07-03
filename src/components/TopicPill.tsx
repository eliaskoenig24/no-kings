'use client';

import { type TopicKey, TOPIC_EMOJIS } from '@/types';
import { useLang } from '@/context/LangContext';
import { getTopicLabel } from '@/lib/i18n';

interface TopicPillProps {
  topic: TopicKey;
  variant?: 'aligned' | 'diverged' | 'neutral';
  size?: 'sm' | 'md';
}

const VARIANT_CLASSES: Record<NonNullable<TopicPillProps['variant']>, string> = {
  aligned: 'bg-green-900/50 text-green-300 border-green-800',
  diverged: 'bg-red-900/50 text-red-300 border-red-800',
  neutral: 'bg-slate-800 text-slate-300 border-slate-700',
};

const SIZE_CLASSES: Record<NonNullable<TopicPillProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
};

export default function TopicPill({
  topic,
  variant = 'neutral',
  size = 'md',
}: TopicPillProps) {
  const { lang } = useLang();
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full border',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
      ].join(' ')}
    >
      <span>{TOPIC_EMOJIS[topic]}</span>
      <span>{getTopicLabel(topic, lang)}</span>
    </span>
  );
}
