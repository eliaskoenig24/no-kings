import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Weighted global means from 2500 demo twins (10 world regions, population-weighted)
const GLOBAL_VALUES = [
  { label: 'EDUCATION',  pct: 70 },
  { label: 'HEALTH',     pct: 67 },
  { label: 'WELFARE',    pct: 59 },
  { label: 'CLIMATE',    pct: 57 },
  { label: 'FREEDOM',    pct: 52 },
  { label: 'ECONOMY',    pct: 47 },
  { label: 'MIGRATION',  pct: 39 },
  { label: 'EUROPE',     pct: 27 },
];

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#080808',
        display: 'flex',
        padding: '52px 64px',
        gap: '64px',
      }}>

        {/* Left: Branding + question */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '340px', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 13,
            letterSpacing: '0.18em',
            color: '#E9CF9A',
            marginBottom: '28px',
          }}>
            NO KINGS
          </div>

          <div style={{
            fontSize: 38,
            fontWeight: 400,
            color: '#F0F0F0',
            lineHeight: 1.2,
            marginBottom: '24px',
          }}>
            What do the world&apos;s digital twins want?
          </div>

          <div style={{
            fontSize: 14,
            color: '#484848',
            lineHeight: 1.7,
            marginBottom: 'auto',
          }}>
            2,500 voices across 10 world regions. No polls. No surveys. Political values — measured directly.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '32px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#3A3A3A', letterSpacing: '0.06em' }}>
              no-kings.world
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#2A2A2A', letterSpacing: '0.04em' }}>
              Augmented Democracy · 20 languages · Open Source
            </div>
          </div>
        </div>

        {/* Right: Data bars */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          gap: '18px',
        }}>
          {GLOBAL_VALUES.map(({ label, pct }) => {
            const hue = pct * 1.4;
            const barColor = `hsl(${hue}, 60%, 52%)`;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Label */}
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#3A3A3A',
                  letterSpacing: '0.08em',
                  width: '80px',
                  flexShrink: 0,
                }}>
                  {label}
                </div>

                {/* Bar track */}
                <div style={{
                  flex: 1,
                  height: '6px',
                  background: '#151515',
                  display: 'flex',
                  borderRadius: '1px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: barColor,
                  }} />
                </div>

                {/* Percentage */}
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: 700,
                  color: barColor,
                  width: '36px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}>
                  {`${pct}%`}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div style={{
            marginTop: '8px',
            fontFamily: 'monospace',
            fontSize: 10,
            color: '#242424',
            letterSpacing: '0.06em',
            borderTop: '1px solid #141414',
            paddingTop: '12px',
          }}>
            AVERAGE SUPPORT ACROSS 2,500 DIGITAL TWINS · DEMO DATA
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
