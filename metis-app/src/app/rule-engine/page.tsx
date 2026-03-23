"use client";
import { useState, useCallback, useEffect } from "react";
import { Node, Edge, useNodesState, useEdgesState } from "reactflow";
import Sidebar from "@/components/Sidebar";
import FlowCanvas from "./components/FlowCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import WhatIfSimulator from "./components/WhatIfSimulator";
import {
  RuleNodeData,
  getDefaultConfig,
} from "./components/types";

// ============================================================================
// Policy Type
// ============================================================================
interface Policy {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "archived";
  version: string;
  updatedAt: string;
  createdAt: string;
  nodes: Node<RuleNodeData>[];
  edges: Edge[];
}

// ============================================================================
// Preset pipelines
// ============================================================================
const DEFAULT_NODES: Node<RuleNodeData>[] = [
  {
    id: "ingestion-1", type: "ruleNode", position: { x: 50, y: 150 },
    data: { label: "Data Ingestion", type: "dataIngestion", description: "C.R. Bankitalia, Bilancio XBRL, Cerved APIs", config: getDefaultConfig("dataIngestion"), active: true },
  },
  {
    id: "fraud-1", type: "ruleNode", position: { x: 380, y: 80 },
    data: { label: "Zest Protect™ Fraud", type: "fraudDetection", description: "ML Anomaly Detection su OCR", config: { falsePositiveLimit: 1.4, anomalyModel: "ensemble" as const, blockThreshold: 0.85, ocrEnabled: true }, active: true },
  },
  {
    id: "scoring-1", type: "ruleNode", position: { x: 380, y: 280 },
    data: { label: "Metis AI Scoring", type: "aiScoring", description: "FairBoost Enabled · Multi-factor Model", config: getDefaultConfig("aiScoring"), active: true },
  },
  {
    id: "decision-approve", type: "ruleNode", position: { x: 750, y: 100 },
    data: { label: "Auto Approve", type: "decision", description: "Score > 65 → Approve with signoff", config: { action: "approve" as const, autoExecute: false, maxExposure: 500000, requiresSignoff: true }, active: true },
  },
  {
    id: "decision-reject", type: "ruleNode", position: { x: 750, y: 350 },
    data: { label: "Reject / Escalate", type: "decision", description: "Score < 35 → Reject", config: { action: "reject" as const, autoExecute: true, maxExposure: 0, requiresSignoff: false }, active: true },
  },
];

const DEFAULT_EDGES: Edge[] = [
  { id: "e-ingestion-fraud", source: "ingestion-1", target: "fraud-1", animated: true, style: { stroke: "rgba(0,229,255,0.4)", strokeWidth: 2 }, type: "smoothstep" },
  { id: "e-ingestion-scoring", source: "ingestion-1", target: "scoring-1", animated: true, style: { stroke: "rgba(0,229,255,0.4)", strokeWidth: 2 }, type: "smoothstep" },
  { id: "e-fraud-scoring", source: "fraud-1", target: "scoring-1", animated: true, style: { stroke: "rgba(250,204,21,0.4)", strokeWidth: 2 }, type: "smoothstep" },
  { id: "e-scoring-approve", source: "scoring-1", target: "decision-approve", animated: true, style: { stroke: "rgba(0,255,102,0.4)", strokeWidth: 2 }, type: "smoothstep" },
  { id: "e-scoring-reject", source: "scoring-1", target: "decision-reject", animated: true, style: { stroke: "rgba(255,0,85,0.4)", strokeWidth: 2 }, type: "smoothstep" },
];

