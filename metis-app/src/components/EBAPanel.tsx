"use client";
// ─── EBA Panel — EBA/GL/2020/06 Loan Origination & Monitoring ─────────────────
// Panel UI per la checklist di conformità EBA raggruppata per sezione.

import { useState } from "react";
import { EBAResult, EBACheckItem, EBAStatus } from "@/lib/ebaCompliance";

interface EBAPanelProps {
  result: EBAResult;
}

const SECTION_LABELS: Record<string, { label: string; icon: string }> = {
  GOV: { label: 'Governance e cultura del rischio',      icon: '§ 4' },
  CRW: { label: 'Valutazione merito creditizio',          icon: '§ 5' },
  PRI: { label: 'Pricing e garanzie',                     icon: '§ 6' },
  MON: { label: 'Monitoraggio continuativo',              icon: '§ 8' },
};

function statusConfig(s: EBAStatus) {
  switch (s) {
    case 'CONFORME':
      return { color: 'text-green',  bg: 'bg-green/10',  border: 'border-green/30',  dot: 'bg-green',  label: 'CONFORME' };
    case 'PARZIALMENTE CONFORME':
      return { color: 'text-yellow', bg: 'bg-yellow/10', border: 'border-yellow/30', dot: 'bg-yellow', label: 'PARZ. CONFORME' };
    case 'NON CONFORME':
      return { color: 'text-red',    bg: 'bg-red/10',    border: 'border-red/30',    dot: 'bg-red animate-pulse', label: 'NON CONFORME' };
    default:
      return { color: 'text-text-muted', bg: 'bg-white/5', border: 'border-glass-border', dot: 'bg-white/20', label: 'DA VERIFICARE' };
  }
}

function overallConfig(s: EBAResult['overallStatus']) {
  switch (s) {
    case 'CONFORME':              return { color: 'text-green',  bg: 'bg-green/10',  border: 'border-green/40'  };
    case 'PARZIALMENTE CONFORME': return { color: 'text-yellow', bg: 'bg-yellow/10', border: 'border-yellow/40' };
    case 'NON CONFORME':          return { color: 'text-red',    bg: 'bg-red/10',    border: 'border-red/40'    };
  }
}

function EBAItemRow({ item }: { item: EBACheckItem }) {
  const [open, setOpen] = useState(false);
  const cfg = statusConfig(item.status);

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${open ? cfg.border : 'border-glass-border'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left"
      >
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}></div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-white font-medium truncate">{item.titolo}</div>
          <div className="text-[9px] text-text-muted mt-0.5">{item.paragrafo}</div>
        </div>
        <span className={`text-[8px] px-1.5 py-0.5 rounded border font-space font-semibold shrink-0 whitespace-nowrap ${cfg.color} ${cfg.bg} ${cfg.border}`}>
          {cfg.label}
        </span>
        <svg className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={`px-4 pb-3 pt-2 border-t border-glass-border animate-[fadeUp_0.15s_ease-out_forwards] ${cfg.bg}`}>
          <p className="text-[10px] text-text-main leading-relaxed mb-2">{item.dettaglio}</p>
          <div className="text-[9px] text-text-muted border-l border-glass-border pl-2 italic">
            Evidenza: {item.evidenza}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreArc({ score }: { score: number }) {
  // Simple arc-like progress display
  const color = score >= 75 ? 'text-green' : score >= 50 ? 'text-yellow' : 'text-red';
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`font-space text-3xl font-bold ${color}`}>{score}</div>
      <div className="text-[9px] text-text-muted uppercase tracking-wider">/ 100</div>
      <div className="text-[8px] text-text-muted mt-0.5">EBA Score</div>
    </div>
  );
}

export default function EBAPanel({ result }: EBAPanelProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const overall = overallConfig(result.overallStatus);

  const sections = Object.keys(SECTION_LABELS);
  const itemsBySection = (sec: string) => result.items.filter(i => i.id.includes(`-${sec}-`));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`flex items-center justify-between p-3 rounded-xl border ${overall.border} ${overall.bg}`}>
        <div className="flex-1">
          <div className="font-space text-[10px] text-text-muted uppercase tracking-widest mb-0.5">EBA/GL/2020/06</div>
          <div className={`font-space text-sm font-bold ${overall.color} tracking-wider`}>{result.overallStatus}</div>
          <div className="text-[9px] text-text-muted mt-1 leading-snug">{result.sommario}</div>
        </div>
        <div className="ml-4 shrink-0">
          <ScoreArc score={result.score} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Conformi',    value: result.conformiCount,           color: 'text-green'  },
          { label: 'Parz.',       value: result.parzialmenteConformiCount, color: 'text-yellow' },
          { label: 'Non Conf.',   value: result.nonConformiCount,         color: 'text-red'    },
          { label: 'Da Verif.',   value: result.daVerificareCount,        color: 'text-text-muted' },
        ].map(s => (
          <div key={s.label} className="text-center bg-black/20 border border-glass-border rounded-lg py-2">
            <div className={`font-space text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[8px] text-text-muted uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-black/30 p-0.5 rounded-lg">
        {sections.map(sec => (
          <button
            key={sec}
            onClick={() => setActiveSection(activeSection === sec ? null : sec)}
            className={`flex-1 py-1.5 rounded text-[9px] font-space font-semibold tracking-wider transition ${
              activeSection === sec ? 'bg-cyan/20 text-cyan' : 'text-text-muted hover:text-white'
            }`}
          >
            {SECTION_LABELS[sec].icon}
          </button>
        ))}
      </div>

      {/* Section label */}
      {activeSection && (
        <div className="text-[10px] text-text-muted px-1 -mt-1">
          {SECTION_LABELS[activeSection].label}
        </div>
      )}

      {/* Items — show active section or all */}
      <div className="space-y-1.5">
        {(activeSection ? itemsBySection(activeSection) : result.items).map(item => (
          <EBAItemRow key={item.id} item={item} />
        ))}
      </div>

      {/* Footer */}
      <div className="text-[9px] text-text-muted border-t border-glass-border pt-2 leading-relaxed">
        Checklist basata su EBA/GL/2020/06 &quot;Guidelines on loan origination and monitoring&quot;,
        applicabili dal 30 giugno 2021 per tutti gli enti creditizi UE.
      </div>
    </div>
  );
}
