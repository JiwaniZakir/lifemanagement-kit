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

export function ProposedNode({ data }: NodeProps) {
  const nodeData = data as ServiceNodeData;
  const color = TYPE_COLORS[nodeData.nodeType] ?? '#7c6aef';

  return (
    <div
      className="proposed-node-pulse rounded-lg border-2 border-dashed px-4 py-2.5 text-center"
      style={{
        background: `${color}0d`,
        borderColor: `${color}66`,
        minWidth: 140,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#ffffff33] !border-none !w-2 !h-2" />
      <div className="flex items-center justify-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
        />
        <span
          className="text-[11px] font-medium"
          style={{ color }}
        >
          {nodeData.label}
        </span>
      </div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-[#fff4]">
        proposed
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#ffffff33] !border-none !w-2 !h-2" />
    </div>
  );
}
