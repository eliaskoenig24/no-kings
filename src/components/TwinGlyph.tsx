'use client';

/**
 * The twin as a living light — not a chart.
 *
 * A smooth organic form whose silhouette is shaped by the 8 dimension
 * values. It breathes gently and MORPHS when a value changes, so every
 * answered question visibly reshapes the light. On /world every person
 * is a point of light; here, yours is large and alive. Same story.
 *
 * Deliberately unlabeled: the words live below ("what your twin stands
 * for") — the glyph is identity, not analysis.
 */

import { useEffect, useMemo, useRef } from 'react';
import { TOPICS, type TopicKey } from '@/types';

export default function TwinGlyph({
  values,
  size = 200,
}: {
  values: Record<TopicKey, number>; // 0..1 per dimension
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRef = useRef<number[] | null>(null);
  const targetRef = useRef<number[]>([]);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // 0..1 values → radii; even a centrist twin has real body
  const target = useMemo(() => TOPICS.map((k) => 0.42 + 0.52 * (values[k] ?? 0.5)), [values]);
  useEffect(() => { targetRef.current = target; }, [target]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    if (!currentRef.current || currentRef.current.length !== targetRef.current.length) {
      currentRef.current = [...targetRef.current];
    }

    let raf = 0;
    let last = performance.now();

    const draw = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const cur = currentRef.current!;
      const tgt = targetRef.current;
      // morph toward the target — answering a question visibly reshapes the light
      for (let i = 0; i < cur.length; i++) cur[i] += (tgt[i] - cur[i]) * Math.min(1, dt * 5);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const R = size * 0.34;
      const breathe = reducedMotion ? 0 : 0.016 * Math.sin(t / 1400);

      const n = cur.length;
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const wobble = reducedMotion ? 0 : 0.012 * Math.sin(t / 900 + i * 1.7);
        const r = R * (cur[i] + breathe + wobble);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }

      // smooth closed curve through midpoints — organic, never polygonal
      ctx.beginPath();
      const mid = (a: [number, number], b: [number, number]): [number, number] =>
        [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const m = mid(pts[n - 1], pts[0]);
      ctx.moveTo(m[0], m[1]);
      for (let i = 0; i < n; i++) {
        const next = mid(pts[i], pts[(i + 1) % n]);
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], next[0], next[1]);
      }
      ctx.closePath();

      // warm living light: bright core, amber edge, soft halo
      const g = ctx.createRadialGradient(cx, cy - R * 0.15, R * 0.1, cx, cy, R * 1.05);
      g.addColorStop(0, 'rgba(255,244,214,0.98)');
      g.addColorStop(0.55, 'rgba(233,192,122,0.92)');
      g.addColorStop(1, 'rgba(150,98,27,0.88)');
      ctx.save();
      ctx.shadowColor = 'rgba(180,124,40,0.45)';
      ctx.shadowBlur = size * 0.13;
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(150,98,27,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    if (reducedMotion) {
      // one settled frame, no loop
      currentRef.current = [...targetRef.current];
    }
    return () => cancelAnimationFrame(raf);
  }, [size, reducedMotion, values]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
      role="img"
      aria-hidden="true"
    />
  );
}
