"use client";
import { useState, useCallback } from "react";
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
// Initial nodes — a realistic starter pipeline
// ============================================================================
const initialNodes: Node<RuleNodeData>[] = [
  {
    id: "ingestion-1",
    type: "ruleNode",
    position: { x: 50, y: 150 },
    data: {
      label: "Data Ingestion",
      type: "dataIngestion",
      description: "C.R. Bankitalia, Bilancio XBRL, Cerved APIs",
      config: getDefaultConfig("dataIngestion"),
      active: true,
    },
  },
  {
    id: "fraud-1",
    type: "ruleNode",
    position: { x: 380, y: 80 },
    data: {
      label: "Zest Protect™ Fraud",
      type: "fraudDetection",
      description: "ML Anomaly Detection su OCR",
      config: {
        falsePositiveLimit: 1.4,
        anomalyModel: "ensemble" as const,
        blockThreshold: 0.85,
        ocrEnabled: true,
      },
      active: true,
    },
  },
  {
    id: "scoring-1",
    type: "ruleNode",
    position: { x: 380, y: 280 },
    data: {
      label: "Metis AI Scoring",
      type: "aiScoring",
      description: "FairBoost Enabled · Multi-factor Model",
      config: getDefaultConfig("aiScoring"),
      active: true,
    },
  },
  {
    id: "decision-approve",
    type: "ruleNode",
    position: { x: 750, y: 100 },
    data: {
      label: "Auto Approve",
      type: "decision",
      description: "Score > 65 → Approve with signoff",
      config: {
        action: "approve" as const,
        autoExecute: false,
        maxExposure: 500000,
        requiresSignoff: true,
      },
      active: true,
    },
  },
  {
    id: "decision-reject",
    type: "ruleNode",
    position: { x: 750, y: 350 },
    data: {
      label: "Reject / Escalate",
      type: "decision",
      description: "Score < 35 → Reject",
      config: {
        action: "reject" as const,
        autoExecute: true,
        maxExposure: 0,
        requiresSignoff: false,
      },
      active: true,
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e-ingestion-fraud",
    source: "ingestion-1",
    target: "fraud-1",
    animated: true,
    style: { stroke: "rgba(0,229,255,0.4)", strokeWidth: 2 },
    type: "smoothstep",
  },
  {
    id: "e-ingestion-scoring",
    source: "ingestion-1",
    target: "scoring-1",
    animated: true,
    style: { stroke: "rgba(0,229,255,0.4)", strokeWidth: 2 },
    type: "smoothstep",
  },
  {
    id: "e-fraud-scoring",
    source: "fraud-1",
    target: "scoring-1",
    animated: true,
    style: { stroke: "rgba(250,204,21,0.4)", strokeWidth: 2 },
    type: "smoothstep",
  },
  {
    id: "e-scoring-approve",
    source: "scoring-1",
    target: "decision-approve",
    animated: true,
    style: { stroke: "rgba(0,255,102,0.4)", strokeWidth: 2 },
    type: "smoothstep",
  },
  {
    id: "e-scoring-reject",
    source: "scoring-1",
    target: "decision-reject",
    animated: true,
    style: { stroke: "rgba(255,0,85,0.4)", strokeWidth: 2 },
    type: "smoothstep",
  },
];

// ============================================================================
// Page Component
// ============================================================================
export default function RuleEngine() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<RuleNodeData> | null>(null);
  const [rightPanel, setRightPanel] = useState<"simulator" | "properties">("simulator");

  // Node selection handler
  const onNodeSelect = useCallback(
    (node: Node<RuleNodeData> | null) => {
      setSelectedNode(node);
      if (node) setRightPanel("properties");
    },
    []
  );

  // Update node data from properties panel
  const onUpdateNode = useCallback(
    (id: string, partialData: Partial<RuleNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            const updatedData = { ...n.data, ...partialData };
            // Also update selectedNode reference
            setSelectedNode((prev) =>
              prev && prev.id === id ? { ...prev, data: updatedData } : prev
            );
            return { ...n, data: updatedData };
          }
          return n;
        })
      );
    },
    [setNodes]
  );

  // Delete node
  const onDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNode(null);
      setRightPanel("simulator");
    },
    [setNodes, setEdges]
  );

  return (
    <main className="flex h-screen w-screen bg-[var(--color-void)] overflow-hidden relative text-[13px] tracking-wide font-inter">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(0,229,255,0.08),_transparent_40%),radial-gradient(circle_at_80%_80%,_rgba(123,44,191,0.08),_transparent_40%)] pointer-events-none" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-[70px] border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-10">
          <div>
            <h1 className="font-space text-lg text-white font-semibold">
              Visual Policy Editor
            </h1>
            <div className="flex items-center gap-2 text-xs font-space tracking-widest mt-0.5">
              <span className="text-purple uppercase">
                Strategy: SME Lending v2.4
              </span>
              <span className="text-white/30">&bull;</span>
              <span className="text-cyan px-2 py-[1px] rounded bg-cyan/10 border border-cyan/30 text-[9px] uppercase font-bold">
                Draft / Challenger Mode
              </span>
              <span className="text-white/30">&bull;</span>
              <span className="text-white/30 text-[10px]">
                {nodes.length} nodes &middot; {edges.length} edges
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Panel toggle */}
            <div className="flex bg-black/40 border border-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setRightPanel("simulator")}
                className={`px-4 py-2 text-[10px] font-space uppercase tracking-widest transition ${
                  rightPanel === "simulator"
                    ? "bg-cyan/10 text-cyan border-r border-cyan/30"
                    : "text-white/40 hover:text-white/60 border-r border-white/10"
                }`}
              >
                Simulator
              </button>
              <button
                onClick={() => setRightPanel("properties")}
                className={`px-4 py-2 text-[10px] font-space uppercase tracking-widest transition ${
                  rightPanel === "properties"
                    ? "bg-purple/10 text-purple"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Properties
              </button>
            </div>
            <button className="text-white/60 hover:text-white text-xs font-space border border-white/10 hover:border-white/30 px-4 py-2 rounded-lg transition bg-white/5">
              Saved Versions
            </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex relative overflow-hidden">
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

          {/* Right Panel — Simulator or Properties */}
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
    </main>
  );
}
