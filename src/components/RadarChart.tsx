'use client';

import { useRef } from 'react';
import { TwinValues, TOPICS } from '@/types';
import { useLang } from '@/context/LangContext';
import { getTopicLabel } from '@/lib/i18n';

export interface RadarChartProps {
  values: TwinValues;
  compare?: TwinValues;
  size?: number;
  animated?: boolean;
  exportable?: boolean;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function valuesToPoints(
  values: TwinValues,
  center: number,
  maxRadius: number,
): string {
  return TOPICS.map((topic, i) => {
    const angle = (i / TOPICS.length) * 360;
    const r = values[topic] * maxRadius;
    const { x, y } = polarToCartesian(center, center, r, angle);
    return `${x},${y}`;
  }).join(' ');
}

function gridPoints(center: number, maxRadius: number, fraction: number): string {
  return TOPICS.map((_, i) => {
    const angle = (i / TOPICS.length) * 360;
    const r = maxRadius * fraction;
    const { x, y } = polarToCartesian(center, center, r, angle);
    return `${x},${y}`;
  }).join(' ');
}

function downloadSvg(svgEl: SVGSVGElement) {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  // Add background rect so PNG looks good on white/dark bg
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', '#0a0a0a');
  clone.insertBefore(rect, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(clone);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'no-kings-twin.svg';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPng(svgEl: SVGSVGElement, size: number) {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', '#0a0a0a');
  clone.insertBefore(rect, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(clone);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = 'no-kings-twin.png';
    a.click();
  };
  img.src = url;
}

export default function RadarChart({
  values,
  compare,
  size = 280,
  animated = true,
  exportable = false,
}: RadarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { lang } = useLang();
  const center = size / 2;
  const labelPadding = 36;
  const maxRadius = center - labelPadding;

  const mainPoints = valuesToPoints(values, center, maxRadius);
  const comparePoints = compare ? valuesToPoints(compare, center, maxRadius) : null;

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: size }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        role="img"
        aria-label="Political values radar chart"
      >
        <title>Your political values profile</title>
        {/* Background grid polygons at 25%, 50%, 75% */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <polygon
            key={fraction}
            points={gridPoints(center, maxRadius, fraction)}
            fill="none"
            stroke="#1F1F1F"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines from center to outer */}
        {TOPICS.map((_, i) => {
          const angle = (i / TOPICS.length) * 360;
          const { x, y } = polarToCartesian(center, center, maxRadius, angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#1A1A1A"
              strokeWidth="1"
            />
          );
        })}

        {/* Compare polygon (network average) */}
        {comparePoints && (
          <polygon
            points={comparePoints}
            fill="rgba(240,240,240,0.05)"
            stroke="#404040"
            strokeWidth="1"
            strokeDasharray="4 3"
            style={animated ? { transition: 'all 0.8s ease' } : undefined}
          />
        )}

        {/* Main profile polygon */}
        <polygon
          points={mainPoints}
          fill="rgba(75, 158, 255, 0.15)"
          stroke="#4B9EFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
          style={animated ? { transition: 'all 0.8s ease' } : undefined}
        />

        {/* Axis labels */}
        {TOPICS.map((topic, i) => {
          const angle = (i / TOPICS.length) * 360;
          const { x, y } = polarToCartesian(center, center, maxRadius + 18, angle);

          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          const dx = x - center;
          if (dx > 4) textAnchor = 'start';
          else if (dx < -4) textAnchor = 'end';

          const shortLabel = getTopicLabel(topic, lang).slice(0, 6);

          return (
            <text
              key={topic}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize="11"
              fontFamily="ui-monospace, 'SF Mono', 'Fira Code', monospace"
              fill="#404040"
              letterSpacing="0.04em"
            >
              {shortLabel}
            </text>
          );
        })}
      </svg>

      {exportable && (
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          marginTop: '12px',
        }}>
          <button
            onClick={() => svgRef.current && downloadSvg(svgRef.current)}
            title="Download as SVG"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-3)',
              padding: '5px 12px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.color = 'var(--text-1)';
              (e.target as HTMLElement).style.borderColor = 'var(--text-1)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.color = 'var(--text-3)';
              (e.target as HTMLElement).style.borderColor = 'var(--border)';
            }}
          >
            ↓ SVG
          </button>
          <button
            onClick={() => svgRef.current && downloadPng(svgRef.current, size)}
            title="Download as PNG"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-3)',
              padding: '5px 12px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.color = 'var(--text-1)';
              (e.target as HTMLElement).style.borderColor = 'var(--text-1)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.color = 'var(--text-3)';
              (e.target as HTMLElement).style.borderColor = 'var(--border)';
            }}
          >
            ↓ PNG
          </button>
        </div>
      )}
    </div>
  );
}
