'use client';
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error) { console.error('ErrorBoundary caught:', error); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="text-center">
            <p className="mb-2 text-[14px] text-red-300">Something went wrong</p>
            <p className="mb-4 text-[12px] text-[#fff6]">{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false })} className="rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[12px] text-[#fff9] hover:text-white">
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
