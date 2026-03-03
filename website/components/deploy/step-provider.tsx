'use client';

import { useDeployStore } from '@/lib/stores/deploy-store';
import { analytics } from '@/lib/analytics';

const locations = [
  { id: 'nbg1', label: 'Nuremberg, DE', flag: '🇩🇪' },
  { id: 'fsn1', label: 'Falkenstein, DE', flag: '🇩🇪' },
  { id: 'hel1', label: 'Helsinki, FI', flag: '🇫🇮' },
  { id: 'ash', label: 'Ashburn, US', flag: '🇺🇸' },
  { id: 'hil', label: 'Hillsboro, US', flag: '🇺🇸' },
];

export function StepProvider() {
  const {
    hetznerToken,
    setHetznerToken,
    cloudflareToken,
    setCloudflareToken,
    serverLocation,
    setServerLocation,
    setStep,
  } = useDeployStore();

  const canProceed = hetznerToken.trim() && cloudflareToken.trim();

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-1 text-[18px] font-normal text-white">Server Configuration</h2>
      <p className="mb-6 text-[13px] font-light text-[#fff9]">
        Provide your Hetzner and Cloudflare credentials for provisioning.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-[#fff9]">
            Hetzner API Token
          </label>
          <input
            type="password"
            value={hetznerToken}
            onChange={(e) => setHetznerToken(e.target.value)}
            placeholder="Your Hetzner Cloud API token"
            className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[14px] font-light text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
          />
          <a
            href="https://console.hetzner.cloud/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-[10px] text-[#7c6aef] hover:text-[#9b8df7]"
          >
            Get a token from Hetzner Console
          </a>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-[#fff9]">
            Cloudflare Tunnel Token
          </label>
          <input
            type="password"
            value={cloudflareToken}
            onChange={(e) => setCloudflareToken(e.target.value)}
            placeholder="Your Cloudflare tunnel token"
            className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[14px] font-light text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
          />
        </div>

        <div>
          <label className="mb-2 block text-[12px] font-medium text-[#fff9]">
            Server Location
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setServerLocation(loc.id)}
                className={`rounded-lg border px-3 py-2 text-center transition-all ${
                  serverLocation === loc.id
                    ? 'border-[#7c6aef33] bg-[#7c6aef0d] text-white'
                    : 'border-[#ffffff0d] bg-[#ffffff04] text-[#fff9] hover:border-[#ffffff1a]'
                }`}
              >
                <span className="text-[14px]">{loc.flag}</span>
                <p className="mt-0.5 text-[10px]">{loc.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
          <p className="text-[11px] font-light leading-relaxed text-yellow-200/80">
            Your Hetzner token will be used once to create the server and then discarded.
            A CX22 instance costs approximately $4.49/month.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setStep(2)}
            className="rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[12px] font-light text-[#fff9] transition-all hover:border-[#ffffff26] hover:text-white"
          >
            Back
          </button>
          <button
            onClick={() => {
              analytics.deployProviderConfigured(serverLocation);
              setStep(4);
            }}
            disabled={!canProceed}
            className="flex-1 rounded-lg bg-white/90 px-4 py-2.5 text-[12px] font-medium text-black transition-all hover:bg-white disabled:opacity-40"
          >
            Review & Deploy
          </button>
        </div>
      </div>
    </div>
  );
}
