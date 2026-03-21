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
  const [currentPolicy, setCurrentPolicy] = useState<Policy>(MOCK_POLICIES[0]);
  const [showPolicyList, setShowPolicyList] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyDesc, setNewPolicyDesc] = useState("");
  const [saveFlash, setSaveFlash] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(currentPolicy.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentPolicy.edges);
  const [selectedNode, setSelectedNode] = useState<Node<RuleNodeData> | null>(null);
  const [rightPanel, setRightPanel] = useState<"simulator" | "properties">("simulator");

  // Sync nodes/edges when switching policy
  const loadPolicy = useCallback((policy: Policy) => {
    setCurrentPolicy(policy);
    setNodes(policy.nodes);
    setEdges(policy.edges);
    setSelectedNode(null);
    setRightPanel("simulator");
    setShowPolicyList(false);
  }, [setNodes, setEdges]);

  // Save current policy
  const savePolicy = useCallback(() => {
    const updated: Policy = {
      ...currentPolicy,
      nodes: nodes,
      edges: edges,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    setPolicies(prev => prev.map(p => p.id === updated.id ? updated : p));
    setCurrentPolicy(updated);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
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
    setPolicies(prev => {
      const remaining = prev.filter(p => p.id !== id);
      if (currentPolicy.id === id && remaining.length > 0) {
        loadPolicy(remaining[0]);
      }
      return remaining;
    });
    setDeleteConfirm(null);
  }, [currentPolicy, loadPolicy]);

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
    if (currentPolicy.id === id) {
      setCurrentPolicy(prev => ({ ...prev, status: newStatus }));
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

  const ss = STATUS_STYLE[currentPolicy.status];

  return (
    <main className="flex h-screen w-screen bg-[var(--color-void)] overflow-hidden relative text-[13px] tracking-wide font-inter">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(0,229,255,0.08),_transparent_40%),radial-gradient(circle_at_80%_80%,_rgba(123,44,191,0.08),_transparent_40%)] pointer-events-none" />
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-[70px] border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            {/* Policy Selector */}
            <button
              onClick={() => setShowPolicyList(!showPolicyList)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30"><polyline points="6 9 12 15 18 9"/></svg>
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
            {/* Panel toggle */}
            <div className="flex bg-black/40 border border-white/10 rounded-lg overflow-hidden">
              <button onClick={() => setRightPanel("simulator")} className={`px-3 py-2 text-[10px] font-space uppercase tracking-widest transition ${rightPanel === "simulator" ? "bg-cyan/10 text-cyan border-r border-cyan/30" : "text-white/40 hover:text-white/60 border-r border-white/10"}`}>
                Simulator
              </button>
              <button onClick={() => setRightPanel("properties")} className={`px-3 py-2 text-[10px] font-space uppercase tracking-widest transition ${rightPanel === "properties" ? "bg-purple/10 text-purple" : "text-white/40 hover:text-white/60"}`}>
                Properties
              </button>
            </div>

            {/* Save */}
            <button
              onClick={savePolicy}
              className={`flex items-center gap-1.5 text-xs font-space px-4 py-2 rounded-lg transition ${
                saveFlash
                  ? "bg-green/20 text-green border border-green/30"
                  : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {saveFlash ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Salvato</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Salva</>
              )}
            </button>

            {/* METIS logo */}
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
              <img src="/finomnia-logo.png" alt="METIS" className="w-7 h-7 rounded-lg shadow-[0_0_10px_rgba(0,229,255,0.15)]" />
              <span className="font-space text-sm font-bold tracking-widest text-white">METIS</span>
            </div>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* Policy List Drawer */}
          {showPolicyList && (
            <div className="absolute top-0 left-0 bottom-0 w-[320px] z-30 bg-[rgba(9,13,20,0.98)] backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-space text-sm font-semibold text-white">Policy Salvate</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowNewModal(true); setShowPolicyList(false); }} className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan hover:bg-cyan/20 flex items-center justify-center transition" title="Nuova Policy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <button onClick={() => setShowPolicyList(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {policies.map(p => {
                  const ps = STATUS_STYLE[p.status];
                  const isCurrent = p.id === currentPolicy.id;
                  return (
                    <div key={p.id} className={`rounded-lg border p-3 transition ${isCurrent ? "border-cyan/40 bg-cyan/5" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <button onClick={() => loadPolicy(p)} className="text-left flex-1">
                          <div className="text-white text-sm font-medium">{p.name}</div>
                        </button>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded ${ps.bg} ${ps.border} ${ps.text} border font-space uppercase tracking-widest`}>{ps.label}</span>
                      </div>
                      <p className="text-text-muted text-[10px] mb-2">{p.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white/30 font-space">v{p.version} &bull; {p.updatedAt}</span>
                        <div className="flex items-center gap-1">
                          {/* Load */}
                          <button onClick={() => loadPolicy(p)} className="w-6 h-6 rounded bg-white/5 hover:bg-cyan/10 text-white/30 hover:text-cyan flex items-center justify-center transition" title="Carica">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                          </button>
                          {/* Duplicate */}
                          <button onClick={() => duplicatePolicy(p)} className="w-6 h-6 rounded bg-white/5 hover:bg-purple/10 text-white/30 hover:text-purple flex items-center justify-center transition" title="Duplica">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                          {/* Toggle active */}
                          {p.status === "draft" && (
                            <button onClick={() => toggleStatus(p.id, "active")} className="w-6 h-6 rounded bg-white/5 hover:bg-green/10 text-white/30 hover:text-green flex items-center justify-center transition" title="Attiva">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>
                          )}
                          {p.status === "active" && (
                            <button onClick={() => toggleStatus(p.id, "archived")} className="w-6 h-6 rounded bg-white/5 hover:bg-yellow/10 text-white/30 hover:text-yellow flex items-center justify-center transition" title="Archivia">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg>
                            </button>
                          )}
                          {/* Delete */}
                          <button onClick={() => setDeleteConfirm(p.id)} className="w-6 h-6 rounded bg-white/5 hover:bg-red/10 text-white/30 hover:text-red flex items-center justify-center transition" title="Elimina">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                      {/* Delete Confirm */}
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
                })}
              </div>
            </div>
          )}

          {/* ReactFlow Canvas */}
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            setNodes={setNodes}
            setEdges={setEdges}
            onNodeSelect={onNodeSelect}
          />

          {/* Right Panel */}
          {rightPanel === "simulator" ? (
            <WhatIfSimulator nodes={nodes} edges={edges} />
          ) : (
            <PropertiesPanel
              node={selectedNode}
              onUpdate={onUpdateNode}
              onDelete={onDeleteNode}
            />
          )}
        </div>
      </div>

      {/* New Policy Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)}>
          <div className="glass-panel border border-white/10 w-[420px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-space text-sm font-semibold text-white">Nuova Policy</h2>
              <button onClick={() => setShowNewModal(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">Nome Policy</label>
                <input type="text" value={newPolicyName} onChange={e => setNewPolicyName(e.target.value)} placeholder="Es. Real Estate Conservative" className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan/50 transition" autoFocus />
              </div>
              <div>
                <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">Descrizione</label>
                <textarea value={newPolicyDesc} onChange={e => setNewPolicyDesc(e.target.value)} placeholder="Breve descrizione della policy..." rows={3} className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan/50 transition resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-white/10 flex gap-3">
              <button onClick={() => setShowNewModal(false)} className="flex-1 py-2.5 rounded-lg font-space text-xs font-bold uppercase tracking-widest bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 transition">Annulla</button>
              <button onClick={createPolicy} disabled={!newPolicyName.trim()} className={`flex-1 py-2.5 rounded-lg font-space text-xs font-bold uppercase tracking-widest transition ${newPolicyName.trim() ? "bg-gradient-to-r from-cyan to-[rgba(0,229,255,0.6)] text-black shadow-[0_0_15px_rgba(0,229,255,0.2)]" : "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"}`}>
                Crea Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
