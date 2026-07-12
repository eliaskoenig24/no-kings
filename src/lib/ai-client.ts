/**
 * Main-thread facade for the AI worker. The page only ever posts messages;
 * every heavy computation happens off-thread so the UI never stutters.
 */

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  onProgress?: (frac: number) => void;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./ai.worker.ts', import.meta.url));
    worker.onmessage = (e: MessageEvent) => {
      const { id, type } = e.data as { id: number; type: string };
      const p = pending.get(id);
      if (!p) return;
      if (type === 'progress') p.onProgress?.(e.data.frac as number);
      else if (type === 'result') { pending.delete(id); p.resolve(e.data.value); }
      else if (type === 'error') { pending.delete(id); p.reject(new Error(e.data.message as string)); }
    };
    worker.onerror = (e) => {
      console.error('[no-kings] ai worker crashed', e.message);
      for (const p of pending.values()) p.reject(new Error(e.message || 'worker crashed'));
      pending.clear();
      worker = null; // next call restarts it
    };
  }
  return worker;
}

function call<T>(
  op: string,
  payload: Record<string, unknown> = {},
  onProgress?: (frac: number) => void,
  transfer: Transferable[] = [],
): Promise<T> {
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress });
    getWorker().postMessage({ id, op, ...payload }, transfer);
  });
}

// single-flight loaders: many callers, one download
let asrLoad: Promise<boolean> | null = null;
export function loadAsr(onProgress?: (frac: number) => void): Promise<boolean> {
  if (!asrLoad) {
    asrLoad = call<boolean>('asr-load', {}, onProgress);
    asrLoad.catch(() => { asrLoad = null; });
  }
  return asrLoad;
}
export function asrReady(): boolean {
  return asrLoad !== null;
}

let embedLoad: Promise<boolean> | null = null;
export function loadEmbed(onProgress?: (frac: number) => void): Promise<boolean> {
  if (!embedLoad) {
    embedLoad = call<boolean>('embed-load', {}, onProgress);
    embedLoad.catch(() => { embedLoad = null; });
  }
  return embedLoad;
}
export function embedReady(): boolean {
  return embedLoad !== null;
}

export function transcribeInWorker(audio: Float32Array, lang: string): Promise<string> {
  return call<string>('transcribe', { audio, lang }, undefined, [audio.buffer]);
}

export function matchInWorker(text: string, lang: string, k: number): Promise<{ id: string; score: number }[]> {
  return call('match', { text, lang, k });
}
