import { TOPICS, type TwinValues } from '@/types';

/**
 * Renders the twin as a shareable 1080×1080 PNG — radar, archetype, url.
 * Client-only (uses canvas). The card is the product's viral artifact:
 * it must look good in a feed without any explanation.
 */
export async function generateShareCard(opts: {
  values: TwinValues;
  archetypeLabel: string;
  topicLabels: Record<string, string>; // topic key → localized short label
  headline: string;                    // e.g. "MY DIGITAL TWIN"
  url?: string;
}): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');

  const mono = 'ui-monospace, "SF Mono", Menlo, monospace';
  const sans = '-apple-system, "Helvetica Neue", Arial, sans-serif';

  // Background
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, S, S);

  // Wordmark
  ctx.fillStyle = '#8a8a8a';
  ctx.font = `500 30px ${mono}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('n o   k i n g s', 72, 104);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, 130);
  ctx.lineTo(S - 72, 130);
  ctx.stroke();

  // Radar geometry
  const cx = S / 2;
  const cy = 470;
  const R = 240;
  const n = TOPICS.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, r: number): [number, number] => [
    cx + Math.cos(angle(i)) * r,
    cy + Math.sin(angle(i)) * r,
  ];

  // Grid rings
  for (const frac of [0.25, 0.5, 0.75, 1]) {
    ctx.strokeStyle = frac === 1 ? '#2a2a2a' : '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [x, y] = point(i % n, R * frac);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#1a1a1a';
  for (let i = 0; i < n; i++) {
    const [x, y] = point(i, R);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Value polygon
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const topic = TOPICS[i % n];
    const [x, y] = point(i % n, R * Math.max(0.04, opts.values[topic]));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(233,207,154,0.20)';
  ctx.fill();
  ctx.strokeStyle = '#E9CF9A';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Vertex dots
  ctx.fillStyle = '#E9CF9A';
  for (let i = 0; i < n; i++) {
    const topic = TOPICS[i];
    const [x, y] = point(i, R * Math.max(0.04, opts.values[topic]));
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Topic labels around the radar
  ctx.font = `500 26px ${mono}`;
  ctx.fillStyle = '#9a9a9a';
  for (let i = 0; i < n; i++) {
    const [x, y] = point(i, R + 52);
    const cos = Math.cos(angle(i));
    ctx.textAlign = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center';
    ctx.textBaseline = 'middle';
    const label = (opts.topicLabels[TOPICS[i]] ?? TOPICS[i]).toUpperCase();
    ctx.fillText(label, x, y);
  }

  // Headline + archetype
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#666';
  ctx.font = `500 24px ${mono}`;
  ctx.fillText(opts.headline.toUpperCase(), cx, 858);
  ctx.fillStyle = '#f0f0f0';
  ctx.font = `700 64px ${sans}`;
  ctx.fillText(opts.archetypeLabel, cx, 930);

  // Footer url
  ctx.fillStyle = '#555';
  ctx.font = `500 26px ${mono}`;
  ctx.fillText(opts.url ?? 'no-kings.world', cx, 1010);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** Shares the card via the native share sheet (mobile) or downloads it. */
export async function shareOrDownloadCard(blob: Blob, filename = 'no-kings-twin.png'): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
