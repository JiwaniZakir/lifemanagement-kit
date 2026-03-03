'use client';

import { useState, useCallback } from 'react';
import { usePlannerStore } from '@/lib/stores/planner-store';
import { extractSection, extractCodeBlocks } from '@/lib/parse-plan';

export function LocalSetupPanel() {
  const { rawText, editableTitle, plan } = usePlannerStore();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const title = editableTitle || plan?.meta.title || 'feature';
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(null), 2000);
    });
  }, []);

  const handleDownloadSkill = useCallback(() => {
    const skillSection = extractSection(rawText, 'Skill File');
    const blocks = extractCodeBlocks(skillSection);
    const content = blocks.length > 0 ? blocks[0].code : skillSection;
    if (!content) return;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [rawText]);

  const handleDownloadPlan = useCallback(() => {
    const content = `# ${title}\n\n${rawText}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FEATURE_PLAN.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [rawText, title]);

  const dockerOverlay = `# docker-compose.override.yml — add to your Aegis setup
services:
  data-api:
    volumes:
      - ./skills/${slug}/SKILL.md:/app/skills/${slug}/SKILL.md:ro`;

  return (
    <div className="space-y-3">
      <h4 className="text-[13px] font-medium text-white">Run Locally</h4>
      <p className="text-[11px] font-light leading-relaxed text-[#fff6]">
        Download the generated files and add them to your local OpenClaw installation.
      </p>

      {/* Download buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDownloadSkill}
          className="flex-1 rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-3 py-2 text-[11px] text-[#fffc] transition-all hover:border-[#ffffff26] hover:text-white"
        >
          Download SKILL.md
        </button>
        <button
          onClick={handleDownloadPlan}
          className="flex-1 rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-3 py-2 text-[11px] text-[#fffc] transition-all hover:border-[#ffffff26] hover:text-white"
        >
          Download Plan
        </button>
      </div>

      {/* Docker compose overlay */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-[#fff9]">Docker Compose overlay</p>
          <button
            onClick={() => handleCopy(dockerOverlay, 'docker')}
            className="text-[10px] text-[#7c6aef] transition-colors hover:text-[#9b8df7]"
          >
            {copiedItem === 'docker' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="mt-1 overflow-x-auto rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-3 text-[10px] leading-relaxed text-[#fff9]">
          {dockerOverlay}
        </pre>
      </div>

      {/* Setup steps */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-[#fff9]">Setup steps</p>
        <ol className="space-y-1 text-[11px] font-light leading-relaxed text-[#fff6]">
          <li>1. Place SKILL.md in <code className="text-[#7c6aef]">skills/{slug}/</code></li>
          <li>2. Restart OpenClaw gateway to pick up the new skill</li>
          <li>3. If there are data model changes, add the migration via Alembic</li>
          <li>4. Test the skill by messaging your agent via WhatsApp</li>
        </ol>
      </div>
    </div>
  );
}
