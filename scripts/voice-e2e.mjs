// macOS-only (uses `say` for real TTS audio). Run: npm run e2e:voice
// E2E: real spoken audio (macOS `say`) → whisper-tiny (same model as the app).
// Asserts the transcript contains the keyword the 20-language parser needs.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pipeline } from '@huggingface/transformers';

const CASES = [
  { lang: 'de', voice: 'Anna', text: 'Ich stimme zu', mustContain: 'stimme zu' },
  { lang: 'de', voice: 'Anna', text: 'Ich stimme überhaupt nicht zu', mustContain: 'überhaupt nicht' },
  { lang: 'en', voice: 'Samantha', text: 'I strongly agree', mustContain: 'agree' },
];

function wavToFloat32(path) {
  const buf = readFileSync(path);
  const idx = buf.indexOf(Buffer.from('data'));
  const size = buf.readUInt32LE(idx + 4);
  const out = new Float32Array(Math.floor(size / 2));
  for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(idx + 8 + i * 2) / 32768;
  return out;
}

console.log('loading whisper-tiny (q8)…');
const asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', { dtype: 'q8' });

let fail = 0;
for (const c of CASES) {
  const wav = `/tmp/nk-voice-${c.lang}-${Buffer.from(c.text).toString('hex').slice(0, 8)}.wav`;
  execSync(`say -v ${c.voice} --data-format=LEI16@16000 -o ${wav} ${JSON.stringify(c.text)}`);
  const audio = wavToFloat32(wav);
  const out = await asr(audio, { language: c.lang, task: 'transcribe' });
  const text = ((Array.isArray(out) ? out[0]?.text : out?.text) ?? '').toLowerCase();
  const ok = text.includes(c.mustContain);
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} [${c.lang}] said: "${c.text}" → heard: "${text.trim()}"`);
}
console.log(fail === 0 ? 'VOICE E2E OK' : `FAILURES: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
