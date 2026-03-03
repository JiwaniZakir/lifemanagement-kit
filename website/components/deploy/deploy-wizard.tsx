'use client';

import { useDeployStore } from '@/lib/stores/deploy-store';
import { DeployProgress } from './deploy-progress';
import { StepChooseMode } from './step-choose-mode';
import { StepConfigure } from './step-configure';
import { StepProvider } from './step-provider';
import { StepReview } from './step-review';
import { StepDeploying } from './step-deploying';
import { StepComplete } from './step-complete';

export function DeployWizard() {
  const { step } = useDeployStore();

  return (
    <div className="min-h-screen bg-black px-4 pb-20 pt-12">
      <DeployProgress />
      <div className="mx-auto max-w-2xl">
        {step === 1 && <StepChooseMode />}
        {step === 2 && <StepConfigure />}
        {step === 3 && <StepProvider />}
        {step === 4 && <StepReview />}
        {step === 5 && <StepDeploying />}
        {step === 6 && <StepComplete />}
      </div>
    </div>
  );
}
