"use client";
// ─── Cluster Performance Panel — Confronto azienda vs cluster ─────────────────
// Visualizza metriche aziendali rispetto al benchmark del cluster di appartenenza.

import { useMemo } from "react";
import type { ParsedBilancio, RiskModelResults } from "@/lib/types";
import { compareToCluster, type MetricComparison } from "@/lib/clusterAnalysis";

interface ClusterPerformanceProps {
  bilancioData: ParsedBilancio;
  modelsData: RiskModelResults;
  pd: number;
}

// ── Sparkline range bar ─────────────────────────────────────────────────────

function SparklineBar({ metric }: { metric: MetricComparison }) {
  const { range, azienda } = metric;
  const span = range.max - range.min || 1;

  // Posizioni percentuali nel range
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - range.min) / span) * 100));

  const p25Pos   = pos(range.p25);
  const mediaPos = pos(range.media);
  const p75Pos   = pos(range.p75);
  const azPos    = pos(azienda);

  return (
    <div className="relative w-full h-4 mt-1">
      {/* Full range track */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-white/10" />

      {/* Interquartile range (25-75) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-[6px] rounded-full bg-white/15"
        style={{ left: `${p25Pos}%`, width: `${Math.max(0, p75Pos - p25Pos)}%` }}
      />

      {/* P25 tick */}
      <div
        className="absolute top-0 h-full w-px bg-yellow/40"
        style={{ left: `${p25Pos}%` }}
      />

      {/* Media tick */}
      <div
        className="absolute top-0 h-full w-px bg-cyan/60"
        style={{ left: `${mediaPos}%` }}
      />

      {/* P75 tick */}
      <div
        className="absolute top-0 h-full w-px bg-green/40"
        style={{ left: `${p75Pos}%` }}
      />

      {/* Azienda marker */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-bg-deep shadow-lg ${
          metric.segnale === 'VERDE'  ? 'bg-green shadow-green/30'  :
          metric.segnale === 'GIALLO' ? 'bg-yellow shadow-yellow/30' :
                                        'bg-red shadow-red/30'
        }`}
        style={{ left: `${azPos}%` }}
      />
    </div>
  );
}

// ── Signal icon per segnale ─────────────────────────────────────────────────

function SignalDot({ segnale }: { segnale: 'VERDE' | 'GIALLO' | 'ROSSO' }) {
  const cfg = {
    VERDE:  { dot: 'bg-green',  ring: 'ring-green/30',  label: 'OK' },
    GIALLO: { dot: 'bg-yellow', ring: 'ring-yellow/30', label: 'ATT' },
    ROSSO:  { dot: 'bg-red',    ring: 'ring-red/30',    label: 'KO' },
  }[segnale];

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${cfg.dot} ring-2 ${cfg.ring}`} />
      <span className={`text-[9px] font-space font-bold ${
        segnale === 'VERDE'  ? 'text-green'  :
        segnale === 'GIALLO' ? 'text-yellow' :
                               'text-red'
      }`}>{cfg.label}</span>
    </div>
  );
}

// ── Format helpers ──────────────────────────────────────────────────────────

function fmtValue(metrica: string, val: number): string {
  if (metrica === 'PD')            return `${(val * 100).toFixed(2)}%`;
  if (metrica === 'EBITDA Margin') return `${val.toFixed(1)}%`;
  if (metrica === 'Leverage')      return val.toFixed(2) + 'x';
  if (metrica === 'Current Ratio') return val.toFixed(2) + 'x';
  return val.toFixed(2);
}

