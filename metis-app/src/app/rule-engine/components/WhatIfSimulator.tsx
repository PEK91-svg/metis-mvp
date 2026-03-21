"use client";
import React, { useState, useCallback } from "react";
import { Node, Edge } from "reactflow";
import {
  RuleNodeData,
  SimulationResult,
  DataIngestionConfig,
  FraudDetectionConfig,
  AIScoringConfig,
  DecisionConfig,
  CustomRuleConfig,
} from "./types";

interface WhatIfSimulatorProps {
  nodes: Node<RuleNodeData>[];
  edges: Edge[];
}

// Champion baseline — the "current production" benchmark
const CHAMPION: SimulationResult = {
  approvalRate: 65.0,
  defaultRate: 3.2,
  fairLendingScore: 45,
  avgProcessingTime: 4.2,
  falsePositiveRate: 2.8,
  totalApplications: 10000,
  approved: 6500,
  rejected: 2800,
  manualReview: 700,
};

/**
 * Core simulation engine — computes expected metrics from the node graph.
 * This is a deterministic model, NOT random or fixed-increment.
 *
 * The model traverses the node graph and computes the expected impact
 * of each node's configuration on the output metrics.
 */
function runSimulation(nodes: Node<RuleNodeData>[], edges: Edge[]): SimulationResult {
  const activeNodes = nodes.filter((n) => n.data.active);
  const total = 10000;

  // ---- Gather configs from active nodes ----
  const ingestionNodes = activeNodes.filter((n) => n.data.type === 'dataIngestion');
  const fraudNodes = activeNodes.filter((n) => n.data.type === 'fraudDetection');
  const scoringNodes = activeNodes.filter((n) => n.data.type === 'aiScoring');
  const decisionNodes = activeNodes.filter((n) => n.data.type === 'decision');
  const customNodes = activeNodes.filter((n) => n.data.type === 'customRule');

  // 1. Data Quality Factor — higher quality → better scoring accuracy
  let dataQualityFactor = 0.85; // baseline
  for (const n of ingestionNodes) {
    const cfg = n.data.config as DataIngestionConfig;
    // More sources and higher quality threshold improve accuracy
    const sourceFactor = Math.min(1, cfg.sources.length / 5);
    const qualityFactor = cfg.dataQualityThreshold / 100;
    dataQualityFactor = Math.max(dataQualityFactor, sourceFactor * 0.3 + qualityFactor * 0.7);
  }

  // 2. Fraud Detection — impacts false positive rate and filtering
  let fraudFilterRate = 0.05; // % of apps flagged as fraud (blocked)
  let falsePositiveRate = 2.8; // baseline
  for (const n of fraudNodes) {
    const cfg = n.data.config as FraudDetectionConfig;
    // Lower false positive limit → more precise → fewer wrongly blocked
    falsePositiveRate = cfg.falsePositiveLimit;
    // Model precision: ensemble > autoencoder > isolation_forest
    const modelPrecision = cfg.anomalyModel === 'ensemble' ? 0.92 : cfg.anomalyModel === 'autoencoder' ? 0.85 : 0.78;
    // Higher block threshold → fewer blocked
    fraudFilterRate = (1 - cfg.blockThreshold) * (1 - modelPrecision) + 0.02;
    // OCR improves detection by reducing document fraud
    if (cfg.ocrEnabled) fraudFilterRate *= 0.85;
  }

  // 3. AI Scoring — determines approval/reject thresholds
  let approvalThreshold = 65;
  let rejectThreshold = 35;
  let fairBoostBonus = 0;
  let weightBalance = 1.0;
  for (const n of scoringNodes) {
    const cfg = n.data.config as AIScoringConfig;
    approvalThreshold = cfg.approvalThreshold;
    rejectThreshold = cfg.rejectThreshold;
    // FairBoost improves fair lending and slightly increases approval
    if (cfg.fairBoostEnabled) fairBoostBonus = 15;
    // Weight balance: how well-diversified are the weights
    const totalWeight = cfg.weights.reduce((s, w) => s + w.value, 0);
    const maxWeight = Math.max(...cfg.weights.map((w) => w.value));
    weightBalance = totalWeight > 0 ? 1 - (maxWeight / totalWeight - 1 / cfg.weights.length) : 0.5;
  }

  // 4. Decision nodes — modify final routing
  let autoApproveRate = 0;
  let maxExposureFactor = 1;
  for (const n of decisionNodes) {
    const cfg = n.data.config as DecisionConfig;
    if (cfg.action === 'approve' && cfg.autoExecute) autoApproveRate += 0.1;
    if (cfg.action === 'manual_review') autoApproveRate -= 0.05;
    maxExposureFactor = Math.min(maxExposureFactor, cfg.maxExposure / 500000);
  }

  // 5. Custom Rules — each condition tightens or loosens the filter
  let customAdjustment = 0;
  for (const n of customNodes) {
    const cfg = n.data.config as CustomRuleConfig;
    // Each condition slightly tightens approval (more rules = more conservative)
    customAdjustment -= cfg.conditions.length * 0.8;
  }

  // ---- Compute final metrics ----

  // Approval rate: based on threshold gap + data quality + fraud + custom rules
  const thresholdGap = (100 - approvalThreshold) / 100; // lower threshold → more approvals
  const baseApproval = 50 + thresholdGap * 35 * dataQualityFactor;
  const approvalRate = Math.max(20, Math.min(95,
    baseApproval
    + autoApproveRate * 10
    + fairBoostBonus * 0.3
    + customAdjustment
    - fraudFilterRate * 100
    + (maxExposureFactor - 0.5) * 5
  ));

  // Default rate: lower threshold → higher default rate (approving riskier apps)
  const baseDefault = 1.5 + (1 - approvalThreshold / 100) * 3;
  const defaultRate = Math.max(0.5, Math.min(8,
    baseDefault
    - dataQualityFactor * 0.5
    - (fraudNodes.length > 0 ? 0.3 : 0)
    + (autoApproveRate > 0 ? 0.2 : 0)
    - weightBalance * 0.4
  ));

  // Fair Lending Score: 0-100
  const fairLendingScore = Math.max(10, Math.min(100,
    40 + fairBoostBonus * 2.5
    + dataQualityFactor * 15
    + weightBalance * 10
    - (fraudFilterRate > 0.05 ? 10 : 0) // over-filtering hurts fairness
    + (ingestionNodes.length > 1 ? 5 : 0) // multiple data sources = better
  ));

  // Processing time: more nodes = longer, but parallel paths (edges) help
  const nodeCount = activeNodes.length;
  const edgeCount = edges.length;
  const parallelFactor = edgeCount > nodeCount ? 0.8 : 1;
  const avgProcessingTime = Math.max(0.5, (1.5 + nodeCount * 0.5) * parallelFactor);

  // Counts
  const approved = Math.round(total * approvalRate / 100);
  const manualReview = Math.round(total * (approvalThreshold - rejectThreshold) / 200 * 0.3);
  const rejected = total - approved - manualReview;

  return {
    approvalRate: Math.round(approvalRate * 10) / 10,
    defaultRate: Math.round(defaultRate * 100) / 100,
    fairLendingScore: Math.round(fairLendingScore),
    avgProcessingTime: Math.round(avgProcessingTime * 10) / 10,
    falsePositiveRate: Math.round(falsePositiveRate * 10) / 10,
    totalApplications: total,
    approved: Math.max(0, approved),
    rejected: Math.max(0, rejected),
    manualReview: Math.max(0, manualReview),
  };
}

