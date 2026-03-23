"use client";

import { useEffect, useState } from "react";

export interface RiskAxis {
  label: string;
  abbr: string;
  value: number;   // 0-100 normalised (higher = healthier)
  raw: string;
  color: string;
}

export const DEFAULT_AXES: RiskAxis[] = [
  { label: "Altman Z'",   abbr: "ALT",  value: 82, raw: "3.12",   color: "#00E5FF" },
  { label: "PD Score",    abbr: "PD",   value: 74, raw: "2.1%",   color: "#7B2CBF" },
  { label: "DSCR",        abbr: "DSC",  value: 88, raw: "1.45x",  color: "#00FF66" },
  { label: "EBA Comp.",   abbr: "EBA",  value: 78, raw: "78/100", color: "#FACC15" },
  { label: "Ohlson O",    abbr: "OHL",  value: 68, raw: "-2.85",  color: "#F472B6" },
  { label: "Zmijewski X", abbr: "ZMJ",  value: 72, raw: "-1.72",  color: "#818CF8" },
];

const N = 6;
const CX = 110, CY = 110, R = 80;

function polarToXY(angle: number, radius: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function makePolygon(values: number[]) {
  return values.map((v, i) => {
    const { x, y } = polarToXY((360 / N) * i, (v / 100) * R);
    return `${x},${y}`;
  }).join(" ");
}

function calcOVR(axes: RiskAxis[]) {
  return Math.round(axes.reduce((a, ax) => a + ax.value, 0) / axes.length);
}

function getRating(ovr: number) {
  if (ovr >= 85) return { label: "ELITE", color: "#00E5FF" };
  if (ovr >= 75) return { label: "SOLID", color: "#00FF66" };
  if (ovr >= 60) return { label: "FAIR",  color: "#FACC15" };
  return                { label: "RISK",  color: "#F87171" };
}

interface Props {
  axes?: RiskAxis[];
  compact?: boolean; // hide footer raw values for tight spaces
}

export default function FifaRiskRadar({ axes = DEFAULT_AXES, compact = false }: Props) {
  const [animated, setAnimated] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);

  const vals = animated ? axes.map(a => a.value) : axes.map(() => 0);
  const ovr = calcOVR(axes);
  const { label: ratingLabel, color: ratingColor } = getRating(ovr);

  return (
    <div className="flex flex-col h-full w-full gap-3 select-none">
      {/* Top: OVR + Radar */}
      <div className="flex items-center gap-3">
        {/* OVR Badge */}
        <div
          className="flex flex-col items-center justify-center shrink-0 w-[72px] h-[72px] rounded-2xl border-2"
          style={{ borderColor: ratingColor, background: `${ratingColor}10`, boxShadow: `0 0 18px ${ratingColor}30` }}
        >
          <div className="text-[9px] font-space uppercase tracking-widest" style={{ color: ratingColor }}>OVR</div>
          <div className="text-3xl font-space font-black leading-none mt-0.5" style={{ color: ratingColor, textShadow: `0 0 18px ${ratingColor}` }}>{ovr}</div>
          <div className="text-[8px] font-space font-bold uppercase tracking-widest mt-0.5" style={{ color: ratingColor }}>{ratingLabel}</div>
        </div>

        {/* Hex Radar SVG */}
        <div className="flex-1">
          <svg viewBox="0 0 220 220" className="w-full max-w-[170px] mx-auto block" style={{ filter: "drop-shadow(0 0 10px rgba(0,229,255,0.15))" }}>
            {/* Grid rings */}
            {[25, 50, 75, 100].map(pct => (
              <polygon key={pct} points={makePolygon(Array(N).fill(pct))} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            ))}
            {/* Axis lines */}
            {axes.map((_, i) => {
              const outer = polarToXY((360 / N) * i, R);
              return <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
            })}
            {/* Filled polygon */}
            <polygon
              points={makePolygon(vals)}
              fill="rgba(0,229,255,0.10)"
              stroke="#00E5FF"
              strokeWidth="1.5"
              strokeLinejoin="round"
              style={{ transition: "all 0.9s cubic-bezier(0.4,0,0.2,1)" }}
            />
            {/* Vertex dots & Tooltips */}
            {axes.map((ax, i) => {
              const { x, y } = polarToXY((360 / N) * i, (vals[i] / 100) * R);
              const isHovered = hoveredIdx === i;
              return (
                <g key={`dot-${i}`}>
                  <circle cx={x} cy={y} r={isHovered ? 6 : 4.5} fill={ax.color} stroke="#0A0F14" strokeWidth="1.5"
                    className="cursor-help transition-all duration-300"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                  {isHovered && (
                    <g className="animate-[fadeIn_0.2s_ease-out]">
                      <rect x={x - 45} y={y - 35} width="90" height="28" rx="4" fill="#0A0F14" fillOpacity="0.9" stroke="rgba(255,255,255,0.1)" />
                      <text x={x} y={y - 24} textAnchor="middle" fill={ax.color} fontSize="8" fontFamily="var(--font-space,sans-serif)" fontWeight="bold">
                        {ax.label}
                      </text>
                      <text x={x} y={y - 14} textAnchor="middle" fill="#fff" fontSize="8" fontFamily="var(--font-space,sans-serif)">
                        Score: {Math.round(ax.value)} ({ax.raw})
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            {/* Labels */}
            {axes.map((ax, i) => {
              const { x, y } = polarToXY((360 / N) * i, R + 17);
              return (
                <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.5)" fontSize="7.5" fontFamily="var(--font-space,sans-serif)"
                  fontWeight="700" letterSpacing="0.06em">
                  {ax.abbr}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Attribute bars */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {axes.map(ax => (
          <div key={ax.abbr} className="flex items-center gap-1.5">
            <span className="text-[10px] font-space font-black w-6 text-right shrink-0" style={{ color: ax.color }}>{ax.value}</span>
            <div className="flex-1 h-[5px] bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                style={{ width: animated ? `${ax.value}%` : "0%", background: ax.color, boxShadow: `0 0 5px ${ax.color}70`, transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
            </div>
            <span className="text-[8.5px] text-white/30 font-space w-7 shrink-0">{ax.abbr}</span>
          </div>
        ))}
      </div>

      {/* Raw values footer */}
      {!compact && (
        <div className="mt-auto border-t border-white/8 pt-2 grid grid-cols-3 gap-1">
          {axes.map(ax => (
            <div key={ax.abbr} className="text-center">
              <div className="font-space text-[10px] font-bold" style={{ color: ax.color }}>{ax.raw}</div>
              <div className="text-[7.5px] text-white/25 uppercase tracking-widest leading-tight">{ax.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
