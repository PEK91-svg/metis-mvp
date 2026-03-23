"use client";
import { useState } from "react";
import type { DashboardData } from "@/components/dashboard/DashboardGrid";

export function PipelineChartWidget({ data: _data }: { data: DashboardData | null }) {
  const bars = [
    { label: "Approved", values: [40, 55, 45, 70, 60, 75, 65, 85], color: "#00E5FF" },
    { label: "Pending",  values: [20, 28, 22, 35, 30, 38, 28, 42], color: "#a78bfa" },
    { label: "Rejected", values: [10, 15, 12, 20, 14, 22, 16, 26], color: "#f87171" },
  ];

  // Track which bar+week is hovered: "barLabel-weekIndex" key
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full w-full gap-4">
      <div className="grid grid-cols-3 gap-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-widest text-white/50">{b.label}</span>
              <span className="text-[11px] font-[var(--font-space)]" style={{ color: b.color }}>
                {b.values[b.values.length - 1]}
              </span>
            </div>
            {/* Sparkline */}
            <div className="flex items-end gap-[3px] h-14 w-full">
              {b.values.map((v, j) => {
                const key = `${b.label}-${j}`;
                const isHov = hovered === key;
                const pct = (v / 100) * 100;
                const isLast = j === b.values.length - 1;

                return (
                  <div
                    key={j}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}
                    className="flex-1 rounded-sm cursor-crosshair relative"
                    style={{
                      height: `${pct}%`,
                      minHeight: 4,
                      // glow + fill change on hover
                      background: isHov
                        ? b.color
                        : isLast
                        ? b.color
                        : `${b.color}40`,
                      boxShadow: isHov
                        ? `0 0 16px ${b.color}, 0 0 6px ${b.color}`
                        : isLast
                        ? `0 0 8px ${b.color}80`
                        : "none",
                      transition: "background 0.15s, box-shadow 0.15s",
                      transform: isHov ? "scaleY(1.08)" : "scaleY(1)",
                      transformOrigin: "bottom",
                    }}
                  >
                    {/* Single tooltip - only shows when THIS bar is hovered */}
                    {isHov && (
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
                        style={{ filter: `drop-shadow(0 0 8px ${b.color}60)` }}
                      >
                        <div
                          className="px-3 py-2 rounded-xl font-space border whitespace-nowrap flex flex-col items-center gap-0.5"
                          style={{
                            background: "#0A0F14ee",
                            borderColor: `${b.color}60`,
                          }}
                        >
                          <span
                            className="text-xl font-black leading-none"
                            style={{ color: b.color, textShadow: `0 0 10px ${b.color}` }}
                          >
                            {v}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-white/50">
                            Sett. {j + 1} · {b.label}
                          </span>
                        </div>
                        {/* Arrow */}
                        <div
                          className="w-2 h-2 rotate-45 mx-auto -mt-[5px] rounded-sm"
                          style={{ background: `${b.color}60` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Stacked bar summary */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-white/50 uppercase tracking-widest">Weekly Distribution</span>
          <span className="text-[10px] text-white/30">last 7d</span>
        </div>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden">
          {bars.map((b) => {
            const total = bars.reduce((acc, x) => acc + x.values[x.values.length - 1], 0);
            const pct = (b.values[b.values.length - 1] / total) * 100;
            return (
              <div key={b.label} style={{ flex: pct, background: b.color, opacity: 0.85 }} />
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {bars.map((b) => {
            const total = bars.reduce((acc, x) => acc + x.values[x.values.length - 1], 0);
            const pct = Math.round((b.values[b.values.length - 1] / total) * 100);
            return (
              <div key={b.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: b.color }}/>
                <span className="text-[10px] text-white/50">{b.label} <span style={{ color: b.color }}>{pct}%</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
