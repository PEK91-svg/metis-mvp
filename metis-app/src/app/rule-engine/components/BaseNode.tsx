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
        relative min-w-[220px] max-w-[280px]
        bg-black/70 backdrop-blur-xl
        border rounded-lg p-3
        shadow-xl transition-all duration-200
        hover:-translate-y-0.5
        ${selected
          ? `border-[${meta.color}] shadow-[0_0_25px_${meta.glowColor}]`
          : 'border-white/10 hover:border-white/20'}
      `}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: meta.color,
        ...(selected ? { boxShadow: `0 0 25px ${meta.glowColor}` } : {}),
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
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0"
          style={{
            backgroundColor: `${meta.color}15`,
            borderColor: `${meta.color}40`,
            color: meta.color,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-space font-bold uppercase text-[10px] tracking-widest truncate"
            style={{ color: meta.color }}
          >
            {data.label}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] truncate">
            {data.description}
          </div>
        </div>
        <div
          className="w-2 h-2 rounded-full shrink-0 animate-pulse"
          style={{
            backgroundColor: data.active ? meta.color : '#555',
            boxShadow: data.active ? `0 0 8px ${meta.color}` : 'none',
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
        <div className="space-y-1">
          {cfg.sources.slice(0, 3).map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[9px] text-white/70 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
              {s}
            </div>
          ))}
          <div className="text-[9px] text-white/30 mt-1">Quality: {cfg.dataQualityThreshold}%</div>
        </div>
      );
    }
    case 'fraudDetection': {
      const cfg = data.config as import("./types").FraudDetectionConfig;
      return (
        <div className="bg-white/5 border border-white/10 rounded p-2 text-[9px] text-white flex justify-between">
          <span>False Positive Limit</span>
          <span className="font-mono font-bold" style={{ color }}>{cfg.falsePositiveLimit}%</span>
        </div>
      );
    }
    case 'aiScoring': {
      const cfg = data.config as import("./types").AIScoringConfig;
      return (
        <div className="space-y-1">
          {cfg.weights.map((w, i) => (
            <div key={i} className="bg-black/40 border border-white/5 rounded px-2 py-1 flex justify-between text-[9px]">
              <span className="text-white/70">{w.label}</span>
              <span className="text-cyan font-mono">{w.value}%</span>
            </div>
          ))}
          <div className="flex gap-1.5 mt-2">
            <div className="flex-1 bg-green/10 border border-green/30 rounded py-0.5 text-center text-[8px] text-green font-space uppercase">
              &gt; {cfg.approvalThreshold}
            </div>
            <div className="flex-1 bg-red/10 border border-red/30 rounded py-0.5 text-center text-[8px] text-red font-space uppercase">
              &lt; {cfg.rejectThreshold}
            </div>
          </div>
        </div>
      );
    }
    case 'decision': {
      const cfg = data.config as import("./types").DecisionConfig;
      const actionColors: Record<string, string> = {
        approve: '#00FF66', reject: '#FF0055', manual_review: '#FACC15', escalate: '#00E5FF'
      };
      return (
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] px-2 py-0.5 rounded border font-space font-semibold uppercase tracking-widest"
            style={{
              color: actionColors[cfg.action],
              borderColor: `${actionColors[cfg.action]}40`,
              backgroundColor: `${actionColors[cfg.action]}15`,
            }}
          >
            {cfg.action.replace('_', ' ')}
          </span>
          {cfg.requiresSignoff && (
            <span className="text-[8px] text-white/40">Signoff req.</span>
          )}
        </div>
      );
    }
    case 'customRule': {
      const cfg = data.config as import("./types").CustomRuleConfig;
      return (
        <div className="bg-black/40 border border-white/5 rounded p-1.5 text-[9px] font-mono text-white/60 break-all">
          {cfg.expression}
        </div>
      );
    }
    default:
      return null;
  }
}

export default memo(BaseNode);
