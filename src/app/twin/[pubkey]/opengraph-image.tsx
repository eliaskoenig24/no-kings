import { ImageResponse } from 'next/og';

export const runtime = 'nodejs'; // edge 1MB limit exceeded since agenda grew to 20 languages
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TOPICS = ['klimaschutz', 'sozialstaat', 'wirtschaft', 'bildung', 'gesundheit', 'migration', 'freiheit', 'europa'] as const;
const LABELS: Record<string, string> = {
  klimaschutz: 'Climate', sozialstaat: 'Welfare', wirtschaft: 'Market',
  bildung: 'Education', gesundheit: 'Health', migration: 'Migration',
  freiheit: 'Freedom', europa: 'Europe',
};

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function polygonPoints(values: Record<string, number>, cx: number, cy: number, maxR: number) {
  return TOPICS.map((t, i) => {
    const angle = (i / TOPICS.length) * 360;
    const r = (values[t] ?? 0.5) * maxR;
    const { x, y } = polarToCartesian(cx, cy, r, angle);
    return `${x},${y}`;
  }).join(' ');
}

function gridPoints(cx: number, cy: number, maxR: number, frac: number) {
  return TOPICS.map((_, i) => {
    const angle = (i / TOPICS.length) * 360;
    const { x, y } = polarToCartesian(cx, cy, maxR * frac, angle);
    return `${x},${y}`;
  }).join(' ');
}

function classifyArchetype(v: Record<string, number>): string {
  const get = (k: string) => v[k] ?? 0.5;
  const scores = {
    Progressive:  (get('klimaschutz') + get('migration') + (1 - get('wirtschaft'))) / 3,
    'Social Democrat': (get('sozialstaat') + get('gesundheit') + get('bildung')) / 3,
    Liberal:      (get('freiheit') + get('wirtschaft') + (1 - get('sozialstaat'))) / 3,
    Conservative: ((1 - get('migration')) + (1 - get('klimaschutz')) + get('wirtschaft')) / 3,
    Libertarian:  (get('freiheit') + get('wirtschaft') + (1 - get('migration'))) / 3,
  };
  const allClose = Object.values(scores).every(s => Math.abs(s - 0.5) < 0.12);
  if (allClose) return 'Centrist';
  return Object.entries(scores).reduce((best, curr) => curr[1] > best[1] ? curr : best)[0];
}

async function fetchTwinValues(pubkey: string): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(
      `https://api.nostr.band/v0/search/nostr?q=%23no-kings-twin&authors=${pubkey}&limit=1`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const events = data?.relays?.[0]?.events ?? data?.events ?? [];
    if (!events.length) return null;
    const event = events[0];
    const nkTag = (event.tags ?? []).find((t: string[]) => t[0] === 'nk-twin');
    if (nkTag?.[1]) {
      const parsed = JSON.parse(nkTag[1]);
      if (parsed?.klimaschutz !== undefined) return parsed;
    }
    try {
      const content = JSON.parse(event.content);
      if (content?.klimaschutz !== undefined) return content;
    } catch { /* content is human-readable text */ }
    return null;
  } catch {
    return null;
  }
}

