"use client";
// ─── CCII Panel — Codice della Crisi d'Impresa (D.Lgs. 14/2019) ───────────────
// Panel UI per la visualizzazione degli indicatori CCII con semaforo normativo.

import { useState } from "react";
import { CCIIResult, CCIIIndicator } from "@/lib/cciiCompliance";
import { getCCIIStatusStyle } from "@/lib/statusConfig";

interface CCIIPanelProps {
  result: CCIIResult;
}

function overallConfig(s: CCIIResult['overallStatus']) {
  switch (s) {
    case 'REGOLARE':        return { color: 'text-green',  bg: 'bg-green/10',  border: 'border-green/40'  };
    case 'ATTENZIONE':      return { color: 'text-yellow', bg: 'bg-yellow/10', border: 'border-yellow/40' };
    case 'CRISI PROBABILE': return { color: 'text-red',    bg: 'bg-red/10',    border: 'border-red/40'    };
  }
}

function IndicatorRow({ ind }: { ind: CCIIIndicator }) {
  const [open, setOpen] = useState(false);
  const cfg = getCCIIStatusStyle(ind.status);

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${open ? cfg.border : 'border-glass-border'}`}>
      {/* Collapsed row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left group"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-space text-[11px] font-semibold text-white tracking-wide">{ind.nome}</span>
            {ind.valore !== null && (
              <span className={`font-space text-[10px] font-bold ${cfg.color}`}>
                {ind.valore}{ind.unita}
                {ind.soglia !== null && (
                  <span className="text-text-muted font-normal ml-1">/ soglia {ind.soglia}{ind.unita}</span>
                )}
              </span>
            )}
          </div>
          <div className="text-[9px] text-text-muted truncate mt-0.5">{ind.articolo}</div>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded border font-space font-semibold shrink-0 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
          {cfg.label}
        </span>
        <svg className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className={`px-4 pb-4 pt-2 border-t border-glass-border animate-[fadeUp_0.15s_ease-out_forwards] ${cfg.bg}`}>
          <p className="text-[11px] text-text-main leading-relaxed mb-2">{ind.dettaglio}</p>
          <div className="flex flex-wrap gap-3 mt-2">
            <div className="text-[9px] text-text-muted">
              <span className="text-cyan/70 uppercase tracking-wider">Rif. normativo</span><br />
              <span className="text-white/70">{ind.riferimento}</span>
            </div>
            <div className="text-[9px] text-text-muted">
              <span className="text-cyan/70 uppercase tracking-wider">Fonte dato</span><br />
              <span className="text-white/70">{ind.fonte}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CCIIPanel({ result }: CCIIPanelProps) {
  const overall = overallConfig(result.overallStatus);

  return (
    <div className="space-y-3">
      {/* Overall status header */}
      <div className={`flex items-center justify-between p-3 rounded-xl border ${overall.border} ${overall.bg}`}>
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-space text-[10px] text-text-muted uppercase tracking-widest">D.Lgs. 14/2019 — CCII</span>
            <span className={`font-space text-sm font-bold ${overall.color} tracking-wider`}>{result.overallStatus}</span>
          </div>
        </div>
        <div className="flex gap-3 text-center">
          <div>
            <div className="font-space text-lg font-bold text-green">{result.passCount}</div>
            <div className="text-[9px] text-text-muted uppercase">Pass</div>
          </div>
          <div>
            <div className="font-space text-lg font-bold text-yellow">{result.warningCount}</div>
            <div className="text-[9px] text-text-muted uppercase">Attenzione</div>
          </div>
          <div>
            <div className={`font-space text-lg font-bold ${result.alertCount > 0 ? 'text-red' : 'text-text-muted'}`}>{result.alertCount}</div>
            <div className="text-[9px] text-text-muted uppercase">Allerta</div>
          </div>
        </div>
      </div>

      {/* Segnali pre-crisi badge */}
      {result.hasSegnaliPrecrisi && (
        <div className="flex items-center gap-2 bg-red/5 border border-red/20 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5 text-red shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-[10px] text-red leading-snug">{result.note}</span>
        </div>
      )}
      {!result.hasSegnaliPrecrisi && (
        <div className="flex items-center gap-2 bg-green/5 border border-green/20 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5 text-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] text-green leading-snug">{result.note}</span>
        </div>
      )}

      {/* Indicator list */}
      <div className="space-y-2">
        {result.indicators.map(ind => (
          <IndicatorRow key={ind.id} ind={ind} />
        ))}
      </div>

      {/* Footer note */}
      <div className="text-[9px] text-text-muted border-t border-glass-border pt-2 leading-relaxed">
        Analisi automatizzata ai sensi D.Lgs. 14/2019 e Principi CNDCEC (2022).
        Non sostituisce la valutazione professionale dell&apos;organo amministrativo e di controllo.
      </div>
    </div>
  );
}
