"use client";
import { useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Connection,
  addEdge,
  BackgroundVariant,
  OnConnect,
  NodeChange,
  EdgeChange,
  ReactFlowInstance,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";

import BaseNode from "./BaseNode";
import NodeToolbar from "./NodeToolbar";
import {
  RuleNodeData,
  RuleNodeType,
  NODE_META,
  getDefaultConfig,
} from "./types";

// Custom edge styling
const defaultEdgeOptions = {
  animated: true,
  style: {
    stroke: "rgba(0,229,255,0.4)",
    strokeWidth: 2,
  },
  type: "smoothstep",
};

interface FlowCanvasProps {
  nodes: Node<RuleNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node<RuleNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodeSelect: (node: Node<RuleNodeData> | null) => void;
}

// Register custom node types
const nodeTypes = {
  ruleNode: BaseNode,
};

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
  onNodeSelect,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "rgba(0,229,255,0.4)", strokeWidth: 2 },
            type: "smoothstep",
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<RuleNodeData>) => {
      onNodeSelect(node);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const addNode = useCallback(
    (type: RuleNodeType) => {
      const meta = NODE_META[type];
      const id = `${type}-${Date.now()}`;
      // Place in viewport center with some offset
      const position = reactFlowInstance.current
        ? reactFlowInstance.current.project({
            x: (reactFlowWrapper.current?.clientWidth || 800) / 2 - 110 + Math.random() * 60 - 30,
            y: (reactFlowWrapper.current?.clientHeight || 600) / 2 - 60 + Math.random() * 60 - 30,
          })
        : { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 };

      const newNode: Node<RuleNodeData> = {
        id,
        type: "ruleNode",
        position,
        data: {
          label: meta.defaultLabel,
          type,
          description: `New ${meta.defaultLabel} node`,
          config: getDefaultConfig(type),
          active: true,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-transparent"
        style={{ background: "transparent" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.04)"
        />
        <Controls
          className="!bg-black/80 !border-white/10 !rounded-lg !shadow-xl [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white/60 [&>button:hover]:!text-white [&>button:hover]:!bg-white/5"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as RuleNodeData;
            return NODE_META[data.type]?.color || "#fff";
          }}
          maskColor="rgba(9,13,20,0.85)"
          className="!bg-black/60 !border-white/10 !rounded-lg !shadow-xl"
          style={{ height: 100, width: 140 }}
        />
      </ReactFlow>

      {/* Floating add-node toolbar */}
      <NodeToolbar onAddNode={addNode} />
    </div>
  );
}
