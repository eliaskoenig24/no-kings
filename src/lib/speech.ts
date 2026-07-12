/**
 * On-device speech recognition — the second step of the voice vision.
 *
 * Whisper (tiny, multilingual) runs entirely on the device, inside the AI
 * worker (src/lib/ai.worker.ts) so the page never stutters while it thinks.
 * The model (~40 MB) is downloaded once and cached; the user's VOICE NEVER
 * LEAVES THE DEVICE — that is the red line (docs/VISION.md) and the reason
 * this does not use the Web Speech API, which ships audio to Apple/Google.
 */

import { loadAsr, asrReady, transcribeInWorker } from '@/lib/ai-client';

export function speechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof WebAssembly !== 'undefined' &&
    typeof Worker !== 'undefined'
  );
}

/** Loads the recognizer once (subsequent calls reuse it). */
export function loadRecognizer(onProgress?: (frac: number) => void): Promise<boolean> {
  return loadAsr(onProgress);
}

export function recognizerReady(): boolean {
  return asrReady();
}

/** Transcribes 16 kHz mono audio off-thread; hints Whisper with the UI language. */
export function transcribe(audio: Float32Array, lang: string): Promise<string> {
  return transcribeInWorker(audio, lang);
}

export type Recording = {
  /** stops recording early; the promise still resolves with the audio */
  stop: () => void;
  /** resolves with 16 kHz mono samples ready for transcribe() */
  audio: Promise<Float32Array>;
};

/**
 * Records one utterance: tap once, speak, and it stops BY ITSELF when you
 * pause (~1.4 s of silence after speech); tap again to stop early, hard cap
 * as a net. `onLevel` reports live input loudness (0–1) for UI feedback.
 */
export async function recordUtterance(
  maxMs = 15000,
  onLevel?: (level: number) => void,
): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
  recorder.start();

  // live level + voice activity: created inside the tap gesture, so the
  // context is allowed to run everywhere including iOS
  const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  let spoke = false;
  let silentSince = 0;
  const SPEECH_RMS = 0.015;
  const SILENCE_MS = 1400;

  const timer = setTimeout(() => stop(), maxMs);
  const meter = setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    onLevel?.(Math.min(1, rms * 9));
    if (rms > SPEECH_RMS) {
      spoke = true;
      silentSince = 0;
    } else if (spoke) {
      const now = Date.now();
      if (!silentSince) silentSince = now;
      else if (now - silentSince > SILENCE_MS) stop(); // you paused — that's the signal
    }
  }, 100);

  function stop() {
    clearTimeout(timer);
    clearInterval(meter);
    onLevel?.(0);
    if (recorder.state === 'recording') recorder.stop();
  }

  const audio = (async () => {
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    clearInterval(meter);
    const blob = new Blob(chunks, { type: recorder.mimeType });
    const raw = await blob.arrayBuffer();
    try {
      // decode at device rate, then resample to 16 kHz via OfflineAudioContext
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
