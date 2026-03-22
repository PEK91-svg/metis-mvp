// ─── Shared Company Config ─────────────────────────────────────────────────
// Unica fonte di verità per Status e RiskLevel — usato da home/page.tsx,
// pratica/page.tsx e qualsiasi altro componente che mostri pratiche.

export type Status = 'APPROVATA' | 'IN ANALISI' | 'DA REVISIONARE' | 'SOSPESA' | 'RIFIUTATA';
export type RiskLevel = 'BASSO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface StatusStyle {
  color: string;
  icon: string;
  border: string;
  bg: string;
  text: string;
}

export interface RiskStyle {
  border: string;
  bg: string;
  text: string;
}

export const STATUS_CONFIG: Record<Status, StatusStyle> = {
  'APPROVATA':       { color: 'green',  icon: '✓', border: 'border-green/50',  bg: 'bg-green/10',  text: 'text-green' },
  'IN ANALISI':      { color: 'cyan',   icon: '◎', border: 'border-cyan/50',   bg: 'bg-cyan/10',   text: 'text-cyan' },
  'DA REVISIONARE':  { color: 'yellow', icon: '⚠', border: 'border-yellow/50', bg: 'bg-yellow/10', text: 'text-yellow' },
  'SOSPESA':         { color: 'purple', icon: '⏸', border: 'border-purple/50', bg: 'bg-purple/10', text: 'text-purple' },
  'RIFIUTATA':       { color: 'red',    icon: '✕', border: 'border-red/50',    bg: 'bg-red/10',    text: 'text-red' },
};

export const RISK_CONFIG: Record<RiskLevel, RiskStyle> = {
  'BASSO':   { border: 'border-green/50',  bg: 'bg-green/10',  text: 'text-green' },
  'MEDIO':   { border: 'border-yellow/50', bg: 'bg-yellow/10', text: 'text-yellow' },
  'ALTO':    { border: 'border-red/40',    bg: 'bg-red/10',    text: 'text-red' },
  'CRITICO': { border: 'border-red/70',    bg: 'bg-red/20',    text: 'text-red' },
};
