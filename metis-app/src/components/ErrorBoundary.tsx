"use client";
// ─── ErrorBoundary — cattura errori nei componenti figlio ─────────────────────
// Previene il crash dell'intera pagina se un pannello (CCII, EBA, CR) lancia.

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Testo opzionale mostrato nel fallback */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.label ?? 'component'} crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-red/30 bg-red/5 text-center">
          <svg className="w-5 h-5 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-[11px] text-red font-space font-semibold">
            {this.props.label ? `${this.props.label}: ` : ''}Errore nel rendering
          </p>
          <p className="text-[9px] text-text-muted leading-snug max-w-xs">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-1 text-[9px] text-cyan border border-cyan/30 px-3 py-1 rounded-full hover:bg-cyan/10 transition"
          >
            Riprova
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