function fmtDelta(val: number): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ClusterPerformance({ bilancioData, modelsData, pd }: ClusterPerformanceProps) {
  const result = useMemo(
    () => compareToCluster(bilancioData, modelsData, pd),
    [bilancioData, modelsData, pd],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-space text-sm font-bold text-white tracking-wide">
            Performance vs Cluster
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">
            Confronto con il cluster di riferimento
          </p>
        </div>

        {/* Cluster badge */}
        <div className="flex items-center gap-1.5">
          {result.cluster.revenueBand && (
            <span className="text-[9px] px-2 py-0.5 rounded border font-space font-semibold
              text-purple bg-purple/10 border-purple/40">
              {result.cluster.revenueBand}
            </span>
          )}
          <span className={`text-[9px] px-2 py-0.5 rounded border font-space font-semibold ${
            result.cluster.riskProfile === 'LOW_RISK'
              ? 'text-green bg-green/10 border-green/40'
              : result.cluster.riskProfile === 'MEDIUM_RISK'
                ? 'text-yellow bg-yellow/10 border-yellow/40'
                : 'text-red bg-red/10 border-red/40'
          }`}>
            {result.cluster.riskProfile}
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded border font-space font-semibold
            text-cyan bg-cyan/10 border-cyan/40">
            {result.cluster.settoreMacro}
          </span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_80px_70px_50px] gap-2 px-4 py-2.5 border-b border-glass-border bg-white/[0.02]">
          <span className="text-[9px] text-text-muted font-space uppercase tracking-wider">Metrica</span>
          <span className="text-[9px] text-text-muted font-space uppercase tracking-wider text-right">Azienda</span>
          <span className="text-[9px] text-text-muted font-space uppercase tracking-wider text-right">Cluster</span>
          <span className="text-[9px] text-text-muted font-space uppercase tracking-wider text-right">Delta</span>
          <span className="text-[9px] text-text-muted font-space uppercase tracking-wider text-center">Sig.</span>
        </div>

        {/* Rows */}
        {result.metriche.map((m) => (
          <div
            key={m.metrica}
            className="grid grid-cols-[1fr_80px_80px_70px_50px] gap-2 px-4 py-3 border-b border-glass-border/50
              hover:bg-white/[0.03] transition"
          >
            {/* Metrica name + sparkline */}
            <div className="min-w-0">
              <span className="text-[11px] font-space font-semibold text-white">{m.metrica}</span>
              <SparklineBar metric={m} />
              <div className="flex justify-between mt-0.5">
                <span className="text-[7px] text-text-muted">min</span>
                <span className="text-[7px] text-yellow/60">p25</span>
                <span className="text-[7px] text-cyan/60">avg</span>
                <span className="text-[7px] text-green/60">p75</span>
                <span className="text-[7px] text-text-muted">max</span>
              </div>
            </div>

            {/* Azienda value */}
            <div className="flex items-start justify-end">
              <span className={`text-[11px] font-space font-bold ${
                m.segnale === 'VERDE'  ? 'text-green'  :
                m.segnale === 'GIALLO' ? 'text-yellow' :
                                         'text-red'
              }`}>
                {fmtValue(m.metrica, m.azienda)}
              </span>
            </div>

            {/* Cluster value */}
            <div className="flex items-start justify-end">
              <span className="text-[11px] font-space text-text-muted">
                {fmtValue(m.metrica, m.cluster)}
              </span>
            </div>

            {/* Delta */}
            <div className="flex items-start justify-end">
              <span className={`text-[10px] font-space font-semibold ${
                m.deltaPercent > 0
                  ? (m.metrica === 'Leverage' || m.metrica === 'PD' ? 'text-red' : 'text-green')
                  : (m.metrica === 'Leverage' || m.metrica === 'PD' ? 'text-green' : 'text-red')
              }`}>
                {fmtDelta(m.deltaPercent)}
              </span>
            </div>

            {/* Signal */}
            <div className="flex items-start justify-center">
              <SignalDot segnale={m.segnale} />
            </div>
          </div>
        ))}
      </div>

      {/* Early Warning / All Clear */}
      {result.earlyWarning ? (
        <div className="glass-panel rounded-xl border border-red/40 bg-red/5 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-space text-[11px] font-bold text-red tracking-wide uppercase">
              Early Warning Attivato
            </span>
          </div>
          <ul className="space-y-1">
            {result.signals.map((signal, i) => (
              <li key={i} className="text-[10px] text-red/90 leading-relaxed pl-6 relative">
                <span className="absolute left-2 top-1 w-1 h-1 rounded-full bg-red/60" />
                {signal}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-green/40 bg-green/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-space text-[11px] font-bold text-green tracking-wide">
              Debitore in linea con il cluster
            </span>
          </div>
          <p className="text-[10px] text-green/70 mt-1 pl-6">
            Le metriche aziendali sono coerenti con il benchmark del cluster di riferimento
            ({result.clusterLabel}).
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green" />
          <span className="text-[8px] text-text-muted font-space">&ge; 75&deg; perc.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow" />
          <span className="text-[8px] text-text-muted font-space">25&deg;-75&deg; perc.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red" />
          <span className="text-[8px] text-text-muted font-space">&lt; 25&deg; perc.</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-[3px] rounded-full bg-white/15" />
          <span className="text-[8px] text-text-muted font-space">range IQR cluster</span>
        </div>
      </div>
    </div>
  );
}
