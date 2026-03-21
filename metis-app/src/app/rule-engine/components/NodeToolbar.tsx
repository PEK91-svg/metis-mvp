"use client";
import { RuleNodeType, NODE_META } from "./types";

interface NodeToolbarProps {
  onAddNode: (type: RuleNodeType) => void;
}

const nodeTypes: RuleNodeType[] = [
  'dataIngestion',
  'fraudDetection',
  'aiScoring',
  'decision',
  'customRule',
];

export default function NodeToolbar({ onAddNode }: NodeToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-2xl gap-1">
      {nodeTypes.map((type) => {
        const meta = NODE_META[type];
        return (
          <button
            key={type}
            onClick={() => onAddNode(type)}
            className="group flex items-center gap-2 px-3 py-2 rounded-full transition-all hover:bg-white/5"
            title={`Add ${meta.defaultLabel}`}
          >
            <div
              className="w-2 h-2 rounded-full transition-shadow"
              style={{
                backgroundColor: meta.color,
                boxShadow: `0 0 6px ${meta.glowColor}`,
              }}
            />
            <span className="text-[10px] font-space uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
              {meta.defaultLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