export default async function TwinPubkeyOGImage({
  params,
}: {
  params: { pubkey: string };
}) {
  const short = params.pubkey.slice(0, 8) + '…' + params.pubkey.slice(-8);
  const values = await fetchTwinValues(params.pubkey);
  const archetype = values ? classifyArchetype(values) : null;

  const cx = 210;
  const cy = 210;
  const maxR = 148;
  const mainPts = values ? polygonPoints(values, cx, cy, maxR) : null;

  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#080808',
        display: 'flex',
        padding: '56px 64px',
        gap: '56px',
        alignItems: 'center',
      }}>
        {/* Left: Radar SVG */}
        <svg width="420" height="420" viewBox="0 0 420 420" style={{ flexShrink: 0 }}>
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map(f => (
            <polygon key={f} points={gridPoints(cx, cy, maxR, f)} fill="none"
              stroke={f === 0.5 ? '#252525' : '#1A1A1A'} strokeWidth={f === 0.5 ? 1.5 : 1} />
          ))}
          {/* Axes */}
          {TOPICS.map((_, i) => {
            const angle = (i / TOPICS.length) * 360;
            const { x, y } = polarToCartesian(cx, cy, maxR, angle);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#1E1E1E" strokeWidth="1" />;
          })}
          {/* Profile fill */}
          {mainPts && (
            <polygon points={mainPts} fill="rgba(75,158,255,0.15)" stroke="#4B9EFF" strokeWidth="2.5" strokeLinejoin="round" />
          )}
          {/* Default polygon if no values */}
          {!mainPts && (
            <polygon points={polygonPoints({ klimaschutz: 0.5, sozialstaat: 0.5, wirtschaft: 0.5, bildung: 0.5, gesundheit: 0.5, migration: 0.5, freiheit: 0.5, europa: 0.5 }, cx, cy, maxR)}
              fill="rgba(75,158,255,0.06)" stroke="#222222" strokeWidth="1.5" />
          )}
          {/* Labels */}
          {TOPICS.map((t, i) => {
            const angle = (i / TOPICS.length) * 360;
            const { x, y } = polarToCartesian(cx, cy, maxR + 26, angle);
            const dx = x - cx;
            const anchor = dx > 4 ? 'start' : dx < -4 ? 'end' : 'middle';
            return (
              <text key={t} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
                fontSize="13" fontFamily="monospace" fill="#3A3A3A" letterSpacing="0.04em">
                {LABELS[t]}
              </text>
            );
          })}
          {/* Value dots */}
          {values && TOPICS.map((t, i) => {
            const angle = (i / TOPICS.length) * 360;
            const r = (values[t] ?? 0.5) * maxR;
            const { x, y } = polarToCartesian(cx, cy, r, angle);
            return <circle key={t} cx={x} cy={y} r="5" fill="#4B9EFF" />;
          })}
        </svg>

        {/* Right: Info */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
          {/* Header */}
          <div style={{ color: '#4B9EFF', fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.18em', marginBottom: '28px' }}>
            NO KINGS — DIGITAL TWIN
          </div>

          {/* Archetype */}
          {archetype && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}>
              <div style={{
                background: 'rgba(75,158,255,0.12)',
                border: '1px solid rgba(75,158,255,0.25)',
                padding: '5px 14px',
                fontSize: 13,
                fontFamily: 'monospace',
                color: 'rgba(96,165,250,0.9)',
                letterSpacing: '0.10em',
              }}>
                {archetype.toUpperCase()}
              </div>
            </div>
          )}

          {/* Main heading */}
          <div style={{ color: '#F0F0F0', fontSize: 46, fontWeight: 400, lineHeight: 1.1, marginBottom: '28px' }}>
            {values ? 'Political\nProfile' : 'Digital\nTwin'}
          </div>

          {/* Topic bars */}
          {values && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', flex: 1 }}>
              {TOPICS.map(t => {
                const pct = Math.round((values[t] ?? 0) * 100);
                const hue = pct * 1.44;
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: '#484848', fontSize: 11, fontFamily: 'monospace', width: '68px', letterSpacing: '0.04em' }}>
                      {LABELS[t].toUpperCase()}
                    </div>
                    <div style={{
                      flex: 1,
                      height: '4px',
                      background: '#151515',
                      display: 'flex',
                    }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: `hsl(${hue}, 60%, 52%)`,
                      }} />
                    </div>
                    <div style={{ color: '#3A3A3A', fontSize: 11, fontFamily: 'monospace', width: '32px', textAlign: 'right' }}>
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ color: '#282828', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
              {short}
            </div>
            <div style={{ color: '#222222', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
              no-kings.world/twin/{params.pubkey.slice(0, 12)}…
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
