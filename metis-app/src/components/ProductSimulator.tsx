"use client";
// ─── Metis MVP — Product Simulator UI ────────────────────────────────────────
// Componente per visualizzare la simulazione dei prodotti creditizi PEF.

import { useState, useMemo } from "react";
import type { ParsedBilancio } from "@/lib/types";
import { simulaProdotti, type SimulationResult } from "@/lib/productSimulator";

interface ProductSimulatorProps {
  bilancioData: ParsedBilancio;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatEuro(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function riskBadgeClasses(label: SimulationResult["rischioLabel"]): string {
  switch (label) {
    case "BASSO":
      return "text-green bg-green/10 border-green/40";
    case "MEDIO":
      return "text-yellow bg-yellow/10 border-yellow/40";
    case "ALTO":
      return "text-red bg-red/10 border-red/40";
  }
}

function productIcon(tipo: SimulationResult["tipo"]): string {
  switch (tipo) {
    case "REVOLVING":
      return "🔄";
    case "CHIROGRAFARIO":
      return "📝";
    case "IPOTECARIO":
      return "🏠";
    case "SBF":
      return "📄";
    case "LEASING":
      return "🔑";
  }
}

function dscrColor(delta: number): string {
  if (delta >= -0.1) return "text-green";
  if (delta >= -0.3) return "text-yellow";
  return "text-red";
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function ProductSimulator({ bilancioData }: ProductSimulatorProps) {
  const [importo, setImporto] = useState(500000);
  const [durataMesi, setDurataMesi] = useState(60);

  const risultati = useMemo(
    () => simulaProdotti(bilancioData, importo, durataMesi),
    [bilancioData, importo, durataMesi],
  );

  return (
    <div className="glass-panel p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center text-lg">
          📊
        </div>
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Simulatore Prodotti PEF
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            Analisi comparativa prodotti creditizi — {bilancioData.companyName}
          </p>
        </div>
      </div>

      {/* ── Sliders ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Importo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-text-muted font-medium uppercase tracking-wider">
              Importo Richiesto
            </label>
            <span className="text-sm font-space font-semibold text-cyan">
              {formatEuro(importo)}
            </span>
          </div>
          <input
            type="range"
            min={50000}
            max={2000000}
            step={10000}
            value={importo}
            onChange={(e) => setImporto(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-black/20 accent-cyan"
          />
          <div className="flex justify-between text-[9px] text-text-muted font-space">
            <span>50k</span>
            <span>500k</span>
            <span>1M</span>
            <span>2M</span>
          </div>
        </div>

        {/* Durata */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-text-muted font-medium uppercase tracking-wider">
              Durata
            </label>
            <span className="text-sm font-space font-semibold text-purple">
              {durataMesi} mesi
            </span>
          </div>
          <input
            type="range"
            min={12}
            max={120}
            step={6}
            value={durataMesi}
            onChange={(e) => setDurataMesi(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-black/20 accent-purple"
          />
          <div className="flex justify-between text-[9px] text-text-muted font-space">
            <span>12m</span>
            <span>36m</span>
            <span>60m</span>
            <span>84m</span>
            <span>120m</span>
          </div>
        </div>
      </div>

      {/* ── Griglia prodotti ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {risultati.map((r) => (
          <div
            key={r.tipo}
            className={`relative rounded-xl border p-4 transition-all duration-200 ${
              r.raccomandato
                ? "border-cyan/60 bg-cyan/5 shadow-[0_0_20px_rgba(0,255,255,0.08)]"
                : "border-glass-border bg-black/20 hover:border-glass-border/80"
            }`}
          >
            {/* Badge raccomandato */}
            {r.raccomandato && (
              <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-cyan/20 border border-cyan/40 text-[9px] font-space font-bold text-cyan uppercase tracking-wider">
                Raccomandato
              </div>
            )}

            {/* Header card */}
            <div className="flex items-center gap-2.5 mb-3 mt-1">
              <span className="text-xl">{productIcon(r.tipo)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">
                  {r.label}
                </div>
                <div className="text-[9px] text-text-muted mt-0.5 font-space">
                  {r.tipo}
                </div>
              </div>
              {/* Score badge */}
              <div
                className={`shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center ${
                  r.raccomandato
                    ? "bg-cyan/15 border border-cyan/40"
                    : "bg-black/30 border border-glass-border"
                }`}
              >
                <span
                  className={`text-sm font-space font-bold leading-none ${
                    r.raccomandato ? "text-cyan" : "text-white"
                  }`}
                >
                  {r.score.toFixed(0)}
                </span>
                <span className="text-[7px] text-text-muted uppercase mt-0.5">
                  score
                </span>
              </div>
            </div>

            {/* Metriche */}
            <div className="space-y-2">
              {/* DSCR Impatto */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">DSCR Impatto</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-space font-semibold text-white">
                    {r.dscrImpatto.toFixed(2)}x
                  </span>
                  <span
                    className={`text-[9px] font-space font-medium ${dscrColor(r.dscrDelta)}`}
                  >
                    {r.dscrDelta >= 0 ? "+" : ""}
                    {r.dscrDelta.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Margine Banca */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">Margine Banca</span>
                <span className="text-[12px] font-space font-semibold text-green">
                  {formatPercent(r.margineBanca)}
                </span>
              </div>

              {/* Copertura Garanzia */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">Copertura</span>
                <span className="text-[12px] font-space font-semibold text-purple">
                  {r.coperturaGaranzia.toFixed(1)}%
                </span>
              </div>

              {/* TAEG */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">TAEG Cliente</span>
                <span className="text-[12px] font-space font-semibold text-white">
                  {formatPercent(r.taegCliente)}
                </span>
              </div>

              {/* Rischio */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">Rischio Residuo</span>
                <span
                  className={`text-[9px] font-space font-bold px-2 py-0.5 rounded-full border ${riskBadgeClasses(r.rischioLabel)}`}
                >
                  {r.rischioLabel} ({r.rischioResiduo.toFixed(0)})
                </span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-glass-border my-3" />

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded-lg bg-black/20">
                <div className="text-[9px] text-text-muted mb-0.5">Rata Annuale</div>
                <div className="text-[11px] font-space font-semibold text-white">
                  {formatEuro(r.breakdown.rataAnnuale)}
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-black/20">
                <div className="text-[9px] text-text-muted mb-0.5">Margine Tot.</div>
                <div className="text-[11px] font-space font-semibold text-green">
                  {formatEuro(r.breakdown.margineTotale)}
                </div>
              </div>
            </div>

            {/* Descrizione */}
            <p className="text-[9px] text-text-muted leading-relaxed mt-3">
              {r.descrizione}
            </p>
          </div>
        ))}
      </div>

      {/* ── Footer info ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-[9px] text-text-muted pt-2 border-t border-glass-border">
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          Simulazione indicativa basata su EURIBOR 6M 3.20% + spread risk-adjusted.
          Score = media ponderata margine (30%), rischio (30%), DSCR (25%), copertura (15%).
        </span>
      </div>
    </div>
  );
}
