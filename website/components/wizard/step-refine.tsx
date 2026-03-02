'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { usePlannerStore } from '@/lib/stores/planner-store';
import { PlannerResults } from '@/components/planner/planner-results';

const ArchitectureDiagram = dynamic(
  () =>
    import('@/components/diagram/architecture-diagram').then(
      (m) => m.ArchitectureDiagram,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-[#ffffff0d] bg-[#0a0a0f]">
        <p className="text-[12px] text-[#fff4]">Loading diagram...</p>
      </div>
    ),
  },
);

export function StepRefine() {
  const {
    plan,
    rawText,
    diagramNodes,
    diagramEdges,
    setDiagramNodes,
    setDiagramEdges,
    editableTitle,
    setEditableTitle,
    editableDescription,
    setEditableDescription,
    setStep,
  } = usePlannerStore();
  const [showRawPlan, setShowRawPlan] = useState(false);

  if (!plan) return null;

  return (
    <div className="wizard-step-enter mx-auto w-full max-w-3xl space-y-4">
      {/* Editable title + description */}
      <div className="glass overflow-hidden p-5">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#fff6]">
          Feature details
        </p>
        <input
          type="text"
          value={editableTitle}
          onChange={(e) => setEditableTitle(e.target.value)}
          placeholder="Feature title"
          className="mb-2 w-full bg-transparent text-[18px] font-normal text-white placeholder-[#fff3] outline-none"
        />
        <textarea
          value={editableDescription}
          onChange={(e) => setEditableDescription(e.target.value)}
          placeholder="Brief description..."
          rows={2}
          className="w-full resize-none bg-transparent text-[13px] font-light leading-[1.7] text-[#fffc] placeholder-[#fff3] outline-none"
        />
      </div>

      {/* Community board preview */}
      <div className="glass overflow-hidden p-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#fff6]">
          Preview — how it will appear on the community board
        </p>
        <div className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[14px] font-normal text-white">
                {editableTitle || 'Untitled Feature'}
              </p>
              <p className="mt-0.5 text-[11px] font-light text-[#fff8]">
                {editableDescription || 'No description'}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[9px] font-medium uppercase text-yellow-400">
              Pending
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-[#fff4]">
            <span>{plan.meta.newFiles.length} files</span>
            <span>&middot;</span>
            <span>{plan.meta.impact} impact</span>
            <span>&middot;</span>
            <span>{plan.meta.affectedServices.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Editable diagram */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#fff6]">
            Architecture — drag nodes to rearrange
          </p>
        </div>
        <div className="h-[350px]">
          <ArchitectureDiagram
            initialNodes={diagramNodes}
            initialEdges={diagramEdges}
            editable
            onNodesChange={setDiagramNodes}
            onEdgesChange={setDiagramEdges}
          />
        </div>
      </div>

      {/* Expandable raw plan */}
      <div>
        <button
          onClick={() => setShowRawPlan(!showRawPlan)}
          className="flex items-center gap-1.5 text-[12px] font-light text-[#fff6] transition-colors hover:text-[#fff9]"
        >
          <span className={`transition-transform ${showRawPlan ? 'rotate-90' : ''}`}>
            {'\u25B6'}
          </span>
          {showRawPlan ? 'Hide' : 'Show'} full plan
        </button>
        {showRawPlan && (
          <div className="mt-2">
            <PlannerResults
              text={rawText}
              isStreaming={false}
              prompt=""
              onSubmit={() => setStep(4)}
            />
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="flex justify-center">
        <button
          onClick={() => setStep(4)}
          className="rounded-lg bg-white/90 px-6 py-2 text-[12px] font-medium text-black transition-all hover:bg-white"
        >
          Continue to Submit
        </button>
      </div>
    </div>
  );
}
