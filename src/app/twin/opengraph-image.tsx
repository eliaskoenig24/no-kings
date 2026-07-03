import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DEMO_PROFILE = {
  klimaschutz:  0.82,
  sozialstaat:  0.71,
  wirtschaft:   0.44,
  bildung:      0.88,
  gesundheit:   0.76,
  migration:    0.55,
  freiheit:     0.67,
  europa:       0.73,
};

const LABELS = [
  { key: 'klimaschutz', label: 'CLIMATE',   abbr: '🌿' },
  { key: 'sozialstaat', label: 'WELFARE',   abbr: '🏥' },
  { key: 'wirtschaft',  label: 'ECONOMY',   abbr: '📊' },
  { key: 'bildung',     label: 'EDUCATION', abbr: '📚' },
  { key: 'gesundheit',  label: 'HEALTH',    abbr: '❤️' },
  { key: 'migration',   label: 'MIGRATION', abbr: '🌍' },
  { key: 'freiheit',    label: 'FREEDOM',   abbr: '🕊️' },
  { key: 'europa',      label: 'EUROPE',    abbr: '🇪🇺' },
];

export default function TwinOGImage() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#080808',
        display: 'flex',
        padding: '52px 64px',
      }}>
        {/* Left: header + bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.18em', color: '#4B9EFF' }}>
              NO KINGS
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#2A2A2A' }}>·</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#3A3A3A', letterSpacing: '0.1em' }}>
              DIGITAL TWIN
            </div>
          </div>

          <div style={{ fontSize: 36, fontWeight: 400, color: '#F0F0F0', lineHeight: 1.2, marginBottom: '8px' }}>
            Your digital twin
          </div>
          <div style={{ fontSize: 36, fontWeight: 400, color: '#F0F0F0', lineHeight: 1.2, marginBottom: '40px' }}>
            speaks for you — always.
          </div>

          {/* 8 dimension bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {LABELS.map(({ key, label }) => {
              const val = DEMO_PROFILE[key as keyof typeof DEMO_PROFILE];
              const pct = Math.round(val * 100);
              const hue = Math.round(val * 120);
              const color = `hsl(${hue},55%,48%)`;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: '#3A3A3A', width: '68px', flexShrink: 0 }}>
                    {label}
                  </div>
                  <div style={{ flex: 1, height: '6px', background: '#1A1A1A', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color }} />
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color, width: '28px', textAlign: 'right' }}>
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', fontFamily: 'monospace', fontSize: 11, color: '#2A2A2A', letterSpacing: '0.04em' }}>
            no-kings.world/training
          </div>
        </div>

        {/* Right: archetype + CTA */}
        <div style={{ width: '260px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: '48px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.14em', color: '#22c55e', textTransform: 'uppercase' }}>
              ARCHETYPE
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: '#22c55e', letterSpacing: '0.04em' }}>
              PROGRESSIVE
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#2A2A2A', marginTop: '4px' }}>
              example profile
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#3A3A3A', textAlign: 'right', lineHeight: 1.6 }}>
              2,500 digital twins<br />44 countries<br />30 global questions
            </div>
            <div style={{
              background: '#F0F0F0',
              color: '#080808',
              padding: '10px 20px',
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}>
              CREATE YOUR TWIN →
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
