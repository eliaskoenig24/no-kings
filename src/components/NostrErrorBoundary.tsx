'use client';

import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class NostrErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          border: '1px solid var(--border)',
          padding: '32px 24px',
          background: 'var(--surface)',
          textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px' }}>
            NETWORK ERROR
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '16px' }}>
            Could not connect to the Nostr network.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              padding: '8px 20px',
              fontSize: '12px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
