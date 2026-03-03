'use client';

import { useDeployStore } from '@/lib/stores/deploy-store';

const steps = [
  { num: 1, label: 'Mode' },
  { num: 2, label: 'Configure' },
  { num: 3, label: 'Provider' },
  { num: 4, label: 'Review' },
  { num: 5, label: 'Deploy' },
  { num: 6, label: 'Complete' },
];

export function DeployProgress() {
  const { step, mode } = useDeployStore();

  // Local mode skips the Provider step
  const visibleSteps = mode === 'local'
    ? steps.filter((s) => s.num !== 3)
    : steps;

  const currentIndex = visibleSteps.findIndex((s) => s.num === step);
  const stepLabel = currentIndex >= 0
    ? `Step ${currentIndex + 1} of ${visibleSteps.length}`
    : `Step ${visibleSteps.length} of ${visibleSteps.length}`;

  return (
    <div className="mb-8 flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-2">
        {visibleSteps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all ${
                  step >= s.num
                    ? 'bg-[#7c6aef] text-white'
                    : 'border border-[#ffffff14] text-[#fff4]'
                }`}
              >
                {step > s.num ? '\u2713' : i + 1}
              </div>
              <span
                className={`text-[11px] ${
                  step >= s.num ? 'text-[#fffc]' : 'text-[#fff4]'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div
                className={`h-px w-6 ${
                  step > s.num ? 'bg-[#7c6aef]' : 'bg-[#ffffff14]'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <span className="text-[10px] text-[#fff4]">{stepLabel}</span>
    </div>
  );
}
