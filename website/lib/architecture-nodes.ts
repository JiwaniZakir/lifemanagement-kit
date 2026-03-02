import type { Node, Edge } from '@xyflow/react';

// Base Aegis architecture as xyflow nodes and edges

export const BASE_NODES: Node[] = [
  // ── Group nodes ──
  {
    id: 'group-frontend',
    type: 'group',
    position: { x: 0, y: 0 },
    data: { label: 'Frontend Network' },
    style: {
      width: 500,
      height: 200,
      background: 'rgba(124, 106, 239, 0.05)',
      border: '1px dashed rgba(124, 106, 239, 0.2)',
      borderRadius: 12,
    },
  },
  {
    id: 'group-backend',
    type: 'group',
    position: { x: 0, y: 240 },
    data: { label: 'Backend Network (internal)' },
    style: {
      width: 500,
      height: 320,
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px dashed rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
    },
  },
  {
    id: 'group-data',
    type: 'group',
    position: { x: 0, y: 600 },
    data: { label: 'Data Network (internal)' },
    style: {
      width: 500,
      height: 200,
      background: 'rgba(59, 130, 246, 0.05)',
      border: '1px dashed rgba(59, 130, 246, 0.2)',
      borderRadius: 12,
    },
  },

  // ── Service nodes ──
  {
    id: 'cloudflared',
    type: 'service',
    position: { x: 30, y: 60 },
    parentId: 'group-frontend',
    data: { label: 'Cloudflare Tunnel', status: 'existing', nodeType: 'service' },
  },
  {
    id: 'gateway',
    type: 'service',
    position: { x: 270, y: 60 },
    parentId: 'group-frontend',
    data: { label: 'OpenClaw Gateway', status: 'existing', nodeType: 'service' },
  },
  {
    id: 'data-api',
    type: 'service',
    position: { x: 170, y: 60 },
    parentId: 'group-backend',
    data: { label: 'Data API', status: 'existing', nodeType: 'service' },
  },
  {
    id: 'skills',
    type: 'service',
    position: { x: 30, y: 170 },
    parentId: 'group-backend',
    data: { label: 'Skills (8)', status: 'existing', nodeType: 'skill' },
  },
  {
    id: 'hooks',
    type: 'service',
    position: { x: 310, y: 170 },
    parentId: 'group-backend',
    data: { label: 'Hooks (3)', status: 'existing', nodeType: 'hook' },
  },
  {
    id: 'postgres',
    type: 'service',
    position: { x: 30, y: 60 },
    parentId: 'group-data',
    data: { label: 'PostgreSQL + pgvector', status: 'existing', nodeType: 'service' },
  },
  {
    id: 'integrations',
    type: 'service',
    position: { x: 270, y: 60 },
    parentId: 'group-data',
    data: { label: 'Integrations (10)', status: 'existing', nodeType: 'integration' },
  },
];

export const BASE_EDGES: Edge[] = [
  {
    id: 'e-cf-gw',
    source: 'cloudflared',
    target: 'gateway',
    animated: true,
    style: { stroke: 'rgba(124, 106, 239, 0.4)' },
  },
  {
    id: 'e-gw-api',
    source: 'gateway',
    target: 'data-api',
    animated: true,
    style: { stroke: 'rgba(255, 255, 255, 0.2)' },
  },
  {
    id: 'e-gw-skills',
    source: 'gateway',
    target: 'skills',
    style: { stroke: 'rgba(255, 255, 255, 0.15)' },
  },
  {
    id: 'e-gw-hooks',
    source: 'gateway',
    target: 'hooks',
    style: { stroke: 'rgba(255, 255, 255, 0.15)' },
  },
  {
    id: 'e-api-pg',
    source: 'data-api',
    target: 'postgres',
    animated: true,
    style: { stroke: 'rgba(59, 130, 246, 0.3)' },
  },
  {
    id: 'e-api-int',
    source: 'data-api',
    target: 'integrations',
    style: { stroke: 'rgba(255, 255, 255, 0.15)' },
  },
];
