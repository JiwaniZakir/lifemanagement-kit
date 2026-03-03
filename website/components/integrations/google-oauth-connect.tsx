'use client';

import { analytics } from '@/lib/analytics';

interface GoogleOAuthConnectProps {
  instanceId: string;
  onClose: () => void;
}

export function GoogleOAuthConnect({ instanceId, onClose }: GoogleOAuthConnectProps) {
  const handleConnect = () => {
    analytics.integrationConnected('google-calendar', instanceId);
    window.location.href = `/api/integrations/google/authorize?instanceId=${instanceId}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-[#ffffff0d] bg-[#0a0a0a] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-medium text-white">Connect Google Calendar</h3>
          <button onClick={onClose} className="text-[#fff6] hover:text-white" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <p className="mb-4 text-[12px] font-light leading-relaxed text-[#fff9]">
          You&apos;ll be redirected to Google to authorize calendar access. Only read-only event data will be synced.
        </p>

        <div className="space-y-2">
          <button
            onClick={handleConnect}
            className="w-full rounded-lg bg-[#7c6aef] px-4 py-2.5 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
          >
            Authorize with Google
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[12px] text-[#fff9] transition-all hover:border-[#ffffff26]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
