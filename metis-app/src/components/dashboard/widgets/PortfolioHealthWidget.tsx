"use client";

export function PortfolioHealthWidget() {
  const metrics = [
    { label: "Coverage Ratio",   value: 83, color: "#00E5FF" },
    { label: "Exposure",         value: 67, color: "#a78bfa" },
    { label: "Liquidity Score",  value: 91, color: "#34d399" },
    { label: "Concentration",    value: 44, color: "#facc15" },
  ];

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
            <div className="h-2 bg-white/5 rounded-full overflow-hidden cursor-help" title={`${m.label}: ${m.value}%`}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${m.value}%`,
                  background: `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                  boxShadow: `0 0 8px ${m.color}60`,
                }}
              />
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
