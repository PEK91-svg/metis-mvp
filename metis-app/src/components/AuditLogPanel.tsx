"use client";
import { useState } from 'react';
import { AuditEntry, AuditAction } from '@/lib/types';
import { AUDIT_ACTION_CONFIG } from '@/lib/auditTrail';

const ACTIVE_BADGE_CLASSES: Record<string, string> = {
  cyan:   'bg-cyan/20 text-cyan border-cyan/30',
  purple: 'bg-purple/20 text-purple border-purple/30',
  green:  'bg-green/20 text-green border-green/30',
  yellow: 'bg-yellow/20 text-yellow border-yellow/30',
  red:    'bg-red/20 text-red border-red/30',
};

const TEXT_COLOR_CLASSES: Record<string, string> = {
  cyan:   'text-cyan',
  purple: 'text-purple',
  green:  'text-green',
  yellow: 'text-yellow',
  red:    'text-red',
};

interface AuditLogPanelProps {
  entries: AuditEntry[];
  open: boolean;
  onClose: () => void;
}

export default function AuditLogPanel({ entries, open, onClose }: AuditLogPanelProps) {
  const [filter, setFilter] = useState<AuditAction | ''>('');

  if (!open) return null;

  const filtered = filter ? entries.filter(e => e.action === filter) : entries;
  const actions = Object.keys(AUDIT_ACTION_CONFIG) as AuditAction[];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-[700px] max-h-[80vh] flex flex-col border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_var(--color-cyan)] animate-pulse"></div>
            <span className="font-[var(--font-space)] text-sm uppercase tracking-wider text-cyan font-semibold">Audit Trail</span>
            <span className="text-[10px] text-text-muted">({entries.length} eventi)</span>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white text-sm transition p-1 rounded hover:bg-white/5">✕</button>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2 border-b border-white/5 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-2 py-0.5 rounded text-[10px] transition ${!filter ? 'bg-cyan/20 text-cyan border border-cyan/30' : 'text-text-muted hover:text-white border border-transparent'}`}
          >
            Tutti
          </button>
          {actions.map(a => {
            const cfg = AUDIT_ACTION_CONFIG[a];
            return (
              <button
                key={a}
                onClick={() => setFilter(filter === a ? '' : a)}
                className={`px-2 py-0.5 rounded text-[10px] transition border ${filter === a ? ACTIVE_BADGE_CLASSES[cfg.color] : 'text-text-muted hover:text-white border-transparent'}`}
              >
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8">Nessun evento registrato.</div>
          ) : filtered.map(entry => {
            const cfg = AUDIT_ACTION_CONFIG[entry.action];
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div key={entry.id} className="flex items-start gap-3 bg-black/20 border border-white/5 rounded-lg p-3 hover:border-white/10 transition">
                <span className="text-base mt-0.5">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold ${TEXT_COLOR_CLASSES[cfg.color]}`}>{cfg.label}</span>
                    {entry.dossierId && (
                      <span className="text-[9px] text-text-muted font-mono bg-black/30 px-1.5 py-0.5 rounded">{entry.dossierId}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">{entry.details}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] text-text-muted">{timeStr}</span>
                    <span className="text-[9px] text-text-muted">Operatore: {entry.operator}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
