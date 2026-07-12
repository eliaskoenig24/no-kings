'use client';

import { TX } from './page.tx';
import Link from 'next/link';
import { makeTx } from '@/lib/tx';
import { useLang } from '@/context/LangContext';

const tx = makeTx(TX);

/**
 * The front door: why this exists, how it works, why to trust it.
 * Three pages total — this one explains, /twin creates, /world analyzes.
 */
export default function ExplainPage() {
  const { lang } = useLang();

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 96px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* The thesis */}
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '22px' }}>
          no kings
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.4rem)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '22px', maxWidth: '16ch' }}>
          {tx(lang, 'hero_title')}
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.75, color: 'var(--text-2)', maxWidth: '580px', marginBottom: '18px' }}>
          {tx(lang, 'hero_body')}
        </p>
        {/* the honest whistleblower promise — no "only censorship-free place
            on the net" overclaims; the second half is verifiably true */}
        <p style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontStyle: 'italic', fontSize: '17px', lineHeight: 1.6, color: 'var(--text-1)', maxWidth: '540px', marginBottom: '36px' }}>
          {tx(lang, 'hero_whistle')}
        </p>
        <Link href="/twin" style={{
          display: 'inline-block',
          background: 'var(--text-1)', color: 'var(--bg)',
          padding: '16px 34px', fontSize: '13px', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          textDecoration: 'none',
        }}>
          {tx(lang, 'cta')}
        </Link>

        {/* The three steps — a real sequence, so numbering carries meaning */}
        <div style={{ margin: '80px 0 72px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {([['1', 's1_t', 's1_b'], ['2', 's2_t', 's2_b'], ['3', 's3_t', 's3_b']] as const).map(([n, t, b]) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: '18px', alignItems: 'start' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'var(--accent)',
                borderTop: '1px solid var(--accent)', paddingTop: '10px', lineHeight: 1,
              }}>
                {n}
              </span>
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>
                  {tx(lang, t)}
                </p>
                <p style={{ fontSize: '14px', lineHeight: 1.75, color: 'var(--text-2)', maxWidth: '520px' }}>
                  {tx(lang, b)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Why to trust it */}
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '48px', marginBottom: '64px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '28px' }}>
            {tx(lang, 'why_t')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(['p1', 'p2', 'p3', 'p4'] as const).map((k) => (
              <p key={k} style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-2)', paddingLeft: '18px', borderLeft: '2px solid var(--accent)', maxWidth: '540px' }}>
                {tx(lang, k)}
              </p>
            ))}
          </div>
        </div>

        {/* Two doors */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <Link href="/twin" style={{
            display: 'inline-block',
            background: 'var(--text-1)', color: 'var(--bg)',
            padding: '16px 34px', fontSize: '13px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}>
            {tx(lang, 'cta')}
          </Link>
          <Link href="/world" style={{
            display: 'inline-block',
            background: 'none', color: 'var(--text-1)',
            border: '1px solid var(--text-1)',
            padding: '15px 30px', fontSize: '13px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}>
            {tx(lang, 'cta_world')}
          </Link>
        </div>

      </div>
    </div>
  );
}
