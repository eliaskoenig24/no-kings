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
let COUNTRIES = (feature(world, world.objects.countries) as unknown as { features: CountryFeature[] }).features;

// The 110m atlas keeps the initial load light; zooming in swaps in the 50m
// atlas once, so borders stay smooth instead of turning polygonal.
let hiResRequested = false;
function ensureHiRes(zoom: number) {
  if (hiResRequested || zoom < 2.2) return;
  hiResRequested = true;
  import('world-atlas/countries-50m.json').then((mod) => {
    const w = (mod.default ?? mod) as unknown as Topology<{ countries: GeometryCollection<{ name?: string }> }>;
    COUNTRIES = (feature(w, w.objects.countries) as unknown as { features: CountryFeature[] }).features;
  }).catch(() => { /* keep 110m */ });
}

function alpha2Of(f: CountryFeature): string | undefined {
  return NUMERIC_TO_A2[String(f.id ?? '').padStart(3, '0')];
}

export type RegionRow = { code: string; name: string; count: number; unlocked: boolean };

export default function WorldGlobe({
  data,
  lang,
  hint,
  lockedLabel,
  supportLabel,
  regions,
}: {
  data: Record<string, CountryDatum>;
  lang: string;
  hint: string;
  lockedLabel: string;   // e.g. "Personen bis zur Freischaltung"
  supportLabel: string;  // e.g. "dafür — Frage des Tages"
  regions?: Record<string, RegionRow[]>; // zoom level 2: per-country region breakdown
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(360);
  const rotationRef = useRef<[number, number]>([-10, -20]);
  const zoomRef = useRef(1);        // rendered zoom (smoothed)
  const zoomTargetRef = useRef(1);  // 1–12, pinch or wheel sets this; rAF glides toward it
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistRef = useRef<number | null>(null);
  const draggingRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [selected, setSelected] = useState<{ name: string; a2?: string } | null>(null);
  const autoSpinRef = useRef(true);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const baseScaleRef = useRef(1);
  const projectionRef = useRef(geoOrthographic());
  useEffect(() => {
    const p = geoOrthographic().fitExtent([[6, 6], [size - 6, size - 6]], { type: 'Sphere' });
    baseScaleRef.current = p.scale();
    projectionRef.current = p;
  }, [size]);

  const makeProjection = useCallback(() => {
    return projectionRef.current
      .rotate(rotationRef.current)
      .scale(baseScaleRef.current * zoomRef.current);
  }, []);

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

    const projection = makeProjection();
    const path = geoPath(projection, ctx);

    // sphere
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.fillStyle = '#04060c'; // ocean: near-black night
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,160,200,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (const f of COUNTRIES) {
      const a2 = alpha2Of(f);
      const d = a2 ? data[a2] : undefined;
      const unlocked = !!d && d.count >= MIN_AGGREGATE_PERSONS;
      ctx.beginPath();
      path(f);
      if (unlocked) {
        // earth at night: inhabited countries glow warm; brightness = support
        ctx.save();
        ctx.shadowColor = 'rgba(255,228,170,0.65)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(255,234,190,${(0.4 + d!.support * 0.5).toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      } else if (d && d.count > 0) {
        ctx.fillStyle = '#57503a'; // first embers — people have arrived
        ctx.fill();
      } else {
        ctx.fillStyle = '#23262d'; // uninhabited land: graphite, clearly above the ocean
        ctx.fill();
      }
      ctx.strokeStyle = selected && a2 && selected.a2 === a2 ? '#FFFFFF' : 'rgba(0,0,0,0.55)';
      ctx.lineWidth = selected && a2 && selected.a2 === a2 ? 1.6 : 0.6;
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
      // glide toward the zoom target — this is what makes zooming feel fluid
      const dz = zoomTargetRef.current - zoomRef.current;
      if (Math.abs(dz) > 0.001) zoomRef.current += dz * Math.min(1, dt * 12);
      ensureHiRes(zoomRef.current);
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draw, reducedMotion]);

  useEffect(() => { draw(); }, [draw]);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchDistRef.current = Math.hypot(a.x - b.x, a.y - b.y);
      draggingRef.current = null; // two fingers = zoom, not rotate
      autoSpinRef.current = false;
      return;
    }
    draggingRef.current = { x: e.clientX, y: e.clientY, moved: false };
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const pointers = pointersRef.current;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // pinch zoom
    if (pointers.size === 2 && pinchDistRef.current !== null) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTargetRef.current = Math.max(1, Math.min(12, zoomTargetRef.current * (dist / pinchDistRef.current)));
      pinchDistRef.current = dist;
      if (reducedMotion) { zoomRef.current = zoomTargetRef.current; ensureHiRes(zoomRef.current); draw(); }
      return;
    }

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
    const speed = 0.45 / zoomRef.current; // finer control when zoomed in
    const [l, p] = rotationRef.current;
    rotationRef.current = [l + dx * speed, Math.max(-80, Math.min(80, p - dy * speed))];
    if (reducedMotion) draw();
  }

  // native listener: React's synthetic wheel is passive, so the page would scroll while zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      autoSpinRef.current = false;
      zoomTargetRef.current = Math.max(1, Math.min(12, zoomTargetRef.current * (e.deltaY < 0 ? 1.15 : 0.87)));
      if (reducedMotion) { zoomRef.current = zoomTargetRef.current; draw(); }
    };
    canvas.addEventListener('wheel', onWheelNative, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheelNative);
  }, [draw, reducedMotion]);

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchDistRef.current = null;
    const drag = draggingRef.current;
    draggingRef.current = null;
    if (!drag || drag.moved) return;
    // tap: find the country under the finger
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;
    const coords = makeProjection().invert?.([x, y]);
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
        onPointerCancel={onPointerUp}
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                {Math.round(sel!.support * 100)}% <span style={{ fontWeight: 400, fontSize: '10px', color: 'var(--text-3)' }}>{supportLabel} · n={sel!.count}</span>
              </span>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                {sel?.count ?? 0} · {lockedLabel}
              </span>
            )}
          </div>
          {!selUnlocked && (
            <div style={{ height: '3px', background: 'var(--divider)', position: 'relative', marginTop: '10px' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, Math.round(((sel?.count ?? 0) / MIN_AGGREGATE_PERSONS) * 100))}%`, background: 'var(--accent)' }} />
            </div>
          )}

          {/* Zoom level 2: the country's regions — each with its OWN threshold.
              The ladder deliberately ends here (see privacy notes in regions.ts). */}
          {selected.a2 && regions?.[selected.a2] && regions[selected.a2].length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--divider)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {regions[selected.a2].map((r) => (
                <div key={r.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{r.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: r.unlocked ? 'var(--positive, #22c55e)' : 'var(--text-3)' }}>
                      {r.count}
                    </span>
                  </div>
                  <div style={{ height: '2px', background: 'var(--divider)', position: 'relative', marginTop: '4px' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, Math.round((r.count / MIN_AGGREGATE_PERSONS) * 100))}%`, background: r.unlocked ? 'var(--positive, #22c55e)' : 'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <span style={{ display: 'none' }}>{lang}</span>
    </div>
  );
}
