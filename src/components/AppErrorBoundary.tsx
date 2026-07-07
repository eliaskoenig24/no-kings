'use client';

import { Component, type ReactNode } from 'react';

/**
 * Last line of defense: a rendering crash anywhere must never leave users
 * on a blank screen. Local-first means reloading is always safe.
 */
export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '16px' }}>
            no kings
          </p>
          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '24px' }}>
            Etwas ist schiefgelaufen. / Something went wrong.
            <br />
            Deine Daten sind lokal und sicher. / Your data is local and safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
              padding: '12px 28px', fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Neu laden / Reload
          </button>
        </div>
      </div>
    );
  }
}
