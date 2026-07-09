import { describe, it, expect } from 'vitest';
import { cosine, topK, MATCH_THRESHOLD } from '../understand';

describe('cosine', () => {
  it('is 1 for identical normalized vectors', () => {
    const v = [0.6, 0.8];
    expect(cosine(v, v)).toBeCloseTo(1);
  });
  it('is 0 for orthogonal vectors', () => {
    expect(cosine([1, 0], [0, 1])).toBe(0);
  });
  it('handles Float32Array input', () => {
    expect(cosine(new Float32Array([1, 0]), new Float32Array([1, 0]))).toBe(1);
  });
});

describe('topK', () => {
  const items = ['a', 'b', 'c', 'd'];

  it('returns the best k above the floor, best first', () => {
    const r = topK(items, [0.9, 0.95, 0.5, 0.85], 2, 0.8);
    expect(r.map((x) => x.item)).toEqual(['b', 'a']);
  });

  it('filters everything below the floor even if k is not reached', () => {
    const r = topK(items, [0.1, 0.2, 0.3, 0.4], 3, 0.8);
    expect(r).toEqual([]);
  });

  it('keeps item/score pairs aligned', () => {
    const r = topK(items, [0.1, 0.99, 0.1, 0.1], 3, 0.5);
    expect(r[0]).toEqual({ item: 'b', score: 0.99 });
  });
});

describe('threshold', () => {
  it('is a sane cosine floor', () => {
    expect(MATCH_THRESHOLD).toBeGreaterThan(0.5);
    expect(MATCH_THRESHOLD).toBeLessThan(1);
  });
});