// ============================================================================
// Mock saved policies
// ============================================================================
const MOCK_POLICIES: Policy[] = [
  {
    id: "pol-1", name: "SME Lending v2.4", description: "Policy standard per PMI — scoring multi-fattoriale con FairBoost",
    status: "active", version: "2.4", updatedAt: "2025-03-18", createdAt: "2024-11-01",
    nodes: DEFAULT_NODES, edges: DEFAULT_EDGES,
  },
  {
    id: "pol-2", name: "Corporate Large Cap", description: "Policy per grandi imprese — soglia PD conservativa, doppia firma",
    status: "draft", version: "1.0", updatedAt: "2025-03-15", createdAt: "2025-03-10",
    nodes: [
      { id: "ing-1", type: "ruleNode", position: { x: 50, y: 150 }, data: { label: "Data Ingestion", type: "dataIngestion", description: "Bilancio XBRL, Cerved, Bloomberg", config: getDefaultConfig("dataIngestion"), active: true } },
      { id: "scr-1", type: "ruleNode", position: { x: 400, y: 150 }, data: { label: "Corporate Scoring", type: "aiScoring", description: "PD < 1% threshold", config: { ...getDefaultConfig("aiScoring"), approvalThreshold: 80, rejectThreshold: 50 } as any, active: true } },
      { id: "dec-1", type: "ruleNode", position: { x: 750, y: 150 }, data: { label: "Dual Signoff", type: "decision", description: "Requires 2 approvals", config: { action: "approve" as const, autoExecute: false, maxExposure: 5000000, requiresSignoff: true }, active: true } },
    ],
    edges: [
      { id: "e1", source: "ing-1", target: "scr-1", animated: true, style: { stroke: "rgba(0,229,255,0.4)", strokeWidth: 2 }, type: "smoothstep" },
      { id: "e2", source: "scr-1", target: "dec-1", animated: true, style: { stroke: "rgba(0,255,102,0.4)", strokeWidth: 2 }, type: "smoothstep" },
    ],
  },
  {
    id: "pol-3", name: "Micro-credito Agevolato", description: "Policy semplificata per micro-imprese < €50K",
    status: "archived", version: "3.1", updatedAt: "2025-02-20", createdAt: "2024-06-15",
    nodes: [
      { id: "ing-m", type: "ruleNode", position: { x: 50, y: 150 }, data: { label: "Light Ingestion", type: "dataIngestion", description: "Solo Visura + CR", config: { sources: ["Visura Camerale", "C.R. Bankitalia"], refreshInterval: 120, dataQualityThreshold: 70 }, active: true } },
      { id: "dec-m", type: "ruleNode", position: { x: 400, y: 150 }, data: { label: "Fast Approve", type: "decision", description: "Auto-approve < €50K", config: { action: "approve" as const, autoExecute: true, maxExposure: 50000, requiresSignoff: false }, active: true } },
    ],
    edges: [
      { id: "em1", source: "ing-m", target: "dec-m", animated: true, style: { stroke: "rgba(0,229,255,0.4)", strokeWidth: 2 }, type: "smoothstep" },
    ],
  },
];

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  active:   { bg: "bg-green/10",  border: "border-green/30",  text: "text-green",  label: "Attiva" },
  draft:    { bg: "bg-yellow/10", border: "border-yellow/30", text: "text-yellow", label: "Bozza" },
  archived: { bg: "bg-white/5",   border: "border-white/10",  text: "text-white/40", label: "Archiviata" },
};

