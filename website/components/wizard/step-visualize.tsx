'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { usePlannerStore } from '@/lib/stores/planner-store';
import { SummaryCard } from '@/components/planner/summary-card';
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

export function StepVisualize() {
  const { plan, rawText, diagramNodes, diagramEdges, setStep } = usePlannerStore();
  const [showFullPlan, setShowFullPlan] = useState(false);

  if (!plan) return null;

  const summaryLine = plan.summary
    .replace(/^###?\s*Summary\s*\n+/i, '')
    .trim()
    .split('\n')[0];

  return (
    <div className="wizard-step-enter mx-auto w-full max-w-3xl space-y-4">
      {/* Feature preview card */}
      <div className="glass overflow-hidden">
        <div className="border-b border-[#ffffff0d] px-5 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] font-normal text-white">{plan.meta.title}</h3>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                plan.meta.impact === 'high'
                  ? 'border-red-500/20 bg-red-500/10 text-red-400'
                  : plan.meta.impact === 'medium'
                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                    : 'border-green-500/20 bg-green-500/10 text-green-400'
              }`}
            >
              {plan.meta.impact} impact
            </span>
          </div>
          <p className="text-[13px] font-light leading-[1.7] text-[#fffc]">
            {summaryLine}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 border-b border-[#ffffff0d] px-5 py-3">
          {plan.meta.affectedServices.map((svc) => (
            <span
              key={svc}
              className="rounded-full border border-[#7c6aef33] bg-[#7c6aef0d] px-2.5 py-0.5 text-[10px] font-medium text-[#7c6aef]"
            >
              {svc}
            </span>
          ))}
          <span className="text-[11px] text-[#fff6]">
            {plan.meta.newFiles.length} files
          </span>
        </div>
      </div>

      {/* Architecture diagram */}
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#fff6]">
          How it fits into Aegis
        </p>
        <div className="h-[350px]">
          <ArchitectureDiagram
            initialNodes={diagramNodes}
            initialEdges={diagramEdges}
          />
        </div>
      </div>

      {/* View full plan toggle */}
      <div>
        <button
          onClick={() => setShowFullPlan(!showFullPlan)}
          className="flex items-center gap-1.5 text-[12px] font-light text-[#fff6] transition-colors hover:text-[#fff9]"
        >
          <span className={`transition-transform ${showFullPlan ? 'rotate-90' : ''}`}>
            {'\u25B6'}
          </span>
          {showFullPlan ? 'Hide' : 'View'} full plan
        </button>
        {showFullPlan && (
          <div className="mt-2">
            <PlannerResults
              text={rawText}
              isStreaming={false}
              prompt=""
              onSubmit={() => setStep(4)}
              hideSubmitButton
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setStep(1)}
          className="rounded-lg border border-[#ffffff14] px-5 py-2 text-[12px] font-light text-[#fff9] transition-all hover:border-[#ffffff26] hover:text-white"
        >
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          className="rounded-lg border border-[#7c6aef33] bg-[#7c6aef15] px-5 py-2 text-[12px] font-medium text-[#7c6aef] transition-all hover:bg-[#7c6aef25]"
        >
          Customize
        </button>
        <button
          onClick={() => setStep(4)}
          className="rounded-lg bg-white/90 px-5 py-2 text-[12px] font-medium text-black transition-all hover:bg-white"
        >
          Submit as-is
        </button>
      </div>
    </div>
  );
}
