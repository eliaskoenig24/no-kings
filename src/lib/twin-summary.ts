/**
 * Plain-language twin summary — "what your twin stands for" instead of
 * percentage bars. Uses the existing localized SPECTRUM pole labels, so it
 * works in all 20 languages with only four glue words.
 * The numbers stay reachable in edit mode; this is presentation, not hiding.
 */

import { TOPICS, type TopicKey } from '@/types';

export type TwinLean = { key: TopicKey; pole: 'left' | 'right'; strength: 'strong' | 'lean' };

/** |value − 50| at or above this is a clear stance, not a tendency. */
export const STRONG_AT = 22;
/** Below this distance from the center a dimension counts as balanced. */
export const LEAN_AT = 8;

/**
 * Buckets 0–100 dimension values into leans (most decisive first)
 * and balanced dimensions (in canonical topic order).
 */
export function summarizeTwin(values: Record<TopicKey, number>): { leans: TwinLean[]; balanced: TopicKey[] } {
  const leans: (TwinLean & { d: number })[] = [];
  const balanced: TopicKey[] = [];
  for (const key of TOPICS) {
    const d = (values[key] ?? 50) - 50;
    if (Math.abs(d) < LEAN_AT) { balanced.push(key); continue; }
    leans.push({
      key,
      pole: d > 0 ? 'right' : 'left',
      strength: Math.abs(d) >= STRONG_AT ? 'strong' : 'lean',
      d: Math.abs(d),
    });
  }
  leans.sort((a, b) => b.d - a.d);
  return { leans: leans.map(({ key, pole, strength }) => ({ key, pole, strength })), balanced };
}

/** Pole labels are two-line slider captions — flatten for running text. */
export function poleText(label: string): string {
  return label.replace(/\s*\n\s*/g, ' ').trim();
}