// ============================================================================
// Page Component
// ============================================================================
export default function RuleEngine() {
  const [policies, setPolicies] = useState<Policy[]>(MOCK_POLICIES);
  const [currentPolicy, setCurrentPolicy] = useState<Policy | null>(null);
  const [view, setView] = useState<"list" | "editor">("list");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyDesc, setNewPolicyDesc] = useState("");
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    if (!saveFlash) return;
    const t = setTimeout(() => setSaveFlash(false), 1500);
    return () => clearTimeout(t);
  }, [saveFlash]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(currentPolicy?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentPolicy?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node<RuleNodeData> | null>(null);
  const [rightPanel, setRightPanel] = useState<"simulator" | "properties">("simulator");

  // Sync nodes/edges when switching policy
  const loadPolicy = useCallback((policy: Policy) => {
    setCurrentPolicy(policy);
    setNodes(policy.nodes);
    setEdges(policy.edges);
    setSelectedNode(null);
    setRightPanel("simulator");
    setView("editor");
  }, [setNodes, setEdges]);

  // Save current policy
  const savePolicy = useCallback(() => {
    if (!currentPolicy) return;
    const updated: Policy = {
      ...currentPolicy,
      nodes: nodes,
      edges: edges,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    setPolicies(prev => prev.map(p => p.id === updated.id ? updated : p));
    setCurrentPolicy(updated);
    setSaveFlash(true);
  }, [currentPolicy, nodes, edges]);

  // Create new policy
  const createPolicy = useCallback(() => {
    if (!newPolicyName.trim()) return;
    const newPolicy: Policy = {
      id: `pol-${Date.now()}`,
      name: newPolicyName.trim(),
      description: newPolicyDesc.trim() || "Nuova policy",
      status: "draft",
      version: "1.0",
      updatedAt: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString().split("T")[0],
      nodes: [],
      edges: [],
    };
    setPolicies(prev => [...prev, newPolicy]);
    loadPolicy(newPolicy);
    setShowNewModal(false);
    setNewPolicyName("");
    setNewPolicyDesc("");
  }, [newPolicyName, newPolicyDesc, loadPolicy]);

  // Delete policy
  const deletePolicy = useCallback((id: string) => {
    setPolicies(prev => prev.filter(p => p.id !== id));
    if (currentPolicy?.id === id) {
      setCurrentPolicy(null);
      setView("list");
    }
    setDeleteConfirm(null);
  }, [currentPolicy]);

  // Duplicate policy
  const duplicatePolicy = useCallback((policy: Policy) => {
    const dup: Policy = {
      ...policy,
      id: `pol-${Date.now()}`,
      name: `${policy.name} (copia)`,
      status: "draft",
      version: "1.0",
      updatedAt: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setPolicies(prev => [...prev, dup]);
    loadPolicy(dup);
  }, [loadPolicy]);

  // Toggle policy status
  const toggleStatus = useCallback((id: string, newStatus: Policy["status"]) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, updatedAt: new Date().toISOString().split("T")[0] } : p));
    if (currentPolicy?.id === id) {
      setCurrentPolicy(prev => prev ? { ...prev, status: newStatus } : null);
    }
  }, [currentPolicy]);

  // Node handlers
  const onNodeSelect = useCallback((node: Node<RuleNodeData> | null) => {
    setSelectedNode(node);
    if (node) setRightPanel("properties");
  }, []);

  const onUpdateNode = useCallback((id: string, partialData: Partial<RuleNodeData>) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        const updatedData = { ...n.data, ...partialData };
        setSelectedNode(prev => prev && prev.id === id ? { ...prev, data: updatedData } : prev);
        return { ...n, data: updatedData };
      }
      return n;
    }));
  }, [setNodes]);

  const onDeleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedNode(null);
    setRightPanel("simulator");
  }, [setNodes, setEdges]);

  const ss = currentPolicy ? STATUS_STYLE[currentPolicy.status] : STATUS_STYLE.draft;

  const policyCounts = {
    active: policies.filter(p => p.status === "active").length,
    draft: policies.filter(p => p.status === "draft").length,
    archived: policies.filter(p => p.status === "archived").length,
  };

  const renderPolicyCard = (p: Policy, size: "large" | "compact" = "compact") => {
    const ps = STATUS_STYLE[p.status];
    const isCurrent = currentPolicy?.id === p.id;
    const isLarge = size === "large";
    return (
      <div key={p.id} className={`glass-panel border group transition-all duration-300 ${isLarge ? "p-5" : "p-3"} ${isCurrent && view === "editor" ? "border-cyan/40 bg-cyan/10" : "border-white/10 hover:border-cyan/30 hover:bg-white/[0.04]"}`}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => loadPolicy(p)} className="text-left flex-1 group-hover:translate-x-1 transition-transform">
            <div className={`text-white ${isLarge ? "text-base" : "text-sm"} font-semibold group-hover:text-cyan transition-colors`}>{p.name}</div>
          </button>
          <span className={`text-[9px] px-2 py-0.5 rounded-md ${ps.bg} ${ps.border} ${ps.text} border font-space uppercase tracking-widest shadow-[0_0_10px_rgba(255,255,255,0.05)]`}>{ps.label}</span>
        </div>
        <p className={`text-text-muted leading-relaxed ${isLarge ? "text-xs mb-4" : "text-[10px] mb-3"}`}>{p.description}</p>
        {isLarge && (
          <div className="flex items-center gap-4 mb-4 text-[10px] text-white/40 font-mono">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyan" /> {p.nodes.length} nodes</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple" /> {p.edges.length} edges</span>
            <span className="text-white/20">&bull;</span>
            <span>Creata: {p.createdAt}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-white/30 font-space">v{p.version} &bull; {p.updatedAt}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => loadPolicy(p)} className={`${isLarge ? "w-7 h-7" : "w-6 h-6"} rounded bg-white/5 hover:bg-cyan/10 text-white/30 hover:text-cyan flex items-center justify-center transition`} title="Modifica">
              <svg width={isLarge ? "13" : "11"} height={isLarge ? "13" : "11"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={() => duplicatePolicy(p)} className={`${isLarge ? "w-7 h-7" : "w-6 h-6"} rounded bg-white/5 hover:bg-purple/10 text-white/30 hover:text-purple flex items-center justify-center transition`} title="Duplica">
              <svg width={isLarge ? "13" : "11"} height={isLarge ? "13" : "11"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            {p.status === "draft" && (
              <button onClick={() => toggleStatus(p.id, "active")} className={`${isLarge ? "w-7 h-7" : "w-6 h-6"} rounded bg-white/5 hover:bg-green/10 text-white/30 hover:text-green flex items-center justify-center transition`} title="Attiva">
                <svg width={isLarge ? "13" : "11"} height={isLarge ? "13" : "11"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            )}
            {p.status === "active" && (
              <button onClick={() => toggleStatus(p.id, "archived")} className={`${isLarge ? "w-7 h-7" : "w-6 h-6"} rounded bg-white/5 hover:bg-yellow/10 text-white/30 hover:text-yellow flex items-center justify-center transition`} title="Archivia">
                <svg width={isLarge ? "13" : "11"} height={isLarge ? "13" : "11"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg>
              </button>
            )}
            <button onClick={() => setDeleteConfirm(p.id)} className={`${isLarge ? "w-7 h-7" : "w-6 h-6"} rounded bg-white/5 hover:bg-red/10 text-white/30 hover:text-red flex items-center justify-center transition`} title="Elimina">
              <svg width={isLarge ? "13" : "11"} height={isLarge ? "13" : "11"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        {deleteConfirm === p.id && (
          <div className="mt-2 p-2 bg-red/10 border border-red/30 rounded-lg flex items-center justify-between">
            <span className="text-red text-[10px]">Eliminare questa policy?</span>
            <div className="flex gap-1">
              <button onClick={() => deletePolicy(p.id)} className="px-2 py-1 bg-red text-white text-[9px] font-space uppercase rounded font-bold">Si</button>
              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-white/10 text-white/60 text-[9px] font-space uppercase rounded">No</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="flex h-screen w-screen bg-[var(--color-void)] overflow-hidden relative text-[13px] tracking-wide font-inter">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(0,229,255,0.08),_transparent_40%),radial-gradient(circle_at_80%_80%,_rgba(123,44,191,0.08),_transparent_40%)] pointer-events-none" />
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* ══════════════════════════════════════════════════════════════════
            VIEW: POLICY LIST
           ══════════════════════════════════════════════════════════════════ */}
        {view === "list" && (
          <>
            <header className="h-[70px] border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-10">
              <div>
                <h1 className="font-space text-lg text-white font-semibold">Visual Policy Editor</h1>
                <div className="flex items-center gap-2 text-xs font-space tracking-widest mt-0.5">
                  <span className="text-purple uppercase text-[10px]">{policies.length} policy salvate</span>
                  <span className="text-white/30">&bull;</span>
                  <span className="text-green text-[10px]">{policyCounts.active} attive</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowNewModal(true)} className="flex items-center gap-2 bg-cyan/10 text-cyan hover:bg-cyan/20 border border-cyan/30 rounded-lg px-5 py-2 text-xs font-semibold font-space transition shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                  <span className="text-base">+</span> Nuova Policy
                </button>
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
                  <img src="/finomnia-logo.png" alt="METIS" className="w-7 h-7 rounded-lg shadow-[0_0_10px_rgba(0,229,255,0.15)]" />
                  <span className="font-space text-sm font-bold tracking-widest text-white">METIS</span>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 [scrollbar-width:thin] [scrollbar-color:rgba(0,229,255,0.2)_transparent]">
              {/* KPI */}
              <section className="grid grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Policy Totali", value: policies.length, color: "text-cyan", border: "border-cyan/30", bg: "bg-cyan/5", glow: "shadow-[0_0_30px_rgba(0,229,255,0.1)]" },
                  { label: "Attive", value: policyCounts.active, color: "text-green", border: "border-green/30", bg: "bg-green/5", glow: "shadow-[0_0_30px_rgba(0,255,102,0.1)]" },
                  { label: "Bozze", value: policyCounts.draft, color: "text-yellow", border: "border-yellow/30", bg: "bg-yellow/5", glow: "shadow-[0_0_30px_rgba(250,204,21,0.1)]" },
                  { label: "Archiviate", value: policyCounts.archived, color: "text-white/40", border: "border-white/10", bg: "bg-white/5", glow: "" },
                ].map((kpi, i) => (
                  <div key={i} className={`glass-panel flex flex-col items-center justify-center p-6 border ${kpi.border} ${kpi.bg} ${kpi.glow} relative overflow-hidden group`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] font-space uppercase tracking-[0.2em] text-text-muted relative z-10">{kpi.label}</span>
                    <span className={`text-4xl font-bold mt-2 font-space ${kpi.color} drop-shadow-lg relative z-10`}>{kpi.value}</span>
                  </div>
                ))}
              </section>

              {/* Policy Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {policies.map(p => renderPolicyCard(p, "large"))}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW: EDITOR
           ══════════════════════════════════════════════════════════════════ */}
        {view === "editor" && currentPolicy && (
          <>
            <header className="h-[70px] border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setView("list")} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div>
                  <h1 className="font-space text-lg text-white font-semibold">{currentPolicy.name}</h1>
                  <div className="flex items-center gap-2 text-xs font-space tracking-widest mt-0.5">
                    <span className={`px-2 py-[1px] rounded ${ss.bg} ${ss.border} ${ss.text} text-[9px] uppercase font-bold border`}>{ss.label}</span>
                    <span className="text-white/30">&bull;</span>
                    <span className="text-purple uppercase text-[10px]">v{currentPolicy.version}</span>
                    <span className="text-white/30">&bull;</span>
                    <span className="text-white/30 text-[10px]">{nodes.length} nodes &middot; {edges.length} edges</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                  <button onClick={() => setRightPanel("simulator")} className={`px-3 py-2 text-[10px] font-space uppercase tracking-widest transition ${rightPanel === "simulator" ? "bg-cyan/10 text-cyan border-r border-cyan/30" : "text-white/40 hover:text-white/60 border-r border-white/10"}`}>
                    Simulator
                  </button>
                  <button onClick={() => setRightPanel("properties")} className={`px-3 py-2 text-[10px] font-space uppercase tracking-widest transition ${rightPanel === "properties" ? "bg-purple/10 text-purple" : "text-white/40 hover:text-white/60"}`}>
                    Properties
                  </button>
                </div>

                <button onClick={savePolicy} className={`flex items-center gap-1.5 text-xs font-space px-4 py-2 rounded-lg transition ${saveFlash ? "bg-green/20 text-green border border-green/30" : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"}`}>
                  {saveFlash ? (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Salvato</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Salva</>
                  )}
                </button>

                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
                  <img src="/finomnia-logo.png" alt="METIS" className="w-7 h-7 rounded-lg shadow-[0_0_10px_rgba(0,229,255,0.15)]" />
                  <span className="font-space text-sm font-bold tracking-widest text-white">METIS</span>
                </div>
              </div>
            </header>

            <div className="flex-1 flex relative overflow-hidden">
              <FlowCanvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} setNodes={setNodes} setEdges={setEdges} onNodeSelect={onNodeSelect} />
              {rightPanel === "simulator" ? (
                <WhatIfSimulator nodes={nodes} edges={edges} />
              ) : (
                <PropertiesPanel node={selectedNode} onUpdate={onUpdateNode} onDelete={onDeleteNode} />
              )}
            </div>
          </>
        )}
      </div>

      {/* New Policy Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setShowNewModal(false)}>
          <div className="w-[450px] bg-[#0A0E17] border border-cyan/30 shadow-[0_0_50px_rgba(0,229,255,0.15)] rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/40">
              <h2 className="font-space text-lg font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center text-cyan shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                Nuova Policy
              </h2>
              <button onClick={() => setShowNewModal(false)} className="w-8 h-8 rounded-lg bg-red/10 border border-red/30 hover:bg-red/20 flex items-center justify-center text-red transition-all shadow-[0_0_10px_rgba(255,71,87,0.1)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-5 bg-[#0D121B]">
              <div>
                <label className="text-[10px] text-cyan font-space uppercase tracking-widest block mb-2 font-bold">Nome Policy</label>
                <input type="text" value={newPolicyName} onChange={e => setNewPolicyName(e.target.value)} placeholder="Es. Real Estate Conservative" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/50 transition-all shadow-inner" autoFocus />
              </div>
              <div>
                <label className="text-[10px] text-purple font-space uppercase tracking-widest block mb-2 font-bold">Descrizione</label>
                <textarea value={newPolicyDesc} onChange={e => setNewPolicyDesc(e.target.value)} placeholder="Breve descrizione della finalità della policy..." rows={3} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/50 transition-all resize-none shadow-inner" />
              </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-black/40 flex gap-4">
              <button onClick={() => setShowNewModal(false)} className="flex-1 py-3 rounded-xl font-space text-xs font-bold uppercase tracking-widest bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 transition-colors">Annulla</button>
              <button onClick={createPolicy} disabled={!newPolicyName.trim()} className={`flex-1 py-3 rounded-xl font-space text-xs font-bold uppercase tracking-widest transition-all ${newPolicyName.trim() ? "bg-cyan/10 text-cyan border border-cyan/40 hover:bg-cyan/20 hover:scale-[1.02] shadow-[0_0_15px_rgba(0,229,255,0.2)] focus:outline-none focus:ring-2 focus:ring-cyan" : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"}`}>
                Crea Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
