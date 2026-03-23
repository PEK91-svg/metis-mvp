"use client";
import { useState } from "react";

export function PortfolioHealthWidget() {
  const metrics = [
    { label: "Coverage Ratio",   value: 83, color: "#00E5FF", desc: "Il rapporto tra attivi e passivi del portafoglio" },
    { label: "Exposure",         value: 67, color: "#a78bfa", desc: "Esposizione creditizia normalizzata" },
    { label: "Liquidity Score",  value: 91, color: "#34d399", desc: "Disponibilità di liquidità a breve termine" },
    { label: "Concentration",    value: 44, color: "#facc15", desc: "Indice di concentrazione del portafoglio" },
  ];
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full w-full gap-5">
      {/* Radar-like summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-widest">Portfolio Health</p>
          <p className="text-3xl font-light text-white font-[var(--font-space)] mt-1">71 <span className="text-sm text-white/40">/ 100</span></p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">STABILE</span>
          <span className="text-[10px] text-white/30 mt-1">Aggiornato 5m fa</span>
        </div>
      </div>

      {/* Gauge bars */}
      <div className="flex flex-col gap-3 flex-1">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-white/60">{m.label}</span>
              <span className="text-[11px] font-[var(--font-space)]" style={{ color: m.color }}>{m.value}%</span>
            </div>
            <div
              className="h-2 bg-white/5 rounded-full overflow-visible cursor-crosshair relative"
              onMouseEnter={() => setHoveredBar(m.label)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${m.value}%`,
                  background: hoveredBar === m.label
                    ? m.color
                    : `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                  boxShadow: hoveredBar === m.label
                    ? `0 0 14px ${m.color}, 0 0 4px ${m.color}`
                    : `0 0 8px ${m.color}60`,
                }}
              />
              {/* Tooltip */}
              {hoveredBar === m.label && (
                <div
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                  <div
                    className="px-3 py-2 rounded-xl flex flex-col items-center border whitespace-nowrap"
                    style={{ background: "#0A0F14ee", borderColor: `${m.color}60` }}
                  >
                    <span className="text-[18px] font-space font-black leading-none" style={{ color: m.color }}>
                      {m.value}%
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-white/50 mt-0.5">{m.label}</span>
                  </div>
                  <div className="w-2 h-2 rotate-45 mx-auto -mt-[5px] rounded-sm" style={{ background: `${m.color}60` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* SVG area chart at bottom */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Trend mensile</p>
        <svg viewBox="0 0 200 40" className="w-full h-10 cursor-help" preserveAspectRatio="none" title="Trend della salute del portafoglio negli ultimi mesi.">
          <defs>
            <linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <polygon points="0,40 0,28 25,22 50,25 75,15 100,18 125,10 150,14 175,8 200,12 200,40" fill="url(#phGrad)"/>
          <polyline points="0,28 25,22 50,25 75,15 100,18 125,10 150,14 175,8 200,12" fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
