// Browser E2E: does the on-device understanding model actually LOAD in a
// real browser build? (The node e2e tests prove model quality, not the
// bundled browser path — this catches bundler/wasm-asset failures.)
//
//   npm run build && npm run e2e:browser
//
// Starts `next start` on :3055, clicks the load button on /twin, and fails
// loudly with every console/network error if the model does not become ready.
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';

const PORT = 3055;

// real spoken German for the fake microphone (macOS `say`)
const MIC_WAV = '/tmp/nk-mic-e2e.wav';
execSync(`say -v Anna --data-format=LEI16@44100 -o ${MIC_WAV} "Die Mieten sind viel zu hoch, das kann sich niemand mehr leisten"`);
const server = spawn('npx', ['next', 'start', '-p', String(PORT)], { stdio: 'pipe' });
const kill = () => { try { server.kill('SIGTERM'); } catch { /* gone */ } };
process.on('exit', kill);

await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('server start timeout')), 30000);
  server.stdout.on('data', (d) => { if (String(d).includes('Ready')) { clearTimeout(t); resolve(); } });
  server.stderr.on('data', (d) => process.stderr.write(d));
});

const browser = await chromium.launchPersistentContext(
  `${process.env.HOME}/.cache/no-kings-browser-e2e`, // persists the ~150 MB model cache between runs (outside the repo — deploy uploads must never see it)
  {
    headless: true,
    locale: 'de-DE', // the fake mic speaks German — the language hint must match
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${MIC_WAV}`,
    ],
    permissions: ['microphone'],
  },
);
const page = await browser.newPage();

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`[console.${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (req) => errors.push(`[requestfailed] ${req.url()} — ${req.failure()?.errorText}`));
page.on('response', (res) => { if (res.status() >= 400) errors.push(`[http ${res.status()}] ${res.url()}`); });

await page.goto(`http://localhost:${PORT}/twin`, { waitUntil: 'networkidle' });

// tap the hero button that loads the understanding model
await page.getByRole('button').filter({ hasText: /bewegt|moves you/i }).first().click();

// success = the mic button (talk-ready state) appears; give the download time
let ok = false;
try {
  await page.waitForSelector('textarea', { timeout: 420000 });
  ok = true;
} catch { /* fall through to report */ }

if (ok) {
  // prove matching works end-to-end in the browser
  await page.fill('textarea', 'Die Mieten sind viel zu hoch, das kann sich keiner mehr leisten');
  await page.getByRole('button', { name: /^(Verstehen|Understand)$/ }).click();
  try {
    await page.waitForSelector('text=/Miete|Mieten|rent/i', { timeout: 120000 });
    console.log('✓ text path: model loaded AND matched a rent question');
  } catch {
    ok = false;
    errors.push('model loaded but matching produced no rent question');
  }
}

// ---- the microphone path: record fake-mic speech → whisper → match ----
if (ok) {
  await page.fill('textarea', ''); // transcript must land here on its own
  await page.getByTestId('talk-mic').click();       // start (may first download whisper ~43 MB)
  await page.waitForTimeout(6500);                  // let the fake mic "speak"
  await page.getByTestId('talk-mic').click().catch(() => {}); // stop (no-op if auto-stopped)
  try {
    await page.waitForFunction(
      () => (document.querySelector('textarea')?.value ?? '').length > 5,
      { timeout: 240000 },
    );
    const transcript = await page.inputValue('textarea');
    console.log(`✓ mic path: heard "${transcript.trim()}"`);
    if (!/miete|rent/i.test(transcript)) {
      ok = false;
      errors.push(`transcript does not mention rent: "${transcript}"`);
    }
  } catch {
    ok = false;
    errors.push('mic path: no transcript ever appeared in the textarea');
  }
}

if (!ok) {
  console.error('✗ browser E2E FAILED. Collected errors:');
  for (const e of errors) console.error('  ' + e);
} else if (errors.length) {
  console.log('note — nonfatal console noise:');
  for (const e of errors.slice(0, 10)) console.log('  ' + e);
}

await browser.close();
kill();
process.exit(ok ? 0 : 1);
