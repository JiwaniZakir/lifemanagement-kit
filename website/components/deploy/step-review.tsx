'use client';

import { useDeployStore } from '@/lib/stores/deploy-store';
import { analytics } from '@/lib/analytics';

const locationLabels: Record<string, string> = {
  nbg1: 'Nuremberg, DE',
  fsn1: 'Falkenstein, DE',
  hel1: 'Helsinki, FI',
  ash: 'Ashburn, US',
  hil: 'Hillsboro, US',
};

export function StepReview() {
  const {
    mode,
    instanceName,
    anthropicKey,
    whatsappPhone,
    enabledIntegrations,
    serverLocation,
    setStep,
  } = useDeployStore();

  const isHetzner = mode === 'hetzner';

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-1 text-[18px] font-normal text-white">Review & Confirm</h2>
      <p className="mb-6 text-[13px] font-light text-[#fff9]">
        {isHetzner
          ? 'Review your configuration before deploying to Hetzner.'
          : 'Review your configuration before downloading.'}
      </p>

      <div className="mb-6 space-y-3">
        {/* Mode */}
        <div className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[12px] font-medium text-[#fff9]">Mode</h3>
            <button
              onClick={() => setStep(1)}
              className="text-[10px] text-[#7c6aef] hover:text-[#9b8df7]"
            >
              Edit
            </button>
          </div>
          <Row label="Deployment" value={isHetzner ? 'Hetzner Cloud' : 'Local / Self-hosted'} />
        </div>

        {/* Instance Config */}
        <div className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[12px] font-medium text-[#fff9]">Instance</h3>
            <button
              onClick={() => setStep(2)}
              className="text-[10px] text-[#7c6aef] hover:text-[#9b8df7]"
            >
              Edit
            </button>
          </div>
          <div className="space-y-2">
            <Row label="Name" value={instanceName} />
            <Row label="Anthropic Key" value={`${anthropicKey.slice(0, 10)}...${anthropicKey.slice(-4)}`} />
            {whatsappPhone && <Row label="WhatsApp" value={whatsappPhone} />}
            <Row
              label="Integrations"
              value={enabledIntegrations.length > 0 ? enabledIntegrations.join(', ') : 'None'}
            />
          </div>
        </div>

        {/* Server Config (Hetzner only) */}
        {isHetzner && (
          <div className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[12px] font-medium text-[#fff9]">Server</h3>
              <button
                onClick={() => setStep(3)}
                className="text-[10px] text-[#7c6aef] hover:text-[#9b8df7]"
              >
                Edit
              </button>
            </div>
            <div className="space-y-2">
              <Row label="Provider" value="Hetzner Cloud" />
              <Row label="Type" value="CX22 (2 vCPU, 4 GB RAM, 40 GB SSD)" />
              <Row label="Location" value={locationLabels[serverLocation] ?? serverLocation} />
            </div>
          </div>
        )}

        {/* Cost estimate (Hetzner only) */}
        {isHetzner && (
          <div className="rounded-lg border border-[#7c6aef20] bg-[#7c6aef08] p-4">
            <h3 className="mb-2 text-[12px] font-medium text-white">Estimated Cost</h3>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-[#fff9]">Hetzner CX22</span>
                <span className="text-[12px] font-medium text-white">~$4.49/mo</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-[#fff9]">Cloudflare Tunnel</span>
                <span className="text-[12px] font-medium text-green-400">Free</span>
              </div>
              <div className="mt-2 border-t border-[#ffffff0d] pt-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-[#fff9]">Total</span>
                  <span className="text-[13px] font-medium text-white">~$4.49/mo</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-[#fff6]">
              Plus Anthropic API usage based on your interactions. Billed by Hetzner directly.
            </p>
          </div>
        )}

        {/* Security note */}
        <div className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-3">
          <p className="text-[10px] leading-relaxed text-[#fff7]">
            {isHetzner
              ? 'Your API tokens are used once to provision the server and immediately discarded. All credentials are encrypted end-to-end.'
              : 'Your API key is embedded in the local bundle only. No data is sent to our servers.'}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setStep(isHetzner ? 3 : 2)}
          className="rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[12px] font-light text-[#fff9] transition-all hover:border-[#ffffff26] hover:text-white"
        >
          Back
        </button>
        <button
          onClick={() => {
            analytics.deployReviewed(mode ?? 'local');
            setStep(5);
          }}
          className="flex-1 rounded-lg bg-[#7c6aef] px-4 py-2.5 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
        >
          {isHetzner ? 'Deploy to Hetzner' : 'Download Bundle'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-[11px] text-[#fff5]">{label}</span>
      <span className="truncate text-right text-[11px] text-white">{value}</span>
    </div>
  );
}
