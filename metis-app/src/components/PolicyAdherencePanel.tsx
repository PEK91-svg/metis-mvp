"use client";
// ─── Policy Adherence Panel ─────────────────────────────────────────────────────
// Pannello di verifica conformità dossier creditizio alle policy della banca.
// Design system Metis: glass-panel, cyan/purple/green/yellow/red, font-space.

import { useState, useMemo } from "react";
import { ParsedBilancio, RiskModelResults } from "@/lib/types";
import {
  runPolicyCheck,
  PolicyAdherenceResult,
  CreditPolicy,
  PolicyCheckResult,
} from "@/lib/policyAdherence";

// ── Props ───────────────────────────────────────────────────────────────────────

interface PolicyAdherencePanelProps {
  bilancioData: ParsedBilancio;
  modelsData: RiskModelResults;
}

// ── Category Config ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<
  CreditPolicy["category"],
  { label: string; icon: string; color: string }
> = {
  LIMITE: { label: "Limiti quantitativi", icon: "⊘", color: "text-cyan" },
  REQUISITO: { label: "Requisiti obbligatori", icon: "◆", color: "text-purple" },
  DIVIETO: { label: "Divieti assoluti", icon: "✕", color: "text-red" },
  PREFERENZA: { label: "Preferenze", icon: "◇", color: "text-yellow" },
};

const CATEGORY_ORDER: CreditPolicy["category"][] = [
  "LIMITE",
  "REQUISITO",
  "DIVIETO",
  "PREFERENZA",
];

// ── Status Helpers ──────────────────────────────────────────────────────────────