export default function WhatIfSimulator({ nodes, edges }: WhatIfSimulatorProps) {
  const [simRunning, setSimRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [animatedResult, setAnimatedResult] = useState<SimulationResult>(CHAMPION);

  const runSim = useCallback(() => {
    setSimRunning(true);
    const target = runSimulation(nodes, edges);
    setResult(target);

    // Animate from current to target
    const steps = 20;
    const duration = 1500;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      // Ease-out
      const ease = 1 - Math.pow(1 - progress, 3);

      setAnimatedResult((prev) => ({
        approvalRate: Math.round((CHAMPION.approvalRate + (target.approvalRate - CHAMPION.approvalRate) * ease) * 10) / 10,
        defaultRate: Math.round((CHAMPION.defaultRate + (target.defaultRate - CHAMPION.defaultRate) * ease) * 100) / 100,
        fairLendingScore: Math.round(CHAMPION.fairLendingScore + (target.fairLendingScore - CHAMPION.fairLendingScore) * ease),
        avgProcessingTime: Math.round((CHAMPION.avgProcessingTime + (target.avgProcessingTime - CHAMPION.avgProcessingTime) * ease) * 10) / 10,
        falsePositiveRate: Math.round((CHAMPION.falsePositiveRate + (target.falsePositiveRate - CHAMPION.falsePositiveRate) * ease) * 10) / 10,
        totalApplications: target.totalApplications,
        approved: Math.round(CHAMPION.approved + (target.approved - CHAMPION.approved) * ease),
        rejected: Math.round(CHAMPION.rejected + (target.rejected - CHAMPION.rejected) * ease),
        manualReview: Math.round(CHAMPION.manualReview + (target.manualReview - CHAMPION.manualReview) * ease),
      }));

      if (step >= steps) {
        clearInterval(timer);
        setSimRunning(false);
        setAnimatedResult(target);
      }
    }, interval);
  }, [nodes, edges]);

  const challenger = animatedResult;
  const hasRun = result !== null;

  return (
    <div className="w-[380px] border-l border-white/10 bg-[rgba(14,21,33,0.95)] backdrop-blur-2xl flex flex-col z-20">
      {/* Header */}
      <div className="p-5 border-b border-white/10 bg-black/20">
        <h2 className="font-space text-sm font-semibold tracking-widest text-white flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${simRunning ? 'bg-green animate-pulse shadow-[0_0_8px_var(--color-green)]' : hasRun ? 'bg-cyan shadow-[0_0_8px_var(--color-cyan)]' : 'bg-white/30'}`} />
          WHAT-IF SIMULATOR
        </h2>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
          {simRunning ? 'Simulazione in corso...' : hasRun ? 'Simulazione completata — Challenger vs Champion' : 'Comparativa su dataset storico 2024-2025.'}
        </p>
      </div>

      <div className="p-5 flex-1 overflow-y-auto space-y-4">
        {/* Run button */}
        <button
          onClick={runSim}
          disabled={simRunning}
          className={`w-full py-2.5 rounded-lg font-space font-bold uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2
            ${simRunning
              ? 'bg-purple/20 text-purple/60 border border-purple/20 cursor-wait'
              : 'bg-purple text-white hover:bg-purple/80 hover:shadow-[0_0_20px_rgba(123,44,191,0.5)] shadow-[0_0_15px_rgba(123,44,191,0.3)] border border-purple/50'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {simRunning ? 'SIMULAZIONE IN CORSO...' : 'RUN SIMULATION vs CHAMPION'}
        </button>

        {/* Approval Rate */}
        <MetricCard
          title="Approval Rate"
          champion={CHAMPION.approvalRate}
          challenger={challenger.approvalRate}
          unit="%"
          colorVar="cyan"
          isRunning={simRunning}
          higherIsBetter={true}
        />

        {/* Default Rate */}
        <MetricCard
          title="Expected Default Rate"
          champion={CHAMPION.defaultRate}
          challenger={challenger.defaultRate}
          unit="%"
          colorVar="purple"
          isRunning={simRunning}
          higherIsBetter={false}
        />

        {/* Fair Lending Score */}
        <div className="border border-white/10 rounded-xl p-4 bg-white/5 relative">
          <div className="flex justify-between items-center mb-4">
            <div className="text-[10px] text-[var(--color-text-muted)] font-space tracking-widest uppercase">
              Fair Lending Score
            </div>
            <span className="text-[8px] bg-cyan/10 border border-cyan/30 text-cyan px-2 py-0.5 rounded-full uppercase tracking-wider">
              EU AI Act
            </span>
          </div>
          <div className="mb-2 flex justify-between font-space text-[11px]">
            <span className="text-white/50">Champion: {CHAMPION.fairLendingScore}/100</span>
            <span className="text-cyan font-bold">Challenger: {challenger.fairLendingScore}/100</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 bottom-0 bg-white/30 transition-all duration-500" style={{ width: `${CHAMPION.fairLendingScore}%` }} />
            <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-cyan to-purple transition-all duration-500" style={{ width: `${challenger.fairLendingScore}%` }} />
          </div>
          <p className="mt-3 text-[10px] text-[var(--color-text-muted)] leading-relaxed border-l border-cyan/50 pl-2">
            {challenger.fairLendingScore > 80
              ? 'Il Challenger supera la soglia EU AI Act. De-biasing FairBoost™ attivo su features socio-demografiche.'
              : challenger.fairLendingScore > CHAMPION.fairLendingScore
                ? 'Miglioramento rispetto al Champion. Valutare attivazione FairBoost™ per compliance piena.'
                : 'Score insufficiente. Attivare FairBoost™ e diversificare le data sources.'}
          </p>
        </div>

        {/* Processing Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MiniMetric label="Avg Process Time" value={`${challenger.avgProcessingTime}s`} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>} />
          <MiniMetric label="False Positive Rate" value={`${challenger.falsePositiveRate}%`} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>} />
          <MiniMetric label="Manual Review" value={`${challenger.manualReview}`} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>} />
          <MiniMetric label="Total Processed" value={`${(challenger.totalApplications / 1000).toFixed(0)}K`} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>} />
        </div>

        {/* Distribution bar */}
        {hasRun && (
          <div className="border border-white/10 rounded-xl p-4 bg-white/5">
            <div className="text-[10px] text-[var(--color-text-muted)] font-space tracking-widest uppercase mb-3">
              Application Distribution
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden flex">
              <div className="bg-green transition-all duration-500" style={{ width: `${(challenger.approved / challenger.totalApplications) * 100}%` }} />
              <div className="bg-yellow transition-all duration-500" style={{ width: `${(challenger.manualReview / challenger.totalApplications) * 100}%` }} />
              <div className="bg-red transition-all duration-500" style={{ width: `${(challenger.rejected / challenger.totalApplications) * 100}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-space">
              <span className="text-green">Approved: {challenger.approved}</span>
              <span className="text-yellow">Review: {challenger.manualReview}</span>
              <span className="text-red">Rejected: {challenger.rejected}</span>
            </div>
          </div>
        )}
      </div>

      {/* Deploy button */}
      <div className="p-5 border-t border-white/10 bg-black/40">
        <button
          className={`w-full py-3 rounded-lg font-space font-bold uppercase tracking-widest text-[11px] transition-all shadow-xl
            ${hasRun && challenger.approvalRate > CHAMPION.approvalRate && challenger.defaultRate <= CHAMPION.defaultRate
              ? 'bg-gradient-to-r from-green to-[rgba(0,255,102,0.6)] text-black shadow-[0_0_20px_rgba(0,255,102,0.4)]'
              : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'}`}
          disabled={!hasRun || challenger.approvalRate <= CHAMPION.approvalRate || challenger.defaultRate > CHAMPION.defaultRate}
        >
          Deploy to Production
        </button>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function MetricCard({
  title, champion, challenger, unit, colorVar, isRunning, higherIsBetter,
}: {
  title: string; champion: number; challenger: number; unit: string;
  colorVar: string; isRunning: boolean; higherIsBetter: boolean;
}) {
  const diff = challenger - champion;
  const improved = higherIsBetter ? diff > 0 : diff < 0;

  return (
    <div className={`border border-white/10 rounded-xl p-4 bg-white/5 relative overflow-hidden group hover:border-${colorVar}/50 transition`}>
      {isRunning && <div className={`absolute inset-0 bg-${colorVar}/5 animate-pulse`} />}
      <div className="text-[10px] text-[var(--color-text-muted)] font-space tracking-widest uppercase mb-4 relative z-10">{title}</div>
      <div className="flex items-end justify-between relative z-10">
        <div>
          <div className="text-[10px] text-white/40 mb-1">Champion</div>
          <div className="font-space text-xl text-white/70">
            {champion.toFixed(unit === '%' && champion < 10 ? 2 : 1)}{unit}
          </div>
        </div>
        <div>
          <div className={`text-[10px] text-${colorVar} mb-1 flex justify-end`}>Challenger</div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${improved ? 'bg-green/20 text-green border border-green/30' : diff !== 0 ? 'bg-red/20 text-red border border-red/30' : 'bg-white/10 text-white/40 border border-white/10'}`}>
              {diff > 0 ? '+' : ''}{diff.toFixed(unit === '%' && Math.abs(diff) < 1 ? 2 : 1)}{unit}
            </span>
            <div className={`font-space text-3xl font-bold text-${colorVar} drop-shadow-[0_0_8px_${colorVar === 'cyan' ? 'rgba(0,229,255,0.5)' : 'rgba(123,44,191,0.5)'}]`}>
              {challenger.toFixed(unit === '%' && challenger < 10 ? 2 : 1)}{unit}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-white/10 rounded-lg p-3 bg-white/5">
      <div className="text-[9px] text-[var(--color-text-muted)] font-space tracking-widest uppercase mb-1">{label}</div>
      <div className="flex items-center gap-1.5">
        <span>{icon}</span>
        <span className="font-space text-base font-bold text-white">{value}</span>
      </div>
    </div>
  );
}
