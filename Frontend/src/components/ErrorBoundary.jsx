import { Component } from 'react';
import { RefreshCw, Home } from 'lucide-react';

/**
 * Reusable React error boundary.
 *
 * Usage:
 *   <ErrorBoundary>          â† uses default fallback
 *   <ErrorBoundary onReset={...}>
 *   <ErrorBoundary fallback={(error, reset) => <MyUI />}>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  reset() {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(this.state.error, this.reset);
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '24px',
          padding: '40px 24px',
          fontFamily: 'var(--font-main, DM Sans, sans-serif)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'rgba(16, 185, 129,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ns-text)', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--ns-outline)', maxWidth: 360, lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected error occurred in this section.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={this.reset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 12,
              border: '1.5px solid var(--ns-border, #e2e8f0)',
              background: 'transparent',
              color: 'var(--ns-text)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            Try again
          </button>

          <button
            type="button"
            onClick={() => { window.location.href = '/dashboard'; }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 12,
              border: 'none',
              background: '#10B981',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129,0.3)',
            }}
          >
            <Home size={16} />
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
}
