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

/**
 * Plays back a recorded voice message (16 kHz mono samples) — hearing your
 * own recording is the proof that the microphone actually captured you.
 * Returns a stop function.
 */
export function playRecording(samples: Float32Array, onEnded?: () => void): () => void {
  const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  void ctx.resume();
  const buf = ctx.createBuffer(1, samples.length, 16000);
  buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.onended = () => { onEnded?.(); void ctx.close(); };
  src.start();
  return () => { try { src.stop(); } catch { /* already stopped */ } };
}

export type Recording = {
  /** stops recording early; the promise still resolves with the audio */
  stop: () => void;
  /** resolves with 16 kHz mono samples ready for transcribe() */
  audio: Promise<Float32Array>;
};

/**
 * Records one voice message: tap to start, tap to stop, hard cap as a net.
 * Deliberately NO silence auto-stop — a recording that ends itself while the
 * speaker is thinking reads as "the mic is broken". `onLevel` reports live
 * input loudness (0–1) for UI feedback.
 */
export async function recordUtterance(
  maxMs = 30000,
  onLevel?: (level: number) => void,
): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });

  // created inside the tap gesture, so the context is allowed to run
  // everywhere including iOS — and resumed, because iOS can still hand
  // out a suspended context (which would record pure silence)
  const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  void ctx.resume();
  const source = ctx.createMediaStreamSource(stream);

  // Raw PCM via ScriptProcessor — deliberately NOT MediaRecorder: iOS Safari
  // records fragmented MP4 that its own decodeAudioData cannot decode, so the
  // utterance was silently lost on tap-stop. Raw samples have no container to
  // fail on. (ScriptProcessor is deprecated but universal; AudioWorklet needs
  // a separately bundled module — not worth it for mono 16 kHz speech.)
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let recording = true;

  proc.onaudioprocess = (e) => {
    if (!recording) return;
    const data = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    onLevel?.(Math.min(1, Math.sqrt(sum / data.length) * 9));
  };
  source.connect(proc);
  // a processor only runs when routed to the destination — mute it so the
  // microphone is never echoed back through the speakers
  const mute = ctx.createGain();
  mute.gain.value = 0;
  proc.connect(mute);
  mute.connect(ctx.destination);

  const timer = setTimeout(() => stop(), maxMs);
  let resolveStopped!: () => void;
  const stopped = new Promise<void>((resolve) => { resolveStopped = resolve; });

  function stop() {
    if (!recording) return;
    recording = false;
    clearTimeout(timer);
    onLevel?.(0);
    proc.disconnect();
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    resolveStopped();
  }

  const audio = (async () => {
    await stopped;
    try {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const joined = new Float32Array(Math.max(1, total));
      let off = 0;
      for (const c of chunks) { joined.set(c, off); off += c.length; }
      const inRate = ctx.sampleRate;
      if (inRate === 16000) return joined;
      // filtered resample to 16 kHz via OfflineAudioContext — still no decoding
      const buf = ctx.createBuffer(1, joined.length, inRate);
      buf.copyToChannel(joined, 0);
      const frames = Math.max(1, Math.ceil((joined.length / inRate) * 16000));
      const offCtx = new OfflineAudioContext(1, frames, 16000);
      const src = offCtx.createBufferSource();
      src.buffer = buf;
      src.connect(offCtx.destination);
      src.start();
      const rendered = await offCtx.startRendering();
      return rendered.getChannelData(0);
    } finally {
      void ctx.close();
    }
  })();

  return { stop, audio };
}
