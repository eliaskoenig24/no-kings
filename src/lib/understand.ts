/**
 * On-device understanding — step 3 of the voice vision.
 *
 * "Tell me what moves you": a small multilingual embedding model maps free
 * speech or text to the closest agenda questions. It runs entirely on the
 * device, inside the AI worker (src/lib/ai.worker.ts) so the page never
 * stutters. THE MACHINE ONLY FINDS THE TOPIC — the stance is always taken
 * by the human, and the spoken/typed words never leave the device.
 */

import { AGENDA } from '@/data/agenda';
import type { AgendaItem } from '@/types';
import { loadEmbed, embedReady, matchInWorker } from '@/lib/ai-client';

// pure math shared with the worker — re-exported here for the tests
export { cosine, topK, MATCH_THRESHOLD } from '@/lib/similarity';

export function understandSupported(): boolean {
  return typeof window !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof Worker !== 'undefined';
}

/** Loads the embedding model once (~150 MB, cached by the browser). */
export function loadEmbedder(onProgress?: (frac: number) => void): Promise<boolean> {
  return loadEmbed(onProgress);
}

export function embedderReady(): boolean {
  return embedReady();
}

export type AgendaMatch = { item: AgendaItem; score: number };

/**
 * Maps a free utterance to the closest agenda questions (top k above the
 * noise floor). Empty result = honest "I found no matching question".
 */
export async function matchAgenda(utterance: string, lang: string, k = 3): Promise<AgendaMatch[]> {
  const text = utterance.trim();
  if (!text) return [];
  const ranked = await matchInWorker(text, lang, k);
  const byId = new Map(AGENDA.map((it) => [it.id, it]));
  return ranked
    .map(({ id, score }) => ({ item: byId.get(id), score }))
    .filter((m): m is AgendaMatch => m.item !== undefined);
}
