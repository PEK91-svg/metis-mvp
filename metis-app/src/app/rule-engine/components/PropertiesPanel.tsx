"use client";
import { Node } from "reactflow";
import {
  RuleNodeData,
  NODE_META,
  DataIngestionConfig,
  FraudDetectionConfig,
  AIScoringConfig,
  DecisionConfig,
  CustomRuleConfig,
} from "./types";

interface PropertiesPanelProps {
  node: Node<RuleNodeData> | null;
  onUpdate: (id: string, data: Partial<RuleNodeData>) => void;
  onDelete: (id: string) => void;
}

export default function PropertiesPanel({ node, onUpdate, onDelete }: PropertiesPanelProps) {
  if (!node) {
    return (
      <div className="w-[340px] border-l border-white/10 bg-[rgba(14,21,33,0.95)] backdrop-blur-2xl flex flex-col">
        <div className="p-5 border-b border-white/10 bg-black/20">
          <h2 className="font-space text-sm font-semibold tracking-widest text-white/40">
            NODE PROPERTIES
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px] text-white/30 text-center px-8">
            Seleziona un nodo nel canvas per configurarne le proprietà.
          </p>
        </div>
      </div>
    );
  }

  const { data, id } = node;
  const meta = NODE_META[data.type];

  const updateConfig = (partial: Record<string, unknown>) => {
    onUpdate(id, { config: { ...data.config, ...partial } as RuleNodeData["config"] });
  };

  return (
    <div className="w-[340px] border-l border-white/10 bg-[rgba(14,21,33,0.95)] backdrop-blur-2xl flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <h2 className="font-space text-sm font-semibold tracking-widest text-white flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.glowColor}` }} />
            NODE PROPERTIES
          </h2>
          <button
            onClick={() => onDelete(id)}
            className="text-red/60 hover:text-red text-[10px] font-space uppercase tracking-widest transition hover:bg-red/10 px-2 py-1 rounded"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Common fields */}
        <FieldGroup label="Label">
          <input
            type="text"
            value={data.label}
            onChange={(e) => onUpdate(id, { label: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white font-space focus:border-cyan/50 focus:outline-none transition"
          />
        </FieldGroup>

        <FieldGroup label="Description">
          <textarea
            value={data.description}
            onChange={(e) => onUpdate(id, { description: e.target.value })}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/80 focus:border-cyan/50 focus:outline-none transition resize-none"
          />
        </FieldGroup>

        <FieldGroup label="Active">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`w-9 h-5 rounded-full relative transition-colors ${data.active ? 'bg-cyan/30' : 'bg-white/10'}`}
              onClick={() => onUpdate(id, { active: !data.active })}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${data.active ? 'left-4.5 bg-cyan shadow-[0_0_8px_var(--color-cyan)]' : 'left-0.5 bg-white/40'}`}
              />
            </div>
            <span className="text-[10px] text-white/60">{data.active ? 'Enabled' : 'Disabled'}</span>
          </label>
        </FieldGroup>

        <div className="border-t border-white/10 pt-4">
          <div className="text-[9px] text-white/40 font-space uppercase tracking-widest mb-3">
            Configuration — {meta.defaultLabel}
          </div>

          {/* Type-specific config editors */}
          {data.type === 'dataIngestion' && (
            <DataIngestionEditor
              config={data.config as DataIngestionConfig}
              onChange={updateConfig}
            />
          )}
          {data.type === 'fraudDetection' && (
            <FraudDetectionEditor
              config={data.config as FraudDetectionConfig}
              onChange={updateConfig}
            />
          )}
          {data.type === 'aiScoring' && (
            <AIScoringEditor
              config={data.config as AIScoringConfig}
              onChange={updateConfig}
            />
          )}
          {data.type === 'decision' && (
            <DecisionEditor
              config={data.config as DecisionConfig}
              onChange={updateConfig}
            />
          )}
          {data.type === 'customRule' && (
            <CustomRuleEditor
              config={data.config as CustomRuleConfig}
              onChange={updateConfig}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Field helpers ----

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] text-white/40 font-space uppercase tracking-widest mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  color,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-white/60">{label}</span>
        <span className="font-mono font-bold" style={{ color }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
    </div>
  );
}

// ---- Type-specific editors ----

