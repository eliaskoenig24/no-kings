/**
 * On-device understanding — step 3 of the voice vision.
 *
 * "Tell me what moves you": a small multilingual embedding model (runs
 * entirely in the browser, WebGPU/WASM) maps free speech or text to the
 * closest agenda questions. THE MACHINE ONLY FINDS THE TOPIC — the stance
 * is always taken by the human. No LLM guesses anyone's politics, and the
 * spoken/typed words never leave the device (docs/VISION.md, red line).
 */

import { AGENDA } from '@/data/agenda';
import type { AgendaItem } from '@/types';

export const EMBED_MODEL = 'Xenova/multilingual-e5-small';

/** Below this cosine score a match is noise, not meaning (tuned via e2e:talk). */
export const MATCH_THRESHOLD = 0.82;

export function understandSupported(): boolean {
  return typeof window !== 'undefined' && typeof WebAssembly !== 'undefined';
}

/** Dot product of normalized vectors = cosine similarity. Pure, testable. */
export function cosine(a: Float32Array | number[], b: Float32Array | number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Top-k items by score above a floor, best first. Pure, testable. */
export function topK<T>(items: T[], scores: number[], k: number, minScore: number): { item: T; score: number }[] {
  return items
    .map((item, i) => ({ item, score: scores[i] }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let embedderPromise: Promise<any> | null = null;

/** Loads the embedding model once (~120 MB, cached by the browser). */
export function loadEmbedder(onProgress?: (frac: number) => void): Promise<any> {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const files = new Map<string, { loaded: number; total: number }>();
      const report = () => {
        if (!onProgress || files.size === 0) return;
        let loaded = 0, total = 0;
        for (const f of files.values()) { loaded += f.loaded; total += f.total; }
        if (total > 0) onProgress(Math.min(1, loaded / total));
      };
      const opts = {
        dtype: 'q8' as const,
        progress_callback: (p: any) => {
          if (p.status === 'progress' && p.file && p.total) {
            files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
            report();
          }
          if (p.status === 'done' && p.file) {
            const f = files.get(p.file);
            if (f) { f.loaded = f.total; report(); }
          }
        },
      };
      const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
      try {
        return await pipeline('feature-extraction', EMBED_MODEL, { ...opts, device: hasWebGPU ? 'webgpu' : 'wasm' });
      } catch (err) {
        console.error('[no-kings] embedder load failed on', hasWebGPU ? 'webgpu' : 'wasm', err);
        if (!hasWebGPU) throw err;
        return await pipeline('feature-extraction', EMBED_MODEL, { ...opts, device: 'wasm' });
      }
    })();
    embedderPromise.catch(() => { embedderPromise = null; });
  }
  return embedderPromise;
}

export function embedderReady(): boolean {
  return embedderPromise !== null;
}

async function embed(texts: string[], prefix: 'query: ' | 'passage: '): Promise<Float32Array[]> {
  const fe = await loadEmbedder();
  const out = await fe(texts.map((t) => prefix + t), { pooling: 'mean', normalize: true });
  const [n, dim] = out.dims as [number, number];
  const data = out.data as Float32Array;
  const vecs: Float32Array[] = [];
  for (let i = 0; i < n; i++) vecs.push(data.slice(i * dim, (i + 1) * dim));
  return vecs;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Agenda embeddings are computed once per language and kept for the session —
// 35 short texts, so recomputing per device visit is cheap enough not to
// persist them (localStorage would tie us to one model version).
const agendaCache = new Map<string, Float32Array[]>();

async function agendaVectors(lang: string): Promise<Float32Array[]> {
  const cached = agendaCache.get(lang);
  if (cached) return cached;
  const texts = AGENDA.map((it) => it.text[lang] ?? it.text.en);
  const vecs = await embed(texts, 'passage: ');
  agendaCache.set(lang, vecs);
  return vecs;
}

export type AgendaMatch = { item: AgendaItem; score: number };

/**
 * Maps a free utterance to the closest agenda questions (top k above the
 * noise floor). Empty result = honest "I found no matching question".
 */
export async function matchAgenda(utterance: string, lang: string, k = 3): Promise<AgendaMatch[]> {
  const text = utterance.trim();
  if (!text) return [];
  const [q] = await embed([text], 'query: ');
  const vecs = await agendaVectors(lang);
  const scores = vecs.map((v) => cosine(q, v));
  return topK(AGENDA, scores, k, MATCH_THRESHOLD);
}