function statusConfig(s: PolicyCheckResult["status"]) {
  switch (s) {
    case "PASS":
      return {
        color: "text-green",
        bg: "bg-green/10",
        border: "border-green/30",
        dot: "bg-green shadow-[0_0_6px_var(--color-green)]",
        label: "PASS",
        icon: (
          <svg className="w-3.5 h-3.5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ),
      };
    case "WARNING":
      return {
        color: "text-yellow",
        bg: "bg-yellow/10",
        border: "border-yellow/30",
        dot: "bg-yellow shadow-[0_0_6px_var(--color-yellow)]",
        label: "ATTENZIONE",
        icon: (
          <svg className="w-3.5 h-3.5 text-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 3l9.66 16.59A1 1 0 0120.84 21H3.16a1 1 0 01-.82-1.41L12 3z" />
          </svg>
        ),
      };
    case "FAIL":
      return {
        color: "text-red",
        bg: "bg-red/10",
        border: "border-red/30",
        dot: "bg-red shadow-[0_0_6px_var(--color-red)] animate-pulse",
        label: "FAIL",
        icon: (
          <svg className="w-3.5 h-3.5 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      };
  }
}

function overallConfig(s: PolicyAdherenceResult["overallStatus"]) {
  switch (s) {
    case "CONFORME":
      return { color: "text-green", bg: "bg-green/10", border: "border-green/40" };
    case "PARZIALMENTE CONFORME":
      return { color: "text-yellow", bg: "bg-yellow/10", border: "border-yellow/40" };
    case "NON CONFORME":
      return { color: "text-red", bg: "bg-red/10", border: "border-red/40" };
  }
}

// ── Score Circle ────────────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75 ? "text-green" : score >= 50 ? "text-yellow" : "text-red";
  const strokeColor =
    score >= 75
      ? "var(--color-green, #22c55e)"
      : score >= 50
        ? "var(--color-yellow, #eab308)"
        : "var(--color-red, #ef4444)";

  return (
    <div className="relative flex items-center justify-center w-[90px] h-[90px]">
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="5"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className={`font-space text-2xl font-bold ${color}`}>{score}</span>
        <span className="text-[8px] text-text-muted uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  );
}

// ── Policy Row ──────────────────────────────────────────────────────────────────

function PolicyRow({
  policy,
  result,
}: {
  policy: CreditPolicy;
  result: PolicyCheckResult;
}) {
  const [open, setOpen] = useState(false);
  const cfg = statusConfig(result.status);

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        open ? cfg.border : "border-glass-border"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left"
      >
        <div className="shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-white font-medium truncate">
            {policy.name}
          </div>
          <div className="text-[9px] text-text-muted mt-0.5">{policy.id}</div>
        </div>
        {/* Actual vs Threshold badges */}
        {result.actualValue && (
          <span className="text-[8px] font-space font-semibold text-text-muted bg-white/5 border border-glass-border px-1.5 py-0.5 rounded shrink-0">
            {result.actualValue}
          </span>
        )}
        {result.threshold && (
          <span className="text-[8px] font-space font-semibold text-text-muted shrink-0">
            vs {result.threshold}
          </span>
        )}
        {/* Status badge */}
        <span
          className={`text-[8px] px-1.5 py-0.5 rounded border font-space font-semibold shrink-0 whitespace-nowrap ${cfg.color} ${cfg.bg} ${cfg.border}`}
        >
          {cfg.label}
        </span>
        <svg
          className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div
          className={`px-4 pb-3 pt-2 border-t border-glass-border animate-[fadeUp_0.15s_ease-out_forwards] ${cfg.bg}`}
        >
          <p className="text-[10px] text-text-main leading-relaxed mb-2">
            {result.detail}
          </p>
          <div className="text-[9px] text-text-muted border-l border-glass-border pl-2 italic">
            Policy: {policy.description}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────

export default function PolicyAdherencePanel({
  bilancioData,
  modelsData,
}: PolicyAdherencePanelProps) {
  const [activeCategory, setActiveCategory] = useState<CreditPolicy["category"] | null>(null);

  const adherence: PolicyAdherenceResult = useMemo(
    () => runPolicyCheck(bilancioData, modelsData),
    [bilancioData, modelsData],
  );

  const overall = overallConfig(adherence.overallStatus);

  const groupedChecks = useMemo(() => {
    const groups: Record<CreditPolicy["category"], (CreditPolicy & { result: PolicyCheckResult })[]> = {
      LIMITE: [],
      REQUISITO: [],
      DIVIETO: [],
      PREFERENZA: [],
    };
    for (const check of adherence.checks) {
      groups[check.category].push(check);
    }
    return groups;
  }, [adherence]);

  const visibleCategories = activeCategory ? [activeCategory] : CATEGORY_ORDER;

  return (
    <div className="space-y-3">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between p-3 rounded-xl border ${overall.border} ${overall.bg}`}
      >
        <div className="flex-1">
          <div className="font-space text-[10px] text-text-muted uppercase tracking-widest mb-0.5">
            Adherence Policy Creditizie
          </div>
          <div
            className={`font-space text-sm font-bold ${overall.color} tracking-wider`}
          >
            {adherence.overallStatus}
          </div>
          <div className="flex gap-3 mt-2">
            {[
              { label: "Pass", value: adherence.passCount, color: "text-green" },
              { label: "Fail", value: adherence.failCount, color: "text-red" },
              { label: "Warning", value: adherence.warningCount, color: "text-yellow" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1">
                <span className={`font-space text-sm font-bold ${s.color}`}>
                  {s.value}
                </span>
                <span className="text-[8px] text-text-muted uppercase">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="ml-4 shrink-0">
          <ScoreCircle score={adherence.overallAdherence} />
        </div>
      </div>

      {/* ── Blockers ───────────────────────────────────────────────────────────── */}
      {adherence.blockers.length > 0 && (
        <div className="p-3 rounded-xl border border-red/40 bg-red/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red animate-pulse shadow-[0_0_8px_var(--color-red)]" />
            <span className="font-space text-[10px] text-red font-bold uppercase tracking-widest">
              Blockers — Erogazione non consentita
            </span>
          </div>
          <ul className="space-y-1">
            {adherence.blockers.map((b, i) => (
              <li
                key={i}
                className="text-[10px] text-red/90 leading-relaxed pl-4 border-l border-red/30"
              >
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Category Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-black/30 p-0.5 rounded-lg">
        {CATEGORY_ORDER.map((cat) => {
          const catCfg = CATEGORY_LABELS[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              className={`flex-1 py-1.5 rounded text-[9px] font-space font-semibold tracking-wider transition ${
                isActive
                  ? `bg-cyan/20 ${catCfg.color}`
                  : "text-text-muted hover:text-white"
              }`}
            >
              {catCfg.icon} {cat}
            </button>
          );
        })}
      </div>

      {/* ── Grouped Policy Checks ──────────────────────────────────────────────── */}
      {visibleCategories.map((cat) => {
        const items = groupedChecks[cat];
        if (items.length === 0) return null;
        const catCfg = CATEGORY_LABELS[cat];
        return (
          <div key={cat} className="space-y-1.5">
            <div className="flex items-center gap-2 px-1">
              <span className={`text-[9px] font-space font-semibold ${catCfg.color}`}>
                {catCfg.icon}
              </span>
              <span className="text-[10px] text-text-muted font-space uppercase tracking-wider">
                {catCfg.label}
              </span>
              <span className="text-[8px] text-text-muted">
                ({items.length})
              </span>
            </div>
            {items.map((check) => (
              <PolicyRow
                key={check.id}
                policy={check}
                result={check.result}
              />
            ))}
          </div>
        );
      })}

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <div className="text-[9px] text-text-muted border-t border-glass-border pt-2 leading-relaxed">
        Policy aggiornate al{" "}
        {new Date().toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
        . Le verifiche su protesti, Centrale Rischi e concentrazione settoriale richiedono integrazione con fonti dati esterne.
      </div>
    </div>
  );
}
