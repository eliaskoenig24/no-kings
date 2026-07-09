// Prebuild: self-host the onnxruntime-web wasm runtime under /ort/.
// The bundler only emits one of the four wasm variants, so the runtime's
// own file resolution 404s in production; serving all variants from our
// origin makes on-device inference deterministic (and adds no third-party
// host beyond the model CDN already disclosed in the privacy policy).
import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const dst = join(root, 'public', 'ort');
mkdirSync(dst, { recursive: true });

let n = 0;
for (const f of readdirSync(src)) {
  if (/^ort-wasm-simd-threaded.*\.(wasm|mjs)$/.test(f)) {
    copyFileSync(join(src, f), join(dst, f));
    n++;
  }
}
console.log(`[copy-ort] ${n} runtime files → public/ort/`);
