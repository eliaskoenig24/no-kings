import { describe, it, expect } from 'vitest';
import { makeTx } from '@/lib/tx';

describe('makeTx', () => {
  const tx = makeTx({
    hello: { de: 'Hallo', en: 'Hello' },
    partial: { en: 'Only English' },
  });

  it('resolves the requested language', () => {
    expect(tx('de', 'hello')).toBe('Hallo');
  });

  it('falls back to English', () => {
    expect(tx('fr', 'hello')).toBe('Hello');
    expect(tx('de', 'partial')).toBe('Only English');
  });

  it('falls back to the key itself as last resort', () => {
    const empty = makeTx({ broken: {} as Record<string, string> });
    expect(empty('de', 'broken')).toBe('broken');
  });
});
