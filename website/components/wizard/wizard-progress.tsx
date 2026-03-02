'use client';

import type { WizardStep } from '@/lib/types/planner';

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: 'Describe' },
  { step: 2, label: 'Visualize' },
  { step: 3, label: 'Refine' },
  { step: 4, label: 'Submit' },
];

interface WizardProgressProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  completedSteps: Set<number>;
}

export function WizardProgress({
  currentStep,
  onStepClick,
  completedSteps,
}: WizardProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map(({ step, label }, i) => {
        const isActive = step === currentStep;
        const isCompleted = completedSteps.has(step);
        const isClickable = isCompleted || step <= currentStep;

        return (
          <div key={step} className="flex items-center gap-2">
            <button
              onClick={() => isClickable && onStepClick?.(step)}
              disabled={!isClickable}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-[#7c6aef] text-white'
                  : isCompleted
                    ? 'bg-[#7c6aef20] text-[#7c6aef] hover:bg-[#7c6aef30]'
                    : 'bg-[#ffffff08] text-[#fff4]'
              } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                  isActive
                    ? 'bg-white/20'
                    : isCompleted
                      ? 'bg-[#7c6aef33]'
                      : 'bg-[#ffffff0d]'
                }`}
              >
                {isCompleted ? '\u2713' : step}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-4 ${
                  completedSteps.has(step) ? 'bg-[#7c6aef40]' : 'bg-[#ffffff0d]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
