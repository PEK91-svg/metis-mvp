"use client";

export function RiskChartWidget({ data }: { data: any[] }) {
  const risks = [
    { label: "Alto",    value: 18, color: "#f87171", pct: 18 },
    { label: "Medio",   value: 42, color: "#facc15", pct: 42 },
    { label: "Basso",   value: 32, color: "#00E5FF", pct: 32 },
    { label: "Minimo",  value: 8,  color: "#34d399", pct: 8  },
  ];
  const total = risks.reduce((a, r) => a + r.value, 0);

  // Build SVG donut
  const R = 50, C = 60, stroke = 14;
  const circumference = 2 * Math.PI * R;
  let cumulative = 0;
  const segments = risks.map((r) => {
    const pct = r.value / total;
    const dash = pct * circumference;
    const offset = circumference - cumulative * circumference;
    cumulative += pct;
    return { ...r, dash, gap: circumference - dash, offset };
  });

  return (
    <div className="flex flex-col h-full w-full gap-4">
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {segments.map((s) => (
              <circle
                key={s.label}
                cx={C} cy={C} r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
                opacity={0.9}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-light text-white font-[var(--font-space)]">{total}</span>
            <span className="text-[9px] text-white/40 uppercase tracking-widest">pratiche</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1">
          {risks.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color, boxShadow: `0 0 6px ${r.color}` }}/>
              <span className="text-xs text-white/60 flex-1">{r.label}</span>
              <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(r.value / total) * 100}%`, background: r.color }}/>
              </div>
              <span className="text-xs font-[var(--font-space)]" style={{ color: r.color, minWidth: 24, textAlign: "right" }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Heatmap */}
      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Intensità rischio — ultimi 7 giorni</p>
        <div className="grid grid-cols-7 gap-1.5">
          {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map((d, i) => {
            const intensity = [0.3, 0.6, 0.9, 0.5, 0.7, 0.4, 0.8][i];
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <div
                  className="w-full aspect-square rounded"
                  style={{ background: `rgba(248, 113, 113, ${intensity})`, boxShadow: intensity > 0.7 ? "0 0 8px rgba(248,113,113,0.5)" : "none" }}
                />
                <span className="text-[9px] text-white/30">{d}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
