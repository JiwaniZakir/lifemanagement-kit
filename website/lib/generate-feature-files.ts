import { extractSection, extractCodeBlocks } from '@/lib/parse-plan';

interface GeneratedFile {
  path: string;
  content: string;
}

/**
 * Extract implementation artifacts from AI plan text and generate files
 * suitable for committing to a GitHub fork.
 */
export function generateFeatureFiles(
  slug: string,
  rawPlan: string,
  title: string,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Always include the full plan
  files.push({
    path: 'FEATURE_PLAN.md',
    content: `# ${title}\n\n${rawPlan}`,
  });

  // Try to extract a Skill File section
  const skillSection = extractSection(rawPlan, 'Skill File');
  if (skillSection) {
    const codeBlocks = extractCodeBlocks(skillSection);
    const content = codeBlocks.length > 0
      ? codeBlocks[0].code
      : skillSection.replace(/^###?\s*Skill File\s*\n+/i, '').trim();
    if (content) {
      files.push({ path: `skills/${slug}/SKILL.md`, content });
    }
  }

  // Try to extract Data Model section
  const modelSection = extractSection(rawPlan, 'Data Model');
  if (modelSection) {
    const pyBlocks = extractCodeBlocks(modelSection, 'python');
    if (pyBlocks.length > 0) {
      files.push({
        path: `data-api/app/models/${slug.replace(/-/g, '_')}.py`,
        content: pyBlocks[0].code,
      });
    }
  }

  // Try to extract API Endpoints section
  const apiSection = extractSection(rawPlan, 'API Endpoints');
  if (apiSection) {
    const pyBlocks = extractCodeBlocks(apiSection, 'python');
    if (pyBlocks.length > 0) {
      files.push({
        path: `data-api/app/api/${slug.replace(/-/g, '_')}.py`,
        content: pyBlocks[0].code,
      });
    }
  }

  // Try to extract Integration Client section
  const integrationSection = extractSection(rawPlan, 'Integration Client');
  if (integrationSection) {
    const pyBlocks = extractCodeBlocks(integrationSection, 'python');
    if (pyBlocks.length > 0) {
      files.push({
        path: `data-api/app/integrations/${slug.replace(/-/g, '_')}_client.py`,
        content: pyBlocks[0].code,
      });
    }
  }

  // Try to extract Hook section
  const hookSection = extractSection(rawPlan, 'Hook');
  if (hookSection) {
    const tsBlocks = extractCodeBlocks(hookSection, 'typescript');
    if (tsBlocks.length > 0) {
      files.push({
        path: `hooks/${slug}/handler.ts`,
        content: tsBlocks[0].code,
      });
    }
  }

  return files;
}

/**
 * Generate a URL-safe slug from a title.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
