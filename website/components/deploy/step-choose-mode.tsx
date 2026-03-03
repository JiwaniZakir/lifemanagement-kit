'use client';

import Link from 'next/link';
import { useDeployStore } from '@/lib/stores/deploy-store';
import { analytics } from '@/lib/analytics';

export function StepChooseMode() {
  const { setMode, setStep } = useDeployStore();

  const choose = (mode: 'local' | 'hetzner') => {
    analytics.deployModeSelected(mode);
    setMode(mode);
    setStep(2);
  };

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-2 text-center text-[20px] font-normal text-white">
        Choose Deployment Mode
      </h2>
      <p className="mb-8 text-center text-[13px] font-light text-[#fff9]">
        Run Aegis on your own machine or deploy to a cloud server.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => choose('local')}
          className="group rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-6 text-left backdrop-blur-xl transition-all hover:border-[#7c6aef33] hover:bg-[#7c6aef08]"
        >
          <div className="mb-3 text-2xl">&#128187;</div>
          <h3 className="mb-1 text-[15px] font-medium text-white">Local</h3>
          <p className="text-[12px] font-light leading-relaxed text-[#fff9]">
            Download a ready-to-run Docker bundle. Perfect for testing or running on your own hardware.
          </p>
          <p className="mt-3 text-[11px] text-[#7c6aef]">Free &middot; Your machine</p>
        </button>

        <button
          onClick={() => choose('hetzner')}
          className="group rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-6 text-left backdrop-blur-xl transition-all hover:border-[#7c6aef33] hover:bg-[#7c6aef08]"
        >
          <div className="mb-3 text-2xl">&#9729;&#65039;</div>
          <h3 className="mb-1 text-[15px] font-medium text-white">Hetzner VPS</h3>
          <p className="text-[12px] font-light leading-relaxed text-[#fff9]">
            One-click deploy to a Hetzner CX22 server with Cloudflare Tunnel. Always-on, globally accessible.
          </p>
          <p className="mt-3 text-[11px] text-[#7c6aef]">~$4.49/mo &middot; 2 vCPU, 4GB RAM</p>
        </button>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/dashboard"
          className="text-[11px] text-[#fff6] transition-colors hover:text-white"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
