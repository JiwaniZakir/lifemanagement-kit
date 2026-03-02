'use client';

import { useMemo } from 'react';
import { usePlannerStore } from '@/lib/stores/planner-store';
import { WizardProgress } from './wizard-progress';
import { StepDescribe } from './step-describe';
import { StepVisualize } from './step-visualize';
import { StepRefine } from './step-refine';
import { StepSubmit } from './step-submit';
import type { WizardStep } from '@/lib/types/planner';

export function FeatureWizard() {
  const { step, setStep, plan, submissionResult } = usePlannerStore();

  const completedSteps = useMemo(() => {
    const completed = new Set<number>();
    if (plan) completed.add(1);
    if (plan && step > 2) completed.add(2);
    if (plan && step > 3) completed.add(3);
    if (submissionResult) completed.add(4);
    return completed;
  }, [plan, step, submissionResult]);

  const handleStepClick = (target: WizardStep) => {
    // Only allow going back to completed steps or current
    if (target <= step || completedSteps.has(target)) {
      setStep(target);
    }
  };

  return (
    <section className="animate-fade-up-delay-3 mx-auto w-full max-w-3xl px-6 pb-32">
      {/* Section label */}
      <p className="mb-3 text-center text-[14px] font-light leading-[16px] text-[#fff6]">
        Feature Planner
      </p>

      {/* Progress dots */}
      {step > 1 && (
        <div className="mb-6">
          <WizardProgress
            currentStep={step}
            onStepClick={handleStepClick}
            completedSteps={completedSteps}
          />
        </div>
      )}

      {/* Step content */}
      {step === 1 && <StepDescribe />}
      {step === 2 && <StepVisualize />}
      {step === 3 && <StepRefine />}
      {step === 4 && <StepSubmit />}
    </section>
  );
}