function DataIngestionEditor({ config, onChange }: { config: DataIngestionConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <FieldGroup label="Data Sources">
        <div className="space-y-1.5">
          {config.sources.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={s}
                onChange={(e) => {
                  const newSources = [...config.sources];
                  newSources[i] = e.target.value;
                  onChange({ sources: newSources });
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:border-cyan/50 focus:outline-none transition"
              />
              <button
                onClick={() => onChange({ sources: config.sources.filter((_, j) => j !== i) })}
                className="text-red/50 hover:text-red text-[10px] transition"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ sources: [...config.sources, 'New Source'] })}
            className="text-[10px] text-cyan/60 hover:text-cyan transition font-space"
          >
            + Add Source
          </button>
        </div>
      </FieldGroup>
      <SliderField label="Data Quality Threshold" value={config.dataQualityThreshold} min={0} max={100} step={1} unit="%" color="#00E5FF" onChange={(v) => onChange({ dataQualityThreshold: v })} />
      <SliderField label="Refresh Interval" value={config.refreshInterval} min={5} max={1440} step={5} unit=" min" color="#00E5FF" onChange={(v) => onChange({ refreshInterval: v })} />
    </div>
  );
}

function FraudDetectionEditor({ config, onChange }: { config: FraudDetectionConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <SliderField label="False Positive Limit" value={config.falsePositiveLimit} min={0.1} max={10} step={0.1} unit="%" color="#FACC15" onChange={(v) => onChange({ falsePositiveLimit: v })} />
      <SliderField label="Block Threshold" value={config.blockThreshold} min={0} max={1} step={0.01} unit="" color="#FACC15" onChange={(v) => onChange({ blockThreshold: v })} />
      <FieldGroup label="Anomaly Model">
        <select
          value={config.anomalyModel}
          onChange={(e) => onChange({ anomalyModel: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white focus:border-yellow/50 focus:outline-none transition"
        >
          <option value="isolation_forest">Isolation Forest</option>
          <option value="autoencoder">Autoencoder</option>
          <option value="ensemble">Ensemble</option>
        </select>
      </FieldGroup>
      <FieldGroup label="OCR Enabled">
        <label className="flex items-center gap-2 cursor-pointer" onClick={() => onChange({ ocrEnabled: !config.ocrEnabled })}>
          <div className={`w-9 h-5 rounded-full relative transition-colors ${config.ocrEnabled ? 'bg-yellow/30' : 'bg-white/10'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${config.ocrEnabled ? 'left-4.5 bg-yellow shadow-[0_0_8px_var(--color-yellow)]' : 'left-0.5 bg-white/40'}`} />
          </div>
          <span className="text-[10px] text-white/60">{config.ocrEnabled ? 'On' : 'Off'}</span>
        </label>
      </FieldGroup>
    </div>
  );
}

function AIScoringEditor({ config, onChange }: { config: AIScoringConfig; onChange: (p: Record<string, unknown>) => void }) {
  const updateWeight = (index: number, value: number) => {
    const newWeights = [...config.weights];
    newWeights[index] = { ...newWeights[index], value };
    onChange({ weights: newWeights });
  };

  const totalWeight = config.weights.reduce((sum, w) => sum + w.value, 0);

  return (
    <div className="space-y-3">
      <FieldGroup label={`Feature Weights (Total: ${totalWeight}%)`}>
        {config.weights.map((w, i) => (
          <SliderField
            key={i}
            label={w.label}
            value={w.value}
            min={0}
            max={100}
            step={5}
            unit="%"
            color="#7B2CBF"
            onChange={(v) => updateWeight(i, v)}
          />
        ))}
        {totalWeight !== 100 && (
          <div className="text-[9px] text-red font-space">Weights must sum to 100% (currently {totalWeight}%)</div>
        )}
      </FieldGroup>
      <SliderField label="Approval Threshold" value={config.approvalThreshold} min={0} max={100} step={1} unit="" color="#00FF66" onChange={(v) => onChange({ approvalThreshold: v })} />
      <SliderField label="Reject Threshold" value={config.rejectThreshold} min={0} max={100} step={1} unit="" color="#FF0055" onChange={(v) => onChange({ rejectThreshold: v })} />
      <FieldGroup label="FairBoost™">
        <label className="flex items-center gap-2 cursor-pointer" onClick={() => onChange({ fairBoostEnabled: !config.fairBoostEnabled })}>
          <div className={`w-9 h-5 rounded-full relative transition-colors ${config.fairBoostEnabled ? 'bg-purple/30' : 'bg-white/10'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${config.fairBoostEnabled ? 'left-4.5 bg-purple shadow-[0_0_8px_var(--color-purple)]' : 'left-0.5 bg-white/40'}`} />
          </div>
          <span className="text-[10px] text-white/60">{config.fairBoostEnabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </FieldGroup>
    </div>
  );
}

function DecisionEditor({ config, onChange }: { config: DecisionConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <FieldGroup label="Action">
        <select
          value={config.action}
          onChange={(e) => onChange({ action: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white focus:border-green/50 focus:outline-none transition"
        >
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
          <option value="manual_review">Manual Review</option>
          <option value="escalate">Escalate</option>
        </select>
      </FieldGroup>
      <FieldGroup label="Max Exposure (€)">
        <input
          type="number"
          value={config.maxExposure}
          onChange={(e) => onChange({ maxExposure: parseInt(e.target.value) || 0 })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white font-mono focus:border-green/50 focus:outline-none transition"
        />
      </FieldGroup>
      <FieldGroup label="Auto Execute">
        <label className="flex items-center gap-2 cursor-pointer" onClick={() => onChange({ autoExecute: !config.autoExecute })}>
          <div className={`w-9 h-5 rounded-full relative transition-colors ${config.autoExecute ? 'bg-green/30' : 'bg-white/10'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${config.autoExecute ? 'left-4.5 bg-green shadow-[0_0_8px_var(--color-green)]' : 'left-0.5 bg-white/40'}`} />
          </div>
          <span className="text-[10px] text-white/60">{config.autoExecute ? 'Yes' : 'No'}</span>
        </label>
      </FieldGroup>
      <FieldGroup label="Requires Signoff">
        <label className="flex items-center gap-2 cursor-pointer" onClick={() => onChange({ requiresSignoff: !config.requiresSignoff })}>
          <div className={`w-9 h-5 rounded-full relative transition-colors ${config.requiresSignoff ? 'bg-cyan/30' : 'bg-white/10'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${config.requiresSignoff ? 'left-4.5 bg-cyan shadow-[0_0_8px_var(--color-cyan)]' : 'left-0.5 bg-white/40'}`} />
          </div>
          <span className="text-[10px] text-white/60">{config.requiresSignoff ? 'Yes' : 'No'}</span>
        </label>
      </FieldGroup>
    </div>
  );
}

function CustomRuleEditor({ config, onChange }: { config: CustomRuleConfig; onChange: (p: Record<string, unknown>) => void }) {
  const updateCondition = (index: number, field: string, value: string) => {
    const newConditions = [...config.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    // Rebuild expression
    const expr = newConditions.map(c => `${c.field} ${c.op} ${c.value}`).join(` ${config.operator} `);
    onChange({ conditions: newConditions, expression: expr });
  };

  return (
    <div className="space-y-3">
      <FieldGroup label="Logical Operator">
        <div className="flex gap-1">
          {(['AND', 'OR', 'NOT'] as const).map((op) => (
            <button
              key={op}
              onClick={() => {
                const expr = config.conditions.map(c => `${c.field} ${c.op} ${c.value}`).join(` ${op} `);
                onChange({ operator: op, expression: expr });
              }}
              className={`flex-1 py-1.5 rounded text-[10px] font-space uppercase tracking-widest transition ${config.operator === op ? 'bg-red/20 text-red border border-red/30' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'}`}
            >
              {op}
            </button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Conditions">
        <div className="space-y-2">
          {config.conditions.map((c, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input
                type="text"
                value={c.field}
                onChange={(e) => updateCondition(i, 'field', e.target.value)}
                placeholder="field"
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white font-mono focus:border-red/50 focus:outline-none transition"
              />
              <select
                value={c.op}
                onChange={(e) => updateCondition(i, 'op', e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-1 py-1 text-[10px] text-white font-mono focus:border-red/50 focus:outline-none transition"
              >
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value="==">==</option>
                <option value="!=">!=</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
              </select>
              <input
                type="text"
                value={c.value}
                onChange={(e) => updateCondition(i, 'value', e.target.value)}
                placeholder="value"
                className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white font-mono focus:border-red/50 focus:outline-none transition"
              />
              <button
                onClick={() => {
                  const newConditions = config.conditions.filter((_, j) => j !== i);
                  const expr = newConditions.map(c2 => `${c2.field} ${c2.op} ${c2.value}`).join(` ${config.operator} `);
                  onChange({ conditions: newConditions, expression: expr });
                }}
                className="text-red/50 hover:text-red text-[11px] transition"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newConditions = [...config.conditions, { field: 'field', op: '>', value: '0' }];
              const expr = newConditions.map(c => `${c.field} ${c.op} ${c.value}`).join(` ${config.operator} `);
              onChange({ conditions: newConditions, expression: expr });
            }}
            className="text-[10px] text-red/60 hover:text-red transition font-space"
          >
            + Add Condition
          </button>
        </div>
      </FieldGroup>
      <div className="bg-black/40 border border-white/5 rounded p-2 text-[9px] font-mono text-white/50">
        {config.expression || '(empty)'}
      </div>
    </div>
  );
}
