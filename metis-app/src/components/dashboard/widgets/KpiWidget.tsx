"use client";
import { useState, useRef } from "react";
import type { DashboardData } from "@/components/dashboard/DashboardGrid";

interface KpiCard {
  id: string;
  label: string;
  value: string;
  sub: string;
  trend: number[];
  delta: string;
  deltaUp: boolean;
  color: string;
  icon: string;
}

export function KpiWidget({ data }: { data: DashboardData | null }) {
  const avgPd = data?.kpi?.pd ? Number(data.kpi.pd) : 4.2;
  const altman = data?.kpi?.altman ? Number(data.kpi.altman) : 3.12;
  const dscr = data?.kpi?.dscr ? Number(data.kpi.dscr) : 1.45;
  const total = 142;

  const kpis: KpiCard[] = [
    {
      id: "pd",
      label: "Avg PD",
      value: `${avgPd.toFixed(1)}%`,
      sub: "Probability of Default",
      trend: [3.8, 4.1, 3.9, 4.5, 4.0, 4.2, 4.4, 4.2],
      delta: "+0.2%",
      deltaUp: false, // higher PD is worse
      color: "#00E5FF",
      icon: "📊",
    },
    {
      id: "altman",
      label: "Altman Z'",
      value: altman.toFixed(2),
      sub: "Z-Score (safe >2.99)",
      trend: [2.8, 2.9, 3.0, 3.1, 3.0, 3.1, 3.1, 3.12],
      delta: "+0.02",
      deltaUp: true,
      color: "#00FF66",
      icon: "🏦",
    },
    {
      id: "dscr",
      label: "DSCR",
      value: `${dscr.toFixed(2)}x`,
      sub: "Debt Service Coverage",
      trend: [1.3, 1.35, 1.4, 1.38, 1.42, 1.44, 1.43, 1.45],
      delta: "+0.01",
      deltaUp: true,
      color: "#a78bfa",
      icon: "💳",
    },
    {
      id: "total",
      label: "Pratiche",
      value: String(total),
      sub: "Dossier attivi nel portafoglio",
      trend: [130, 133, 136, 138, 139, 140, 141, 142],
      delta: "+1",
      deltaUp: true,
      color: "#FACC15",
      icon: "📁",
    },
  ];

  const [hoveredPoint, setHoveredPoint] = useState<{ kpiId: string; idx: number } | null>(null);
  const svgContainerRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Mini sparkline helpers
  function buildSparkline(values: number[], W = 200, H = 60) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * (H * 0.85) - H * 0.075;
      return { x, y };
    });
    const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
    const area = `0,${H} ${pts.map(p => `${p.x},${p.y}`).join(" ")} ${W},${H}`;
    return { pts, polyline, area };
  }

  return (
    <div className="flex flex-col h-full w-full gap-3 overflow-hidden">
      {/* 2x2 KPI grid */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {kpis.map((kpi) => {
          const { pts, polyline, area } = buildSparkline(kpi.trend);
          const W = 200, H = 60;
          const isHov = hoveredPoint?.kpiId === kpi.id;
          const hovIdx = isHov ? hoveredPoint!.idx : null;

          return (
            <div
              key={kpi.id}
              className="relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 group"
              style={{
                background: `linear-gradient(135deg, #0A0F14 60%, ${kpi.color}08)`,
                borderColor: isHov ? `${kpi.color}60` : "rgba(255,255,255,0.08)",
                boxShadow: isHov ? `0 0 20px ${kpi.color}20` : "none",
              }}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-space">{kpi.label}</div>
                  <div
                    className="text-[26px] font-space font-black leading-tight mt-0.5"
                    style={{ color: kpi.color, textShadow: isHov ? `0 0 20px ${kpi.color}` : "none" }}
                  >
                    {kpi.value}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-[10px] font-space font-bold px-2 py-0.5 rounded-full border ${
                      kpi.deltaUp
                        ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                        : "text-red-400 border-red-400/30 bg-red-400/10"
                    }`}
                  >
                    {kpi.deltaUp ? "▲" : "▼"} {kpi.delta}
                  </span>
                </div>
              </div>

              {/* Hover tooltip if a point is active */}
              {hovIdx !== null && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div
                    className="px-3 py-1.5 rounded-xl border text-center"
                    style={{ background: "#0A0F1Aee", borderColor: `${kpi.color}80` }}
                  >
                    <div className="text-[18px] font-space font-black" style={{ color: kpi.color }}>
                      {kpi.trend[hovIdx]}
                    </div>
                    <div className="text-[9px] text-white/50 uppercase tracking-widest">Settimana {hovIdx + 1}</div>
                  </div>
                  <div className="w-2 h-2 rotate-45 mx-auto -mt-[5px] rounded-sm" style={{ background: `${kpi.color}80` }} />
                </div>
              )}

              {/* Sparkline SVG */}
              <div
                ref={(el) => { if (el) svgContainerRef.current.set(kpi.id, el); }}
                className="flex-1 relative"
              >
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-full"
                  preserveAspectRatio="none"
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <defs>
                    <linearGradient id={`grad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={kpi.color} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={kpi.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={area} fill={`url(#grad-${kpi.id})`} />
                  <polyline
                    points={polyline}
                    fill="none"
                    stroke={kpi.color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Invisible wide hit targets per point */}
                  {pts.map((p, i) => (
                    <rect
                      key={i}
                      x={i === 0 ? 0 : (pts[i - 1].x + p.x) / 2}
                      y={0}
                      width={
                        i === 0
                          ? (pts[1].x + p.x) / 2
                          : i === pts.length - 1
                          ? W - (pts[i - 1].x + p.x) / 2
                          : (pts[i + 1].x + p.x) / 2 - (pts[i - 1].x + p.x) / 2
                      }
                      height={H}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredPoint({ kpiId: kpi.id, idx: i })}
                    />
                  ))}
                  {/* Dots */}
                  {pts.map((p, i) => {
                    const isPoint = hovIdx === i;
                    return (
                      <g key={i}>
                        {isPoint && (
                          <circle cx={p.x} cy={p.y} r={10} fill={kpi.color} opacity={0.12} />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isPoint ? 4.5 : i === pts.length - 1 ? 3.5 : 2}
                          fill={isPoint ? kpi.color : i === pts.length - 1 ? kpi.color : "#fff"}
                          opacity={isPoint || i === pts.length - 1 ? 1 : 0.35}
                          style={{
                            filter: isPoint ? `drop-shadow(0 0 5px ${kpi.color})` : "none",
                            transition: "r 0.1s, opacity 0.1s",
                          }}
                        />
                        {/* Vertical crosshair line */}
                        {isPoint && (
                          <line
                            x1={p.x} y1={0} x2={p.x} y2={H}
                            stroke={kpi.color}
                            strokeWidth={1}
                            strokeOpacity={0.3}
                            strokeDasharray="3,3"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Sub label */}
              <div className="px-3 pb-2 text-[9px] uppercase tracking-widest text-white/25 font-space">{kpi.sub}</div>

              {/* Bottom accent line */}
              <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${kpi.color}80, transparent)` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
