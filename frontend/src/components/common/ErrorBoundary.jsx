import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Catches render-time errors that React would otherwise swallow into a blank
 * screen, reporting them to the console and showing a recoverable fallback.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Unhandled rendering error:', error, errorInfo?.componentStack);
  }

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div style={{ padding: '2.5rem', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <AlertTriangle size={32} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: '#991b1b' }}>Something went wrong</h3>
        <p style={{ color: '#b91c1c', marginTop: '0.5rem' }}>{error.message}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1.25rem' }}
          onClick={() => this.setState({ error: null })}
        >
          Try again
        </button>
      </div>
    );
  }
}
