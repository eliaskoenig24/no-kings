/// <reference lib="webworker" />
/**
 * The AI worker — ALL on-device inference lives on this thread.
 *
 * Loading and running the models used to happen on the main thread, which
 * froze the page whenever whisper or the embedder was thinking ("es
 * spackt"). Here they can burn a core in peace; the UI stays fluid.
 * The privacy line is unchanged: audio and text enter this worker and
 * only transcripts/match-ids leave it — nothing touches the network
 * except the one-time model download.
 */

import { AGENDA } from '@/data/agenda';
import { cosine, topK, MATCH_THRESHOLD } from '@/lib/similarity';

const ASR_MODEL = 'Xenova/whisper-tiny';
const EMBED_MODEL = 'Xenova/multilingual-e5-small';

/* eslint-disable @typescript-eslint/no-explicit-any */

async function pickDevice(): Promise<'webgpu' | 'wasm'> {
  try {
    const gpu = (self.navigator as any)?.gpu;
    if (!gpu) return 'wasm';
    const adapter = await gpu.requestAdapter();
    if (!adapter) return 'wasm';
    const device = await adapter.requestDevice();
    if (!device) return 'wasm';
    device.destroy?.();
    return 'webgpu';
  } catch {
    return 'wasm';
  }
}

function progressReporter(id: number) {
  const files = new Map<string, { loaded: number; total: number }>();
  return (p: any) => {
    if (p.status === 'progress' && p.file && p.total) {
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
    } else if (p.status === 'done' && p.file) {
      const f = files.get(p.file);
      if (f) f.loaded = f.total;
    } else return;
    let loaded = 0, total = 0;
    for (const f of files.values()) { loaded += f.loaded; total += f.total; }
    if (total > 0) self.postMessage({ id, type: 'progress', frac: Math.min(1, loaded / total) });
  };
}

async function transformersEnv() {
  const mod = await import('@huggingface/transformers');
  const wasm = (mod.env as any)?.backends?.onnx?.wasm;
  if (wasm) wasm.wasmPaths = '/ort/'; // self-hosted runtime, see scripts/copy-ort.mjs
  return mod;
}

let asrPromise: Promise<any> | null = null;
function loadAsr(id: number): Promise<any> {
  if (!asrPromise) {
    asrPromise = (async () => {
      const { pipeline } = await transformersEnv();
      const opts = {
        dtype: 'q8' as const,
        // the ort-web dev build's graph optimizer crashes on the quantized
        // decoder ("TransposeDQWeightsForMatMulNBits missing scale")
        session_options: { graphOptimizationLevel: 'disabled' as const },
        progress_callback: progressReporter(id),
      };
      const device = await pickDevice();
      try {
        return await pipeline('automatic-speech-recognition', ASR_MODEL, { ...opts, device });
      } catch (err) {
        console.error('[no-kings] asr load failed on', device, err);
        if (device === 'wasm') throw err;
        return await pipeline('automatic-speech-recognition', ASR_MODEL, { ...opts, device: 'wasm' });
      }
    })();
    asrPromise.catch(() => { asrPromise = null; });
  }
  return asrPromise;
}

let embedPromise: Promise<any> | null = null;
function loadEmbed(id: number): Promise<any> {
  if (!embedPromise) {
    embedPromise = (async () => {
      const { pipeline } = await transformersEnv();
      const opts = { dtype: 'q8' as const, progress_callback: progressReporter(id) };
      const device = await pickDevice();
      try {
        return await pipeline('feature-extraction', EMBED_MODEL, { ...opts, device });
      } catch (err) {
        console.error('[no-kings] embedder load failed on', device, err);
        if (device === 'wasm') throw err;
        return await pipeline('feature-extraction', EMBED_MODEL, { ...opts, device: 'wasm' });
      }
    })();
    embedPromise.catch(() => { embedPromise = null; });
  }
  return embedPromise;
}

async function embed(texts: string[], prefix: 'query: ' | 'passage: '): Promise<Float32Array[]> {
  const fe = await loadEmbed(-1);
  const out = await fe(texts.map((t) => prefix + t), { pooling: 'mean', normalize: true });
  const [n, dim] = out.dims as [number, number];
  const data = out.data as Float32Array;
  const vecs: Float32Array[] = [];
  for (let i = 0; i < n; i++) vecs.push(data.slice(i * dim, (i + 1) * dim));
  return vecs;
}

// agenda embeddings per language, computed once per worker lifetime
const agendaCache = new Map<string, Float32Array[]>();
async function agendaVectors(lang: string): Promise<Float32Array[]> {
  const cached = agendaCache.get(lang);
  if (cached) return cached;
  const texts = AGENDA.map((it) => it.text[lang] ?? it.text.en);
  const vecs = await embed(texts, 'passage: ');
  agendaCache.set(lang, vecs);
  return vecs;
}

const WHISPER_LANGS = new Set([
  'de', 'en', 'es', 'fr', 'pt', 'ar', 'zh', 'ja', 'hi', 'ru',
  'id', 'tr', 'ko', 'it', 'nl', 'pl', 'uk', 'vi', 'bn', 'fa',
]);

self.onmessage = async (e: MessageEvent) => {
  const { id, op } = e.data as { id: number; op: string };
  try {
    if (op === 'asr-load') {
      await loadAsr(id);
      self.postMessage({ id, type: 'result', value: true });
    } else if (op === 'embed-load') {
      await loadEmbed(id);
      self.postMessage({ id, type: 'result', value: true });
    } else if (op === 'transcribe') {
      const { audio, lang } = e.data as { audio: Float32Array; lang: string };
      const asr = await loadAsr(id);
      const language = WHISPER_LANGS.has(lang) ? lang : undefined;
      let out;
      try {
        out = await asr(audio, { language, task: 'transcribe' });
      } catch {
        out = await asr(audio, { task: 'transcribe' }); // let whisper detect the language
      }
      const text = (Array.isArray(out) ? out[0]?.text : out?.text) ?? '';
      self.postMessage({ id, type: 'result', value: text });
    } else if (op === 'match') {
      const { text, lang, k } = e.data as { text: string; lang: string; k: number };
      const [q] = await embed([text.trim()], 'query: ');
      const vecs = await agendaVectors(lang);
      const scores = vecs.map((v) => cosine(q, v));
      const ranked = topK(AGENDA.map((it) => it.id), scores, k, MATCH_THRESHOLD);
      self.postMessage({ id, type: 'result', value: ranked.map((r) => ({ id: r.item, score: r.score })) });
    } else {
      self.postMessage({ id, type: 'error', message: `unknown op ${op}` });
    }
  } catch (err) {
    console.error('[no-kings] worker op failed:', op, err);
    self.postMessage({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
