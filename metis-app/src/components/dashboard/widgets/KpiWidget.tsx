"use client";
import type { DashboardData } from "@/components/dashboard/DashboardGrid";

export function KpiWidget({ data }: { data: DashboardData | null }) {
  const avgPd = data?.avgPd ?? 4.2;
  const pdMin = data?.pdMin ?? 1.2;
  const pdMax = data?.pdMax ?? 8.5;
  const total = data?.total ?? 142;

  // Build a mini area chart for avg PD trend
  const trend = [3.8, 4.1, 3.9, 4.5, 4.0, 4.2, 4.4, 4.2];
  const maxT = Math.max(...trend);
  const H = 60;
  const W = 200;
  const pts = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * W;
    const y = H - (v / maxT) * H;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area = `0,${H} ${polyline} ${W},${H}`;

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {/* Header stat */}
      <div>
        <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">Avg Default Probability</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-light text-white font-[var(--font-space)]">{avgPd.toFixed(1)}</span>
          <span className="text-xl text-[#00E5FF]">%</span>
          <span className="ml-auto text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">▲ 0.2</span>
        </div>
      </div>

      {/* Trend SVG */}
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#kpiGrad)"/>
          <polyline points={polyline} fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {trend.map((v, i) => {
            const x = (i / (trend.length - 1)) * W;
            const y = H - (v / maxT) * H;
            return <circle key={i} cx={x} cy={y} r={i === trend.length - 1 ? 3.5 : 2} fill={i === trend.length - 1 ? "#00E5FF" : "#fff"} opacity={i === trend.length - 1 ? 1 : 0.4}/>;
          })}
        </svg>
      </div>

      {/* Sub KPIs */}
      <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
        {[
          { label: "Min PD", value: `${pdMin.toFixed(1)}%`, color: "text-emerald-400" },
          { label: "Max PD", value: `${pdMax.toFixed(1)}%`, color: "text-red-400" },
          { label: "Pratiche", value: total, color: "text-[#00E5FF]" },
        ].map(k => (
          <div key={k.label}>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-lg font-[var(--font-space)] font-semibold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
