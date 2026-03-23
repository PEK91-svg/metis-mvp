"use client";
import { memo, ReactNode } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { RuleNodeData, NODE_META } from "./types";

// SVG icons per node type
const icons: Record<string, ReactNode> = {
  database: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  layers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  "check-circle": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  code: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

interface BaseNodeProps extends NodeProps<RuleNodeData> {
  onSelect?: (id: string) => void;
}

function BaseNode({ id, data, selected }: BaseNodeProps) {
  const meta = NODE_META[data.type];
  const icon = icons[meta.icon];

  return (
    <div
      className={`
        relative min-w-[240px] max-w-[300px]
        bg-[rgba(10,14,23,0.85)] backdrop-blur-2xl
        border rounded-xl p-4
        transition-all duration-300
        hover:-translate-y-1 hover:shadow-2xl
        group
        ${selected
          ? `border-[${meta.color}] shadow-[0_0_30px_${meta.glowColor}] ring-1 ring-[${meta.color}]`
          : 'border-white/10 hover:border-white/30'}
      `}
      style={{
        boxShadow: selected ? `0 0 30px ${meta.glowColor}, inset 0 0 20px ${meta.glowColor}` : '0 10px 40px -10px rgba(0,0,0,0.8)',
        borderColor: selected ? meta.color : undefined
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !rounded-full !-left-1.5"
        style={{
          background: meta.color,
          borderColor: 'rgba(0,0,0,0.5)',
          boxShadow: `0 0 8px ${meta.glowColor}`,
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors group-hover:bg-opacity-20"
          style={{
            backgroundColor: `${meta.color}15`,
            borderColor: `${meta.color}40`,
            color: meta.color,
            boxShadow: `inset 0 0 10px ${meta.glowColor}`,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-space font-bold uppercase text-[11px] tracking-widest truncate"
            style={{ color: meta.color }}
          >
            {data.label}
          </div>
          <div className="text-[10px] text-white/50 truncate mt-0.5 font-medium">
            {data.description}
          </div>
        </div>
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse border border-black/50"
          style={{
            backgroundColor: data.active ? meta.color : '#555',
            boxShadow: data.active ? `0 0 10px ${meta.glowColor}` : 'none',
          }}
        />
      </div>

      {/* Type-specific preview content */}
      <NodePreview data={data} color={meta.color} />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !rounded-full !-right-1.5"
        style={{
          background: meta.color,
          borderColor: 'rgba(0,0,0,0.5)',
          boxShadow: `0 0 8px ${meta.glowColor}`,
        }}
      />
    </div>
  );
}

// Compact preview for each node type
function NodePreview({ data, color }: { data: RuleNodeData; color: string }) {
  switch (data.type) {
    case 'dataIngestion': {
      const cfg = data.config as import("./types").DataIngestionConfig;
      return (
        <div className="space-y-1.5">
          {cfg.sources.slice(0, 3).map((s, i) => (
            <div key={i} className="bg-black/50 border border-white/10 rounded-md px-2.5 py-1.5 text-[10px] text-white/80 flex items-center gap-2 shadow-inner">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}` }} />
              <span className="font-medium">{s}</span>
            </div>
          ))}
          <div className="text-[10px] text-white/40 mt-2 font-mono ml-1">Quality: {cfg.dataQualityThreshold}%</div>
        </div>
      );
    }
    case 'fraudDetection': {
      const cfg = data.config as import("./types").FraudDetectionConfig;
      return (
        <div className="bg-black/50 border border-white/10 rounded-md p-2.5 text-[10px] text-white/80 flex justify-between shadow-inner items-center">
          <span className="font-medium">False Pos. Limit</span>
          <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-white/5" style={{ color }}>{cfg.falsePositiveLimit}%</span>
        </div>
      );
    }
    case 'aiScoring': {
      const cfg = data.config as import("./types").AIScoringConfig;
      return (
        <div className="space-y-1.5">
          {cfg.weights.map((w, i) => (
            <div key={i} className="bg-black/50 border border-white/10 rounded-md px-2.5 py-1.5 flex justify-between text-[10px] shadow-inner items-center">
              <span className="text-white/80 font-medium">{w.label}</span>
              <span className="text-cyan font-mono font-bold bg-cyan/10 px-1.5 py-0.5 rounded border border-cyan/20">{w.value}%</span>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <div className="flex-1 bg-green/10 border border-green/30 rounded-md py-1 text-center text-[10px] text-green font-space uppercase font-bold shadow-[inset_0_0_10px_rgba(0,255,102,0.1)]">
              &gt; {cfg.approvalThreshold}
            </div>
            <div className="flex-1 bg-red/10 border border-red/30 rounded-md py-1 text-center text-[10px] text-red font-space uppercase font-bold shadow-[inset_0_0_10px_rgba(255,71,87,0.1)]">
              &lt; {cfg.rejectThreshold}
            </div>
          </div>
        </div>
      );
    }
    case 'decision': {
      const cfg = data.config as import("./types").DecisionConfig;
      const actionColors: Record<string, string> = {
        approve: '#00E5FF', reject: '#FF4757', manual_review: '#FACC15', escalate: '#A55EEA'
      };
      return (
        <div className="flex items-center gap-2.5 pt-1">
          <span
            className="text-[10px] px-2.5 py-1 rounded-md border font-space font-bold uppercase tracking-widest shadow-inner"
            style={{
              color: actionColors[cfg.action],
              borderColor: `${actionColors[cfg.action]}50`,
              backgroundColor: `${actionColors[cfg.action]}15`,
              boxShadow: `0 0 10px ${actionColors[cfg.action]}20`
            }}
          >
            {cfg.action.replace('_', ' ')}
          </span>
          {cfg.requiresSignoff && (
            <span className="text-[9px] text-white/50 font-medium bg-white/5 px-2 py-1 rounded border border-white/10">Signoff req.</span>
          )}
        </div>
      );
    }
    case 'customRule': {
      const cfg = data.config as import("./types").CustomRuleConfig;
      return (
        <div className="bg-[#090D14] border border-white/10 rounded-md p-2.5 text-[10px] font-mono text-white/70 break-all shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red/50"></div>
          <span className="pl-1">{cfg.expression}</span>
        </div>
      );
    }
    default:
      return null;
  }
}

export default memo(BaseNode);
