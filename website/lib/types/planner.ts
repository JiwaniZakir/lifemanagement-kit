import type { Node, Edge } from '@xyflow/react';

export interface FileChange {
  path: string;
  type: 'model' | 'router' | 'integration' | 'skill' | 'hook' | 'migration' | 'test' | 'config' | 'other';
  action: 'create' | 'modify';
}

export interface AegisMeta {
  title: string;
  affectedServices: string[];
  impact: 'low' | 'medium' | 'high';
  newFiles: FileChange[];
  newDiagramNodes: DiagramNode[];
  newDiagramEdges: DiagramEdge[];
}

export interface DiagramNode {
  id: string;
  label: string;
  type: 'service' | 'skill' | 'hook' | 'integration' | 'model' | 'router' | 'group';
  status: 'existing' | 'proposed';
  group?: string;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface StructuredPlan {
  meta: AegisMeta;
  summary: string;
  sections: Record<string, string>;
  rawText: string;
}

export type ServiceNodeData = {
  label: string;
  status: 'existing' | 'proposed';
  nodeType: DiagramNode['type'];
};

export type ServiceNode = Node<ServiceNodeData, 'service'>;
export type ProposedNode = Node<ServiceNodeData, 'proposed'>;

export type DiagramEdgeType = Edge;

export type WizardStep = 1 | 2 | 3 | 4;

export interface SubmissionResult {
  url: string;
  number: number;
}

export interface SubmissionStatus {
  status: 'pending' | 'approved' | 'rejected';
  url: string;
  title: string;
}

export interface CommunityIssue {
  number: number;
  title: string;
  submitter: string;
  status: 'pending' | 'approved' | 'rejected';
  labels: string[];
  createdAt: string;
  url: string;
}

export interface CommunityBoardData {
  issues: CommunityIssue[];
  total: number;
  configured: boolean;
}

export interface ContributorProfile {
  name: string;
  submissionCount: number;
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  integrations: string[];
  capabilities: string[];
  endpointCount: number;
  color: string;
}
