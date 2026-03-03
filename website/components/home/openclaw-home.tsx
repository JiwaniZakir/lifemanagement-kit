'use client';

import { SkillsPanel } from './skills-panel';
import { WhatsAppPairing } from './whatsapp-pairing';
import { InstanceHealthPanel } from './instance-health-panel';

interface OpenClawHomeProps {
  instanceId: string;
  instanceName: string;
  enabledSkills: string[];
}

export function OpenClawHome({ instanceId, instanceName, enabledSkills }: OpenClawHomeProps) {
  return (
    <div>
      <h2 className="mb-1 text-[20px] font-normal text-white">{instanceName}</h2>
      <p className="mb-6 text-[12px] text-[#fff6]">OpenClaw Home</p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Skills */}
        <div className="lg:col-span-2">
          <SkillsPanel instanceId={instanceId} enabledSkills={enabledSkills} />
        </div>

        {/* Right column: WhatsApp + Health */}
        <div className="space-y-6">
          <WhatsAppPairing instanceId={instanceId} />
          <InstanceHealthPanel instanceId={instanceId} />
        </div>
      </div>
    </div>
  );
}
