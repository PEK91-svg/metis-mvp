"use client";

import { useEffect, useRef, useState } from "react";

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
  compact?: boolean;
}

interface TooltipState {
  idx: number;
  // pixel position relative to the SVG container element
  svgX: number;
  svgY: number;
}

export default function FifaRiskRadar({ axes = DEFAULT_AXES, compact = false }: Props) {
  const [animated, setAnimated] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);

  const vals = animated ? axes.map(a => a.value) : axes.map(() => 0);
  const ovr = calcOVR(axes);
  const { label: ratingLabel, color: ratingColor } = getRating(ovr);

  // Compute SVG viewport coords → CSS pixel offset in the container
  const handleDotEnter = (i: number, svgX: number, svgY: number) => {
    if (!svgContainerRef.current) return;
    const rect = svgContainerRef.current.getBoundingClientRect();
    const svgEl = svgContainerRef.current.querySelector("svg") as SVGSVGElement;
    if (!svgEl) return;
    const vb = svgEl.viewBox.baseVal; // 220 x 220
    const scaleX = rect.width / vb.width;
    const scaleY = rect.height / vb.height;
    setTooltip({
      idx: i,
      svgX: svgX * scaleX,
      svgY: svgY * scaleY,
    });
  };

  const ax = tooltip !== null ? axes[tooltip.idx] : null;

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

        {/* Hex Radar SVG — wrapped in relative div for HTML tooltip overlay */}
        <div className="flex-1 relative" ref={svgContainerRef}>
          <svg
            viewBox="0 0 220 220"
            className="w-full max-w-[170px] mx-auto block"
            style={{ filter: "drop-shadow(0 0 10px rgba(0,229,255,0.15))" }}
            onMouseLeave={() => setTooltip(null)}
          >
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
              fill={tooltip !== null ? `${axes[tooltip.idx].color}18` : "rgba(0,229,255,0.10)"}
              stroke={tooltip !== null ? axes[tooltip.idx].color : "#00E5FF"}
              strokeWidth="1.5"
              strokeLinejoin="round"
              style={{ transition: "all 0.4s ease" }}
            />
            {/* Vertex dots — larger hit area */}
            {axes.map((ax, i) => {
              const { x, y } = polarToXY((360 / N) * i, (vals[i] / 100) * R);
              const isHov = tooltip?.idx === i;
              return (
                <g key={`dot-${i}`}>
                  {/* Invisible large hit target */}
                  <circle cx={x} cy={y} r={12} fill="transparent" className="cursor-crosshair"
                    onMouseEnter={() => handleDotEnter(i, x, y)}
                  />
                  {/* Visible dot */}
                  <circle cx={x} cy={y}
                    r={isHov ? 7 : 4.5}
                    fill={ax.color}
                    stroke={isHov ? "#fff" : "#0A0F14"}
                    strokeWidth={isHov ? 2 : 1.5}
                    style={{
                      transition: "r 0.15s, filter 0.15s",
                      filter: isHov ? `drop-shadow(0 0 6px ${ax.color})` : "none",
                    }}
                  />
                </g>
              );
            })}
            {/* Labels */}
            {axes.map((ax, i) => {
              const { x, y } = polarToXY((360 / N) * i, R + 17);
              const isHovLabel = tooltip?.idx === i;
              return (
                <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                  fill={isHovLabel ? ax.color : "rgba(255,255,255,0.5)"}
                  fontSize={isHovLabel ? "8.5" : "7.5"}
                  fontFamily="var(--font-space,sans-serif)"
                  fontWeight="700" letterSpacing="0.06em"
                  style={{ transition: "fill 0.15s, font-size 0.15s" }}
                >
                  {ax.abbr}
                </text>
              );
            })}
          </svg>

          {/* HTML Tooltip overlay — positioned in px relative to SVG container */}
          {tooltip !== null && ax && (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: tooltip.svgX,
                top: tooltip.svgY - 72,
                transform: "translateX(-50%)",
                filter: `drop-shadow(0 0 10px ${ax.color}60)`,
              }}
            >
              <div
                className="px-4 py-2.5 rounded-xl border flex flex-col items-center whitespace-nowrap"
                style={{ background: "#0A0F1Aee", borderColor: `${ax.color}80` }}
              >
                <span className="text-[24px] font-space font-black leading-none" style={{ color: ax.color, textShadow: `0 0 12px ${ax.color}` }}>
                  {Math.round(ax.value)}
                </span>
                <span className="text-[9px] text-white/60 uppercase tracking-widest mt-0.5">{ax.label}</span>
                <span className="text-[10px] font-space font-bold mt-0.5" style={{ color: ax.color }}>{ax.raw}</span>
              </div>
              {/* Arrow */}
              <div className="w-2.5 h-2.5 rotate-45 mx-auto -mt-[6px] rounded-sm" style={{ background: `${ax.color}80` }} />
            </div>
          )}
        </div>
      </div>

      {/* Attribute bars — with per-bar hover like Pipeline */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {axes.map((ax, i) => (
          <div key={ax.abbr} className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-space font-black w-6 text-right shrink-0"
              style={{ color: ax.color, textShadow: hoveredBar === i ? `0 0 8px ${ax.color}` : "none" }}
            >
              {ax.value}
            </span>
            <div
              className="flex-1 h-[5px] bg-white/5 rounded-full overflow-visible relative cursor-crosshair"
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: animated ? `${ax.value}%` : "0%",
                  background: hoveredBar === i ? ax.color : ax.color,
                  boxShadow: hoveredBar === i
                    ? `0 0 12px ${ax.color}, 0 0 4px ${ax.color}`
                    : `0 0 5px ${ax.color}70`,
                  transition: "width 0.9s cubic-bezier(0.4,0,0.2,1), box-shadow 0.15s",
                  transform: hoveredBar === i ? "scaleY(2.5)" : "scaleY(1)",
                  transformOrigin: "center",
                }}
              />
              {/* Bar tooltip */}
              {hoveredBar === i && (
                <div
                  className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                  style={{ filter: `drop-shadow(0 0 6px ${ax.color}60)` }}
                >
                  <div
                    className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border whitespace-nowrap"
                    style={{ background: "#0A0F1Aee", borderColor: `${ax.color}80` }}
                  >
                    <span className="font-space font-black text-[14px]" style={{ color: ax.color }}>{ax.value}</span>
                    <span className="text-[9px] text-white/50 uppercase tracking-wide">{ax.abbr} · {ax.raw}</span>
                  </div>
                  <div className="w-2 h-2 rotate-45 mx-auto -mt-[5px] rounded-sm" style={{ background: `${ax.color}80` }} />
                </div>
              )}
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
