import { Component } from 'react';

/**
 * Catches render-time exceptions so one broken screen can never blank the
 * whole app. Two levels are used:
 *   • a top-level boundary in main.jsx (catastrophic — offers a reload)
 *   • a per-route boundary inside AppShell (keeps the sidebar/topbar usable)
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // surface it for the console / dev tools; never swallow silently
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.variant === 'app') {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'var(--paper)',
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 21, marginBottom: 6 }}>
              LifeTrack
            </div>
            <div className="alert" role="alert">
              <svg className="a-icon" viewBox="0 0 20 20" fill="none" stroke="var(--brick)" strokeWidth="1.6" aria-hidden="true">
                <circle cx="10" cy="10" r="8" />
                <path d="M10 6v5M10 14h.01" />
              </svg>
              <div style={{ flex: 1 }}>
                <div className="a-title">Something went wrong loading this view.</div>
                <div className="a-body" style={{ marginTop: 4 }}>{String(this.state.error?.message || this.state.error)}</div>
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
                    Reload the app
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // per-route: keep the shell chrome, show a recoverable error in the content area
    return (
      <div className="alert" role="alert">
        <svg className="a-icon" viewBox="0 0 20 20" fill="none" stroke="var(--brick)" strokeWidth="1.6" aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 6v5M10 14h.01" />
        </svg>
        <div style={{ flex: 1 }}>
          <div className="a-title">This screen hit an error and couldn't finish loading.</div>
          <div className="a-body" style={{ marginTop: 4 }}>{String(this.state.error?.message || this.state.error)}</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={this.reset}>
              Try again
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
