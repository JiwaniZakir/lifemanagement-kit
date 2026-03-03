'use client';

import { useState } from 'react';
import { useDeployStore } from '@/lib/stores/deploy-store';
import { analytics } from '@/lib/analytics';

const INSTANCE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

const availableIntegrations = [
  { id: 'plaid', label: 'Banking (Plaid)', description: 'Bank accounts and transactions' },
  { id: 'schwab', label: 'Investments (Schwab)', description: 'Portfolio and positions' },
  { id: 'canvas', label: 'Canvas LMS', description: 'Assignments and grades' },
  { id: 'google-calendar', label: 'Google Calendar', description: 'Events and free slots' },
  { id: 'outlook', label: 'Outlook Calendar', description: 'Microsoft calendar events' },
  { id: 'garmin', label: 'Garmin Connect', description: 'Health metrics and activities' },
  { id: 'linkedin', label: 'LinkedIn', description: 'Post content to LinkedIn' },
  { id: 'x', label: 'X / Twitter', description: 'Post content to X' },
];

export function StepConfigure() {
  const {
    mode,
    instanceName,
    setInstanceName,
    anthropicKey,
    setAnthropicKey,
    whatsappPhone,
    setWhatsappPhone,
    enabledIntegrations,
    toggleIntegration,
    setStep,
  } = useDeployStore();

  const [nameError, setNameError] = useState('');

  const handleNameChange = (value: string) => {
    const lowered = value.toLowerCase();
    setInstanceName(lowered);
    if (lowered && !INSTANCE_NAME_RE.test(lowered)) {
      setNameError('Must start with a letter or number and contain only lowercase letters, numbers, and hyphens.');
    } else {
      setNameError('');
    }
  };

  const nameValid = instanceName.trim().length > 0 && INSTANCE_NAME_RE.test(instanceName);
  const canProceed = nameValid && anthropicKey.trim();
  const nextStep = mode === 'hetzner' ? 3 : 4; // hetzner → Provider, local → Review

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-1 text-[18px] font-normal text-white">Configure Instance</h2>
      <p className="mb-6 text-[13px] font-light text-[#fff9]">
        Set up your Aegis instance basics.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-[#fff9]">
            Instance Name
          </label>
          <input
            type="text"
            value={instanceName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="my-aegis"
            maxLength={50}
            autoFocus
            className={`w-full rounded-lg border bg-[#ffffff08] px-4 py-2.5 text-[14px] font-light text-white placeholder-[#fff4] outline-none ${
              nameError ? 'border-red-500/50 focus:border-red-500/70' : 'border-[#ffffff14] focus:border-[#7c6aef40]'
            }`}
          />
          {nameError && (
            <p className="mt-1 text-[10px] text-red-400">{nameError}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-[#fff9]">
            Anthropic API Key
          </label>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[14px] font-light text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
          />
          <p className="mt-1 text-[10px] text-[#fff4]">
            Used once during setup. Not stored on our servers.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-[#fff9]">
            WhatsApp Phone (optional)
          </label>
          <input
            type="tel"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            placeholder="+1234567890"
            className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[14px] font-light text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
          />
        </div>

        <div>
          <label className="mb-2 block text-[12px] font-medium text-[#fff9]">
            Integrations to Enable
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableIntegrations.map((integration) => (
              <button
                key={integration.id}
                onClick={() => toggleIntegration(integration.id)}
                className={`rounded-lg border px-3 py-2 text-left transition-all ${
                  enabledIntegrations.includes(integration.id)
                    ? 'border-[#7c6aef33] bg-[#7c6aef0d] text-white'
                    : 'border-[#ffffff0d] bg-[#ffffff04] text-[#fff9] hover:border-[#ffffff1a]'
                }`}
              >
                <p className="text-[11px] font-medium">{integration.label}</p>
                <p className="text-[10px] text-[#fff6]">{integration.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setStep(1)}
            className="rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[12px] font-light text-[#fff9] transition-all hover:border-[#ffffff26] hover:text-white"
          >
            Back
          </button>
          <button
            onClick={() => {
              analytics.deployConfigured({
                instanceName,
                integrationsCount: enabledIntegrations.length,
                hasWhatsapp: !!whatsappPhone.trim(),
              });
              setStep(nextStep as 3 | 4);
            }}
            disabled={!canProceed}
            className="flex-1 rounded-lg bg-white/90 px-4 py-2.5 text-[12px] font-medium text-black transition-all hover:bg-white disabled:opacity-40"
          >
            {mode === 'hetzner' ? 'Configure Server' : 'Review & Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
