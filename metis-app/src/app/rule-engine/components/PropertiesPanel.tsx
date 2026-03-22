"use client";
import React from "react";
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

const DATA_CONNECTORS = [
  { id: 'Bankitalia', label: 'C.R. Bankitalia', latency: '2.4s', status: 'live', icon: '🏛️' },
  { id: 'XBRL', label: 'Bilancio XBRL (Europa)', latency: '1.1s', status: 'live', icon: '📊' },
  { id: 'Cerved', label: 'Cerved Group APIs', latency: '-', status: 'config', icon: '🔍' },
  { id: 'NLP', label: 'Web NLP / Nowcasting', latency: '3.2s', status: 'live', icon: '📰' },
  { id: 'ESG', label: 'ESG Provider Level 2', latency: '-', status: 'inactive', icon: '🌱' },
];

function DataIngestionEditor({ config, onChange }: { config: DataIngestionConfig; onChange: (p: Record<string, unknown>) => void }) {
  const toggleSource = (conn: typeof DATA_CONNECTORS[0], currentSources: string[]) => {
    const isActive = currentSources.some(s => s.toLowerCase().includes(conn.id.toLowerCase()));
    if (isActive) {
      onChange({ sources: currentSources.filter(s => !s.toLowerCase().includes(conn.id.toLowerCase())) });
    } else {
      onChange({ sources: [...currentSources, conn.label] });
    }
  };

  return (
    <div className="space-y-4">
      <FieldGroup label="Connector Catalog">
        <div className="space-y-2">
          {DATA_CONNECTORS.map(conn => {
            const isActive = config.sources.some(s => s.toLowerCase().includes(conn.id.toLowerCase()));
            
            return (
              <div 
                key={conn.id} 
                onClick={() => toggleSource(conn, config.sources)}
                className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${isActive ? 'bg-cyan/10 border-cyan/30 shadow-[0_0_15px_rgba(0,229,255,0.05)] hover:border-cyan/50' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${isActive ? 'bg-cyan/20 border border-cyan/30 shadow-[0_0_10px_rgba(0,229,255,0.2)]' : 'bg-black/40 grayscale opacity-60 border border-white/10'}`}>
                    {conn.icon}
                  </div>
                  <div>
                    <div className={`text-[11px] font-space font-bold ${isActive ? 'text-white' : 'text-white/60'}`}>
                      {conn.label}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`flex items-center gap-1 text-[8px] uppercase tracking-widest font-bold font-mono ${isActive ? (conn.status === 'live' ? 'text-green' : conn.status === 'config' ? 'text-yellow' : 'text-red') : 'text-white/30'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? (conn.status === 'live' ? 'bg-green animate-pulse shadow-[0_0_5px_var(--color-green)]' : conn.status === 'config' ? 'bg-yellow shadow-[0_0_5px_var(--color-yellow)]' : 'bg-red shadow-[0_0_5px_var(--color-red)]') : 'bg-white/20'}`} />
                        {isActive ? conn.status : 'disconnected'}
                      </span>
                      {isActive && conn.status === 'live' && (
                        <>
                          <span className="text-white/20">•</span>
                          <span className="text-[9px] text-cyan font-mono">{conn.latency}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full relative transition-colors border ${isActive ? 'bg-cyan/20 border-cyan/40' : 'bg-black/60 border-white/10'}`}>
                  <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${isActive ? 'left-4.5 bg-cyan shadow-[0_0_8px_var(--color-cyan)]' : 'left-0.5 bg-white/30'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </FieldGroup>

      <div className="border-t border-white/10 pt-4 space-y-4">
        <SliderField label="Data Quality Threshold" value={config.dataQualityThreshold} min={0} max={100} step={1} unit="%" color="#00E5FF" onChange={(v) => onChange({ dataQualityThreshold: v })} />
        <SliderField label="Refresh Interval" value={config.refreshInterval} min={5} max={1440} step={5} unit=" min" color="#00E5FF" onChange={(v) => onChange({ refreshInterval: v })} />
      </div>
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

const RULE_METRICS = [
  { id: 'ebitda_margin', label: 'EBITDA Margin (%)', group: 'Bilancio' },
  { id: 'leverage', label: 'Debt / Equity', group: 'Bilancio' },
  { id: 'dscr', label: 'DSCR (Prospettico)', group: 'Finanziario' },
  { id: 'pd', label: 'Prob. Default (PD)', group: 'Modelli AI' },
  { id: 'z_score', label: 'Altman Z-Score', group: 'Modelli AI' },
  { id: 'sconfinamenti', label: 'Sconfinamenti (Giorni)', group: 'Centrale Rischi' },
  { id: 'cr_uitl', label: ' CR Utilizzato (%)', group: 'Centrale Rischi' },
  { id: 'esg_score', label: 'ESG Risk Score', group: 'Qualitativo' },
];

function CustomRuleEditor({ config, onChange }: { config: CustomRuleConfig; onChange: (p: Record<string, unknown>) => void }) {
  const updateCondition = (index: number, field: keyof CustomRuleConfig["conditions"][0], value: string) => {
    const newConditions = [...config.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    // Rebuild expression logically
    const expr = newConditions.map(c => {
      const metricLabel = RULE_METRICS.find(m => m.id === c.field)?.label || c.field;
      return `[${metricLabel}] ${c.op} ${c.value}`;
    }).join(` ${config.operator} `);
    onChange({ conditions: newConditions, expression: expr });
  };

  return (
    <div className="space-y-4">
      <FieldGroup label="Logical Operator (Global)">
        <div className="flex bg-black/40 border border-white/10 rounded-lg overflow-hidden p-1">
          {(['AND', 'OR', 'NOT'] as const).map((op) => (
            <button
              key={op}
              onClick={() => {
                const expr = config.conditions.map(c => `[${RULE_METRICS.find(m => m.id === c.field)?.label || c.field}] ${c.op} ${c.value}`).join(` ${op} `);
                onChange({ operator: op, expression: expr });
              }}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-space uppercase tracking-widest transition-all ${config.operator === op ? 'bg-red/20 text-red shadow-[0_0_10px_rgba(255,0,85,0.2)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              {op}
            </button>
          ))}
        </div>
      </FieldGroup>
      
      <FieldGroup label="Rule Conditions">
        <div className="space-y-2.5">
          {config.conditions.map((c, i) => (
            <div key={i} className="flex flex-col gap-1.5 bg-white/5 border border-white/10 rounded-lg p-2.5 relative group hover:border-red/30 transition">
              <button
                onClick={() => {
                  const newConditions = config.conditions.filter((_, j) => j !== i);
                  const expr = newConditions.map(c2 => `[${RULE_METRICS.find(m => m.id === c2.field)?.label || c2.field}] ${c2.op} ${c2.value}`).join(` ${config.operator} `);
                  onChange({ conditions: newConditions, expression: expr });
                }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow-[0_0_10px_rgba(255,0,85,0.4)]"
              >
                ×
              </button>

              <select
                value={c.field}
                onChange={(e) => updateCondition(i, 'field', e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded px-2 py-1.5 text-[11px] text-cyan font-bold focus:border-cyan/50 focus:outline-none transition appearance-none"
              >
                <option value="score" disabled>Seleziona metrica...</option>
                {RULE_METRICS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.group} • {m.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-1.5">
                <select
                  value={c.op}
                  onChange={(e) => updateCondition(i, 'op', e.target.value)}
                  className="w-16 bg-black/40 border border-white/5 rounded px-2 py-1 text-[11px] text-yellow font-mono font-bold focus:border-yellow/50 focus:outline-none transition appearance-none text-center"
                >
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="==">==</option>
                  <option value="!=">!=</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                  <option value="CONTAINS">IN</option>
                </select>
                <input
                  type="text"
                  value={c.value}
                  onChange={(e) => updateCondition(i, 'value', e.target.value)}
                  placeholder="Valore soglia"
                  className="flex-1 bg-black/40 border border-white/5 rounded px-2 py-1 text-[11px] text-white font-mono focus:border-purple/50 focus:outline-none transition"
                />
              </div>
            </div>
          ))}
          
          <button
            onClick={() => {
              const newConditions = [...config.conditions, { field: 'dscr', op: '<', value: '1.1' }];
              const expr = newConditions.map(c => `[${RULE_METRICS.find(m => m.id === c.field)?.label || c.field}] ${c.op} ${c.value}`).join(` ${config.operator} `);
              onChange({ conditions: newConditions, expression: expr });
            }}
            className="w-full py-2 border border-dashed border-white/20 rounded-lg text-[10px] text-white/40 hover:text-white/80 hover:border-white/40 hover:bg-white/5 transition font-space uppercase tracking-widest flex items-center justify-center gap-1.5"
          >
            <span className="text-red font-bold text-lg leading-none mb-0.5">+</span> ADD CONDITION
          </button>
        </div>
      </FieldGroup>

      <FieldGroup label="Generated Logic Payload">
        <div className="bg-black/40 border border-white/5 rounded-lg p-3 text-[10px] font-mono leading-relaxed break-words shadow-inner">
          {config.expression ? (
            config.expression.split(` ${config.operator} `).map((part, i, arr) => (
              <React.Fragment key={i}>
                <span className="text-cyan">{part.split(' ')[0]}</span>
                <span className="text-yellow font-bold mx-1">{part.split(' ')[1]}</span>
                <span className="text-purple">{part.split(' ').slice(2).join(' ')}</span>
                {i < arr.length - 1 && <span className="text-red font-bold mx-2">{config.operator}</span>}
              </React.Fragment>
            ))
          ) : (
            <span className="text-white/20">{'// Nessuna condizione definita'}</span>
          )}
        </div>
      </FieldGroup>
    </div>
  );
}
