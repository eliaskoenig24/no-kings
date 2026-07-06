'use client';

/**
 * The world, lit country by country.
 *
 * Dark globe, draggable with a finger. A country only lights up once it has
 * reached the k-anonymity threshold — the empty globe is not an embarrassment,
 * it is the founding story: watch the world wake up. Color encodes support
 * intensity in ONE hue (a majority is a measurement, not a victory).
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { geoOrthographic, geoPath, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import worldData from 'world-atlas/countries-110m.json';
import { iso31661 } from 'iso-3166';
import { MIN_AGGREGATE_PERSONS } from '@/lib/network-policy';

export type CountryDatum = { count: number; support: number };

const NUMERIC_TO_A2: Record<string, string> = Object.fromEntries(
  iso31661.map((c) => [c.numeric.padStart(3, '0'), c.alpha2]),
);

type CountryFeature = Feature<Geometry, { name?: string }> & { id?: string | number };

const world = worldData as unknown as Topology<{ countries: GeometryCollection<{ name?: string }> }>;
const COUNTRIES = (feature(world, world.objects.countries) as unknown as { features: CountryFeature[] }).features;

function alpha2Of(f: CountryFeature): string | undefined {
  return NUMERIC_TO_A2[String(f.id ?? '').padStart(3, '0')];
}

export default function WorldGlobe({
  data,
  lang,
  hint,
  lockedLabel,
  supportLabel,
}: {
  data: Record<string, CountryDatum>;
  lang: string;
  hint: string;
  lockedLabel: string;   // e.g. "Personen bis zur Freischaltung"
  supportLabel: string;  // e.g. "dafür — Frage des Tages"
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(360);
  const rotationRef = useRef<[number, number]>([-10, -20]);
  const draggingRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [selected, setSelected] = useState<{ name: string; a2?: string } | null>(null);
  const autoSpinRef = useRef(true);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const projection = geoOrthographic()
      .fitExtent([[6, 6], [size - 6, size - 6]], { type: 'Sphere' })
      .rotate(rotationRef.current);
    const path = geoPath(projection, ctx);

    // sphere
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.fillStyle = '#0b0b0b';
    ctx.fill();
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (const f of COUNTRIES) {
      const a2 = alpha2Of(f);
      const d = a2 ? data[a2] : undefined;
      const unlocked = !!d && d.count >= MIN_AGGREGATE_PERSONS;
      ctx.beginPath();
      path(f);
      if (unlocked) {
        // one hue, intensity = support share
        ctx.fillStyle = `rgba(75,158,255,${(0.25 + d!.support * 0.6).toFixed(3)})`;
      } else if (d && d.count > 0) {
        ctx.fillStyle = '#20242c'; // someone is here — faintly warmer than empty
      } else {
        ctx.fillStyle = '#161616';
      }
      ctx.fill();
      ctx.strokeStyle = selected && a2 && selected.a2 === a2 ? '#F0F0F0' : '#0b0b0b';
      ctx.lineWidth = selected && a2 && selected.a2 === a2 ? 1.4 : 0.6;
      ctx.stroke();
    }
  }, [size, data, selected]);

  // responsive sizing
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(Math.min(480, Math.max(260, el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // slow ambient spin until first touch
  useEffect(() => {
    if (reducedMotion) { draw(); return; }
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      if (autoSpinRef.current && !draggingRef.current) {
        rotationRef.current = [rotationRef.current[0] + dt * 4, rotationRef.current[1]];
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draw, reducedMotion]);

  useEffect(() => { draw(); }, [draw]);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    draggingRef.current = { x: e.clientX, y: e.clientY, moved: false };
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = draggingRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      drag.moved = true;
      autoSpinRef.current = false;
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
    const [l, p] = rotationRef.current;
    rotationRef.current = [l + dx * 0.45, Math.max(-80, Math.min(80, p - dy * 0.45))];
    if (reducedMotion) draw();
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = draggingRef.current;
    draggingRef.current = null;
    if (!drag || drag.moved) return;
    // tap: find the country under the finger
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;
    const projection = geoOrthographic()
      .fitExtent([[6, 6], [size - 6, size - 6]], { type: 'Sphere' })
      .rotate(rotationRef.current);
    const coords = projection.invert?.([x, y]);
    if (!coords) return;
    const hitF = COUNTRIES.find(f => geoContains(f, coords));
    if (hitF) {
      setSelected({ name: hitF.properties?.name ?? '—', a2: alpha2Of(hitF) });
    } else {
      setSelected(null);
    }
    if (reducedMotion) draw();
  }

  const sel = selected?.a2 ? data[selected.a2] : undefined;
  const selUnlocked = !!sel && sel.count >= MIN_AGGREGATE_PERSONS;

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px`, display: 'block', margin: '0 auto', touchAction: 'none', cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="img"
        aria-label={hint}
      />
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', textAlign: 'center', letterSpacing: '0.08em', margin: '10px 0 0' }}>
        {hint}
      </p>
      {selected && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '16px 18px', marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-1)' }}>{selected.name}</span>
            {selUnlocked ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--accent, #4B9EFF)' }}>
                {Math.round(sel!.support * 100)}% <span style={{ fontWeight: 400, fontSize: '10px', color: 'var(--text-3)' }}>{supportLabel} · n={sel!.count}</span>
              </span>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                {sel?.count ?? 0} / {MIN_AGGREGATE_PERSONS} · {lockedLabel}
              </span>
            )}
          </div>
          {!selUnlocked && (
            <div style={{ height: '3px', background: 'var(--divider)', position: 'relative', marginTop: '10px' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, Math.round(((sel?.count ?? 0) / MIN_AGGREGATE_PERSONS) * 100))}%`, background: 'var(--accent)' }} />
            </div>
          )}
        </div>
      )}
      <span style={{ display: 'none' }}>{lang}</span>
    </div>
  );
}
