'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type OnConnect,
  addEdge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ServiceNode } from './service-node';
import { ProposedNode } from './proposed-node';
import type { Node, Edge } from '@xyflow/react';

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  proposed: ProposedNode,
};

interface ArchitectureDiagramProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  editable?: boolean;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

export function ArchitectureDiagram({
  initialNodes,
  initialEdges,
  editable = false,
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
}: ArchitectureDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (!editable) return;
      setEdges((eds) => {
        const next = addEdge(
          { ...params, style: { stroke: 'rgba(124, 106, 239, 0.4)' } },
          eds,
        );
        onEdgesChangeCallback?.(next);
        return next;
      });
    },
    [editable, setEdges, onEdgesChangeCallback],
  );

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // Notify parent after state update via setTimeout
      if (onNodesChangeCallback) {
        setTimeout(() => {
          onNodesChangeCallback(nodes);
        }, 0);
      }
    },
    [onNodesChange, onNodesChangeCallback, nodes],
  );

  return (
    <div className="h-full w-full rounded-xl border border-[#ffffff0d] bg-[#0a0a0f]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={editable ? handleNodesChange : undefined}
        onEdgesChange={editable ? onEdgesChange : undefined}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        nodesDraggable={editable}
        nodesConnectable={editable}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        className="xyflow-dark"
      >
        <Background color="#ffffff0d" gap={20} />
        {editable && <Controls className="xyflow-controls-dark" />}
      </ReactFlow>
    </div>
  );
}
