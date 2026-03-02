'use client';

import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ServiceNodeData } from '@/lib/types/planner';

const TYPE_COLORS: Record<string, string> = {
  service: '#7c6aef',
  skill: '#22c55e',
  hook: '#f59e0b',
  integration: '#3b82f6',
  model: '#ec4899',
  router: '#06b6d4',
  group: '#ffffff',
};

export function ServiceNode({ data }: NodeProps) {
  const nodeData = data as ServiceNodeData;
  const color = TYPE_COLORS[nodeData.nodeType] ?? '#7c6aef';

  return (
    <div
      className="rounded-lg border px-4 py-2.5 text-center"
      style={{
        background: 'rgba(10, 10, 15, 0.9)',
        borderColor: `${color}33`,
        minWidth: 140,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#ffffff33] !border-none !w-2 !h-2" />
      <div
        className="text-[11px] font-medium"
        style={{ color }}
      >
        {nodeData.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#ffffff33] !border-none !w-2 !h-2" />
    </div>
  );
}
