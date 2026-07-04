import React from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo });
    console.error("VexBill ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', width: '100vw', backgroundColor: '#f9fafb', color: '#111827', fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px', backgroundColor: 'white', padding: '40px', borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', textAlign: 'center'
          }}>
            <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '24px' }} />
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Something went wrong.</h1>
            <p style={{ color: '#4b5563', marginBottom: '32px' }}>
              We&apos;re sorry, but an unexpected error occurred. Our team has been notified.
            </p>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px',
                  cursor: 'pointer', fontWeight: '500'
                }}
              >
                <RefreshCw size={18} /> Reload Page
              </button>
              
              <button 
                onClick={() => window.location.href = '/dashboard'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px',
                  cursor: 'pointer', fontWeight: '500'
                }}
              >
                <Home size={18} /> Dashboard
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{ marginTop: '32px', textAlign: 'left', backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', overflowX: 'auto' }}>
                <p style={{ fontWeight: 'bold', color: '#991b1b', marginBottom: '8px' }}>{this.state.error.toString()}</p>
                <pre style={{ fontSize: '12px', color: '#b91c1c' }}>{this.state.errorInfo?.componentStack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
