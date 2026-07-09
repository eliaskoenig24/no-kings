// Quality gate for step 3 of the voice vision ("tell me what moves you"):
// real multilingual utterances must map to the right agenda questions using
// the exact embedding model the app ships. Run: npm run e2e:talk
//
// Requires Node >= 23.6 (type stripping) for the direct agenda.ts import.
import { pipeline } from '@huggingface/transformers';
import { AGENDA } from '../src/data/agenda.ts';

const MODEL = 'Xenova/multilingual-e5-small';

// utterance → at least one of these agenda ids must be in the top 3
const CASES = [
  { lang: 'de', text: 'Die Mieten sind viel zu hoch, das kann sich doch keiner mehr leisten', expect: ['mietendeckel-national', 'mietpreisdeckel-national', 'sozialwohnungsbau-pflicht'] },
  { lang: 'de', text: 'Wir tun einfach viel zu wenig für den Klimaschutz', expect: ['eu-klimaneutral-2035', 'klimafluechtlinge-aufnahme', 'atomkraft-brueckentechnologie'] },
  { lang: 'en', text: 'The rich should finally pay much higher taxes', expect: ['vermoegenssteuer-millionaere', 'digitalsteuer-konzerne', 'bildungsausgaben-verdoppeln'] },
  { lang: 'es', text: 'La sanidad debería ser gratuita para todos', expect: ['buergerversicherung-gesundheit', 'patentrecht-impfstoffe'] },
  { lang: 'fr', text: 'On devrait travailler seulement quatre jours par semaine', expect: ['vier-tage-woche'] },
  { lang: 'zh', text: '房租太贵了，年轻人根本住不起', expect: ['mietendeckel-national', 'mietpreisdeckel-national', 'sozialwohnungsbau-pflicht'] },
  { lang: 'en', text: 'I am scared of AI becoming smarter than humans', expect: ['ki-superintelligenz-pause', 'ki-regulierung-global'] },
];

function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // vectors are normalized
}

console.log(`loading ${MODEL} (q8)…`);
const fe = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });

async function embed(texts, prefix) {
  const out = await fe(texts.map((t) => prefix + t), { pooling: 'mean', normalize: true });
  const [n, dim] = out.dims;
  const vecs = [];
  for (let i = 0; i < n; i++) vecs.push(out.data.slice(i * dim, (i + 1) * dim));
  return vecs;
}

let fail = 0;
for (const c of CASES) {
  const passages = AGENDA.map((it) => it.text[c.lang] ?? it.text.en);
  const [q] = await embed([c.text], 'query: ');
  const pv = await embed(passages, 'passage: ');
  const ranked = AGENDA
    .map((it, i) => ({ id: it.id, score: cosine(q, pv[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const ok = ranked.some((r) => c.expect.includes(r.id));
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} [${c.lang}] "${c.text}"`);
  for (const r of ranked) console.log(`     ${r.score.toFixed(3)}  ${r.id}`);
}
console.log(fail === 0 ? 'TALK E2E OK' : `FAILURES: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
