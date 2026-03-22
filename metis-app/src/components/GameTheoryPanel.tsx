"use client";
// ─── Metis MVP — Game Theory Panel ────────────────────────────────────────────
// Visualizzazione interattiva della matrice di payoff Stackelberg e Nash Equilibrium.

import { useMemo, useState } from "react";
import type { ParsedBilancio, RiskModelResults } from "@/lib/types";
import {
  getOptimalStrategy,
  type BankStrategy,
  type DebtorStrategy,
  type CellPayoff,
  type OptimalStrategyResult,
  type SensitivityPoint,
  BANK_STRATEGIES,
  DEBTOR_STRATEGIES,
} from "@/lib/gameTheory";

// ── Props ────────────────────────────────────────────────────────────────────

interface GameTheoryPanelProps {
  bilancioData: ParsedBilancio;
  modelsData: RiskModelResults;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const BANK_LABELS: Record<BankStrategy, string> = {
  CONSERVATIVE: "Conservativa",
  BALANCED: "Bilanciata",
  AGGRESSIVE: "Aggressiva",
};

const DEBTOR_LABELS: Record<DebtorStrategy, string> = {
  ACCEPT_ALL: "Accetta Tutto",
  NEGOTIATE: "Negozia",
  WALK_AWAY: "Rifiuta",
};

const BANK_COLORS: Record<BankStrategy, { badge: string; text: string }> = {
  CONSERVATIVE: { badge: "bg-yellow/20 text-yellow border-yellow/40", text: "text-yellow" },
  BALANCED:     { badge: "bg-green/20 text-green border-green/40",    text: "text-green"  },
  AGGRESSIVE:   { badge: "bg-red/20 text-red border-red/40",          text: "text-red"    },
};

const DEBTOR_COLORS: Record<DebtorStrategy, { badge: string; text: string }> = {
  ACCEPT_ALL: { badge: "bg-green/20 text-green border-green/40",  text: "text-green"  },
  NEGOTIATE:  { badge: "bg-yellow/20 text-yellow border-yellow/40", text: "text-yellow" },
  WALK_AWAY:  { badge: "bg-red/20 text-red border-red/40",          text: "text-red"    },
};

function formatEuro(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toLocaleString("it-IT")}`;
}

const IMPORTO_OPTIONS = [500_000, 1_000_000, 2_000_000, 5_000_000];

// ── Componente Cella Matrice ─────────────────────────────────────────────────

function MatrixCell({
  cell,
  isNash,
}: {
  cell: CellPayoff;
  isNash: boolean;
}) {
  const baseClasses = "relative p-2.5 rounded-lg border transition-all";
  const nashClasses = isNash
    ? "border-cyan bg-cyan/10 shadow-[0_0_12px_rgba(0,255,255,0.15)]"
    : cell.dealHappens
      ? "border-glass-border bg-black/20 hover:bg-white/5"
      : "border-glass-border bg-black/40 opacity-50";

  return (
    <div className={`${baseClasses} ${nashClasses}`}>
      {isNash && (
        <div className="absolute -top-2 -right-2 bg-cyan text-black text-[7px] font-space font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
          Nash
        </div>
      )}

      {cell.dealHappens ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-text-muted uppercase tracking-wider">Banca</span>
            <span className={`font-space text-[11px] font-bold ${cell.bankPayoff >= 0 ? "text-green" : "text-red"}`}>
              {formatEuro(cell.bankPayoff)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-text-muted uppercase tracking-wider">Debitore</span>
            <span className={`font-space text-[11px] font-bold ${cell.debtorPayoff >= 0 ? "text-cyan" : "text-red"}`}>
              {formatEuro(cell.debtorPayoff)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full min-h-[36px]">
          <span className="text-[9px] text-text-muted italic">No deal</span>
        </div>
      )}
    </div>
  );
}

// ── Badge Strategia ──────────────────────────────────────────────────────────

function StrategyBadge({
  label,
  colorClasses,
}: {
  label: string;
  colorClasses: string;
}) {
  return (
    <span className={`inline-block text-[8px] font-space font-semibold px-2 py-0.5 rounded border ${colorClasses}`}>
      {label}
    </span>
  );
}

// ── Sezione Sensitività ──────────────────────────────────────────────────────

function SensitivitySection({ points }: { points: SensitivityPoint[] }) {
  return (
    <div className="space-y-2">
      <div className="font-space text-[10px] text-text-muted uppercase tracking-widest">
        Analisi Sensitività — Variazione PD
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {points.map((pt) => {
          const isBase = pt.pdDelta === 0;
          return (
            <div
              key={pt.pdDelta}
              className={`text-center p-2 rounded-lg border transition-all ${
                isBase
                  ? "border-cyan/40 bg-cyan/5"
                  : "border-glass-border bg-black/20"
              }`}
            >
              <div className={`font-space text-[10px] font-bold ${isBase ? "text-cyan" : "text-text-muted"}`}>
                {pt.pdDelta > 0 ? "+" : ""}
                {(pt.pdDelta * 100).toFixed(0)}%
              </div>
              <div className="text-[8px] text-text-muted mt-0.5">
                PD {(pt.pdEffective * 100).toFixed(2)}%
              </div>
              <div className="mt-1">
                <StrategyBadge
                  label={BANK_LABELS[pt.equilibrium.bankStrategy]}
                  colorClasses={BANK_COLORS[pt.equilibrium.bankStrategy].badge}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente Principale ────────────────────────────────────────────────────

export default function GameTheoryPanel({ bilancioData, modelsData }: GameTheoryPanelProps) {
  const [importo, setImporto] = useState<number>(1_000_000);

  const result: OptimalStrategyResult = useMemo(
    () => getOptimalStrategy(bilancioData, modelsData, importo),
    [bilancioData, modelsData, importo],
  );

  const { matrix, nashEquilibrium, recommendation, sensitivity, riskAssessment } = result;

  const riskColors: Record<string, string> = {
    BASSO: "text-green",
    MEDIO: "text-yellow",
    ALTO: "text-red",
  };

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple/20 border border-purple/40 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-space text-sm font-bold text-white tracking-wide">
            Teoria dei Giochi — Ottimizzazione Condizioni
          </h3>
          <p className="text-[9px] text-text-muted mt-0.5">
            Modello Stackelberg Banca-Debitore · Equilibrio di Nash
          </p>
        </div>
        <div className={`font-space text-[10px] font-bold px-2 py-1 rounded border ${
          riskAssessment === 'BASSO' ? 'bg-green/10 text-green border-green/40' :
          riskAssessment === 'MEDIO' ? 'bg-yellow/10 text-yellow border-yellow/40' :
          'bg-red/10 text-red border-red/40'
        }`}>
          RISCHIO {riskAssessment}
        </div>
      </div>

      {/* ── Selettore Importo ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-text-muted uppercase tracking-wider shrink-0">Importo:</span>
        <div className="flex gap-1 flex-wrap">
          {IMPORTO_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setImporto(opt)}
              className={`px-2.5 py-1 rounded text-[9px] font-space font-semibold tracking-wider transition ${
                importo === opt
                  ? "bg-cyan/20 text-cyan border border-cyan/40"
                  : "bg-black/30 text-text-muted border border-glass-border hover:text-white"
              }`}
            >
              {formatEuro(opt)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Matrice 3x3 ──────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* Header row: debtor strategies */}
          <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-1.5 mb-1.5">
            <div className="p-2 flex items-end justify-center">
              <span className="text-[8px] text-text-muted italic">Banca ↓ / Debitore →</span>
            </div>
            {matrix.debtorStrategies.map((ds) => (
              <div key={ds} className="p-2 text-center">
                <StrategyBadge
                  label={DEBTOR_LABELS[ds]}
                  colorClasses={DEBTOR_COLORS[ds].badge}
                />
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {matrix.bankStrategies.map((bs, bIdx) => (
            <div key={bs} className="grid grid-cols-[100px_1fr_1fr_1fr] gap-1.5 mb-1.5">
              {/* Row header */}
              <div className="flex items-center justify-center p-2">
                <StrategyBadge
                  label={BANK_LABELS[bs]}
                  colorClasses={BANK_COLORS[bs].badge}
                />
              </div>
              {/* Cells */}
              {matrix.debtorStrategies.map((ds, dIdx) => {
                const cell = matrix.cells[bIdx][dIdx];
                const isNash =
                  nashEquilibrium.bankStrategy === bs &&
                  nashEquilibrium.debtorStrategy === ds;
                return <MatrixCell key={ds} cell={cell} isNash={isNash} />;
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Parametri matrice ─────────────────────────────────────────────── */}
      <div className="flex gap-3 text-[8px] text-text-muted">
        <span>PD: <span className={`font-space font-bold ${riskColors[riskAssessment]}`}>{(matrix.pdBase * 100).toFixed(2)}%</span></span>
        <span>LGD base: <span className="font-space font-bold text-white">{(matrix.lgd * 100).toFixed(0)}%</span></span>
        <span>Importo: <span className="font-space font-bold text-white">{formatEuro(matrix.importo)}</span></span>
      </div>

      {/* ── Box Strategia Ottimale ────────────────────────────────────────── */}
      <div className="p-3 rounded-xl border border-cyan/30 bg-cyan/5">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-cyan shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-space text-[10px] text-cyan uppercase tracking-widest font-bold">
            Strategia Ottimale
          </span>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-text-muted">Banca:</span>
            <StrategyBadge
              label={BANK_LABELS[nashEquilibrium.bankStrategy]}
              colorClasses={BANK_COLORS[nashEquilibrium.bankStrategy].badge}
            />
          </div>
          <div className="text-[10px] text-text-muted">×</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-text-muted">Debitore:</span>
            <StrategyBadge
              label={DEBTOR_LABELS[nashEquilibrium.debtorStrategy]}
              colorClasses={DEBTOR_COLORS[nashEquilibrium.debtorStrategy].badge}
            />
          </div>
        </div>

        <div className="flex gap-4 mb-2">
          <div>
            <span className="text-[8px] text-text-muted">Payoff Banca</span>
            <div className={`font-space text-sm font-bold ${nashEquilibrium.bankPayoff >= 0 ? "text-green" : "text-red"}`}>
              {formatEuro(nashEquilibrium.bankPayoff)}
            </div>
          </div>
          <div>
            <span className="text-[8px] text-text-muted">Payoff Debitore</span>
            <div className={`font-space text-sm font-bold ${nashEquilibrium.debtorPayoff >= 0 ? "text-cyan" : "text-red"}`}>
              {formatEuro(nashEquilibrium.debtorPayoff)}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-text-main leading-relaxed">{recommendation}</p>
      </div>

      {/* ── Dettagli Strategie ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <div className="text-[9px] text-text-muted uppercase tracking-wider font-space font-semibold">Strategie Banca</div>
          {matrix.bankStrategies.map((bs) => {
            const params = BANK_STRATEGIES[bs];
            return (
              <div key={bs} className="p-2 rounded-lg border border-glass-border bg-black/20 space-y-0.5">
                <StrategyBadge label={BANK_LABELS[bs]} colorClasses={BANK_COLORS[bs].badge} />
                <div className="text-[9px] text-text-muted mt-1">
                  Spread +{params.spreadBp}bp · LTV {(params.ltvMax * 100).toFixed(0)}% · Garanzie {params.garanzieRichieste.toLowerCase()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-1.5">
          <div className="text-[9px] text-text-muted uppercase tracking-wider font-space font-semibold">Strategie Debitore</div>
          {matrix.debtorStrategies.map((ds) => {
            const params = DEBTOR_STRATEGIES[ds];
            return (
              <div key={ds} className="p-2 rounded-lg border border-glass-border bg-black/20 space-y-0.5">
                <StrategyBadge label={DEBTOR_LABELS[ds]} colorClasses={DEBTOR_COLORS[ds].badge} />
                <div className="text-[9px] text-text-muted mt-1">{params.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Sensitività ───────────────────────────────────────────────────── */}
      <SensitivitySection points={sensitivity} />

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="text-[9px] text-text-muted border-t border-glass-border pt-2 leading-relaxed">
        Modello Stackelberg a informazione completa. Equilibrio di Nash calcolato su strategie pure (3×3).
        La PD è stimata come media ponderata dei modelli Altman Z-Score, Ohlson O-Score e Zmijewski.
        LGD base 45% (Basilea IRB Foundation), aggiustata per tipo garanzia.
      </div>
    </div>
  );
}
