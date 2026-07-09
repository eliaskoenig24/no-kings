/**
 * Voice output — the twin reads questions aloud.
 * Uses the device's built-in speech synthesis: runs locally, needs no
 * download and no network. First step of the voice vision (docs/VISION.md).
 */

/** Minimal voice shape so the picker is testable without a browser. */
export type VoiceLike = { lang: string; localService?: boolean; name?: string };

/**
 * Picks the best voice for a language: exact locale beats prefix match,
 * and local (on-device) voices beat network voices — political content
 * should not be synthesized by a remote service either.
 */
export function pickVoice<V extends VoiceLike>(voices: V[], lang: string): V | null {
  const norm = lang.toLowerCase();
  const scored = voices
    .map((v) => {
      const vl = v.lang.toLowerCase().replace('_', '-');
      let score = 0;
      if (vl === norm) score = 4;
      else if (vl.startsWith(norm + '-')) score = 3;
      else if (vl.split('-')[0] === norm) score = 2;
      if (score > 0 && v.localService !== false) score += 4; // prefer on-device
      return { v, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.v ?? null;
}

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Voice list loads async on some browsers — resolve when it's there. */
function getVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1200); // some browsers never fire the event
  });
}

/** Reads text aloud in the given language. Resolves when finished or cancelled. */
export async function speak(text: string, lang: string): Promise<void> {
  if (!ttsAvailable()) return;
  const synth = window.speechSynthesis;
  synth.cancel(); // never queue — a second tap restarts
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voice = pickVoice(await getVoices(), lang);
  if (voice) {
    u.voice = voice as SpeechSynthesisVoice;
    u.lang = voice.lang;
  }
  u.rate = 0.96;
  await new Promise<void>((resolve) => {
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  if (ttsAvailable()) window.speechSynthesis.cancel();
}
