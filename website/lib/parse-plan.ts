import type {
  StructuredPlan,
  AegisMeta,
  FileChange,
  DiagramNode,
  DiagramEdge,
} from '@/lib/types/planner';

/**
 * Parse AI-generated plan text into structured data.
 * Tries to extract an aegis-meta JSON block first, falls back to regex heading extraction.
 */
export function parsePlan(rawText: string): StructuredPlan {
  const meta = extractMeta(rawText);
  const summary = extractSection(rawText, 'Summary');
  const sections = extractAllSections(rawText);

  return { meta, summary, sections, rawText };
}

// ── Meta extraction ──

function extractMeta(text: string): AegisMeta {
  // Try to extract aegis-meta JSON block
  const metaMatch = text.match(/```aegis-meta\s*\n([\s\S]*?)\n```/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      return {
        title: parsed.title ?? 'Untitled Feature',
        affectedServices: parsed.affectedServices ?? [],
        impact: parsed.impact ?? 'medium',
        newFiles: (parsed.newFiles ?? []).map(normalizeFileChange),
        newDiagramNodes: parsed.newDiagramNodes ?? [],
        newDiagramEdges: parsed.newDiagramEdges ?? [],
      };
    } catch {
      // Fall through to regex extraction
    }
  }

  // Fallback: extract from headings and file paths
  return extractMetaFromHeadings(text);
}

function normalizeFileChange(f: { path: string; type?: string; action?: string }): FileChange {
  return {
    path: f.path,
    type: classifyFilePath(f.path, f.type),
    action: (f.action as FileChange['action']) ?? 'create',
  };
}

function classifyFilePath(
  path: string,
  hint?: string,
): FileChange['type'] {
  if (hint && isValidFileType(hint)) return hint as FileChange['type'];

  if (path.includes('/models/')) return 'model';
  if (path.includes('/api/')) return 'router';
  if (path.includes('/integrations/')) return 'integration';
  if (path.includes('SKILL.md') || path.startsWith('skills/')) return 'skill';
  if (path.includes('handler.ts') || path.includes('HOOK.md') || path.startsWith('hooks/')) return 'hook';
  if (path.includes('alembic/') || path.includes('migration')) return 'migration';
  if (path.includes('test_') || path.includes('/tests/')) return 'test';
  if (path.includes('.json') || path.includes('.yml') || path.includes('config')) return 'config';
  return 'other';
}

function isValidFileType(t: string): boolean {
  return ['model', 'router', 'integration', 'skill', 'hook', 'migration', 'test', 'config', 'other'].includes(t);
}

function extractMetaFromHeadings(text: string): AegisMeta {
  const title = extractFirstHeading(text) ?? 'Untitled Feature';

  // Find affected services from summary
  const services: string[] = [];
  const summaryText = extractSection(text, 'Summary').toLowerCase();
  if (summaryText.includes('data-api') || summaryText.includes('data api')) services.push('data-api');
  if (summaryText.includes('openclaw') || summaryText.includes('gateway')) services.push('openclaw-gateway');
  if (summaryText.includes('postgres')) services.push('postgres');
  if (summaryText.includes('cloudflare') || summaryText.includes('tunnel')) services.push('cloudflared');

  // Extract file paths from Implementation Steps
  const stepsSection = extractSection(text, 'Implementation Steps');
  const filePaths = extractFilePaths(stepsSection || text);
  const newFiles = filePaths.map((p) => ({
    path: p,
    type: classifyFilePath(p),
    action: 'create' as const,
  }));

  // Generate diagram nodes from file paths
  const { nodes, edges } = generateDiagramFromFiles(newFiles);

  return {
    title,
    affectedServices: services.length > 0 ? services : ['data-api'],
    impact: newFiles.length > 5 ? 'high' : newFiles.length > 2 ? 'medium' : 'low',
    newFiles,
    newDiagramNodes: nodes,
    newDiagramEdges: edges,
  };
}

function extractFirstHeading(text: string): string | null {
  // Look for the first H1 or H2 after Summary
  const match = text.match(/###?\s*Summary\s*\n+(.+?)(?:\n|\.)/);
  if (match) {
    const line = match[1].trim();
    // Try to get a short title from the first sentence
    const titleMatch = line.match(/^(?:This feature |Aegis |The )?(.*?)(?:\s+(?:is|will|adds|enables|integrates|provides))/i);
    if (titleMatch) return titleMatch[1].trim();
    return line.length > 60 ? line.slice(0, 57) + '...' : line;
  }
  return null;
}

function extractFilePaths(text: string): string[] {
  const paths: string[] = [];
  // Match file paths like data-api/app/models/foo.py, skills/foo/SKILL.md, hooks/foo/handler.ts
  const regex = /(?:data-api\/|skills\/|hooks\/|config\/|infrastructure\/)[\w/.-]+\.\w+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!paths.includes(match[0])) {
      paths.push(match[0]);
    }
  }
  return paths;
}

function generateDiagramFromFiles(files: FileChange[]): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
} {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const nodeId = `proposed-${file.path.replace(/[/.]/g, '-')}`;
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);

    const label = file.path.split('/').pop() ?? file.path;
    nodes.push({
      id: nodeId,
      label,
      type: fileTypeToNodeType(file.type),
      status: 'proposed',
    });

    // Connect to parent service
    const parentId = getParentServiceId(file.type);
    if (parentId) {
      edges.push({
        id: `e-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
      });
    }
  }

  return { nodes, edges };
}

function fileTypeToNodeType(type: FileChange['type']): DiagramNode['type'] {
  switch (type) {
    case 'model': return 'model';
    case 'router': return 'router';
    case 'integration': return 'integration';
    case 'skill': return 'skill';
    case 'hook': return 'hook';
    default: return 'service';
  }
}

function getParentServiceId(type: FileChange['type']): string | null {
  switch (type) {
    case 'model': return 'postgres';
    case 'router': return 'data-api';
    case 'integration': return 'integrations';
    case 'skill': return 'skills';
    case 'hook': return 'hooks';
    default: return 'data-api';
  }
}

// ── Section extraction ──

export function extractSection(text: string, heading: string): string {
  const pattern = new RegExp(
    `###?\\s*${heading}[\\s\\S]*?(?=\\n###?\\s[A-Z]|$)`,
    'i',
  );
  const match = text.match(pattern);
  return match ? match[0].trim() : '';
}

export function extractCodeBlocks(text: string, lang?: string): { lang: string; code: string }[] {
  const regex = /```(\w*)\s*\n([\s\S]*?)\n```/g;
  const blocks: { lang: string; code: string }[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const blockLang = match[1] || 'text';
    if (!lang || blockLang === lang) {
      blocks.push({ lang: blockLang, code: match[2].trim() });
    }
  }
  return blocks;
}

function extractAllSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headingPattern = /^###?\s+(.+)$/gm;
  const headings: { name: string; index: number }[] = [];

  let match;
  while ((match = headingPattern.exec(text)) !== null) {
    headings.push({ name: match[1].trim(), index: match.index });
  }

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i + 1 < headings.length ? headings[i + 1].index : text.length;
    sections[headings[i].name] = text.slice(start, end).trim();
  }

  return sections;
}
