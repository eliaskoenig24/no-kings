/**
 * On-device speech recognition — the second step of the voice vision.
 *
 * Whisper (tiny, multilingual) runs entirely in the browser via WebGPU or
 * WASM. The model (~40 MB) is downloaded once from the Hugging Face CDN and
 * cached; the user's VOICE NEVER LEAVES THE DEVICE — that is the red line
 * (docs/VISION.md) and the reason this does not use the Web Speech API,
 * which ships audio to Apple/Google servers.
 */

const MODEL_ID = 'onnx-community/whisper-tiny';

// Whisper language tokens use ISO codes; all 20 platform languages are covered.
const WHISPER_LANGS = new Set([
  'de', 'en', 'es', 'fr', 'pt', 'ar', 'zh', 'ja', 'hi', 'ru',
  'id', 'tr', 'ko', 'it', 'nl', 'pl', 'uk', 'vi', 'bn', 'fa',
]);

export function speechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof WebAssembly !== 'undefined'
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let recognizerPromise: Promise<any> | null = null;

/**
 * Loads the recognizer once (subsequent calls reuse it). Progress is
 * reported as 0–1 across all model files so the UI can show one bar.
 */
export function loadRecognizer(onProgress?: (frac: number) => void): Promise<any> {
  if (!recognizerPromise) {
    recognizerPromise = (async () => {
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
      // WebGPU where available, WASM everywhere else.
      const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
      try {
        return await pipeline('automatic-speech-recognition', MODEL_ID, {
          ...opts, device: hasWebGPU ? 'webgpu' : 'wasm',
        });
      } catch (err) {
        console.error('[no-kings] speech model load failed on', hasWebGPU ? 'webgpu' : 'wasm', err);
        if (!hasWebGPU) throw err;
        return await pipeline('automatic-speech-recognition', MODEL_ID, { ...opts, device: 'wasm' });
      }
    })();
    // a failed load must not poison future attempts
    recognizerPromise.catch(() => { recognizerPromise = null; });
  }
  return recognizerPromise;
}

export function recognizerReady(): boolean {
  return recognizerPromise !== null;
}

/** Transcribes 16 kHz mono audio; hints Whisper with the UI language. */
export async function transcribe(audio: Float32Array, lang: string): Promise<string> {
  const recognizer = await loadRecognizer();
  const language = WHISPER_LANGS.has(lang) ? lang : undefined;
  try {
    const out = await recognizer(audio, { language, task: 'transcribe' });
    return (Array.isArray(out) ? out[0]?.text : out?.text) ?? '';
  } catch {
    // some builds reject the language option — retry letting Whisper detect it
    const out = await recognizer(audio, { task: 'transcribe' });
    return (Array.isArray(out) ? out[0]?.text : out?.text) ?? '';
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type Recording = {
  /** stops recording early; the promise still resolves with the audio */
  stop: () => void;
  /** resolves with 16 kHz mono samples ready for transcribe() */
  audio: Promise<Float32Array>;
};

/**
 * Records one utterance from the microphone (tap to stop, hard cap maxMs)
 * and resamples it to the 16 kHz mono Float32Array Whisper expects.
 */
export async function recordUtterance(maxMs = 6000): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
  recorder.start();
  const timer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, maxMs);

  const stop = () => {
    clearTimeout(timer);
    if (recorder.state === 'recording') recorder.stop();
  };

  const audio = (async () => {
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: recorder.mimeType });
    const raw = await blob.arrayBuffer();
    // decode at device rate, then resample to 16 kHz via OfflineAudioContext
    const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    try {
      const decoded = await ctx.decodeAudioData(raw);
      const frames = Math.max(1, Math.ceil(decoded.duration * 16000));
      const off = new OfflineAudioContext(1, frames, 16000);
      const src = off.createBufferSource();
      src.buffer = decoded;
      src.connect(off.destination);
      src.start();
      const rendered = await off.startRendering();
      return rendered.getChannelData(0);
    } finally {
      void ctx.close();
    }
  })();

  return { stop, audio };
}
