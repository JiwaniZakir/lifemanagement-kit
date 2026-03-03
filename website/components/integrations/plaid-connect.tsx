'use client';

import { useState, useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface PlaidConnectProps {
  instanceId: string;
  onClose: () => void;
}

export function PlaidConnect({ instanceId, onClose }: PlaidConnectProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/integrations/plaid/link-token?instanceId=${instanceId}`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed'))))
      .then((d) => setLinkToken(d.linkToken))
      .catch(() => setError('Failed to initialize Plaid Link.'));
  }, [instanceId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-[#ffffff0d] bg-[#0a0a0a] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-medium text-white">Connect Banking</h3>
          <button onClick={onClose} className="text-[#fff6] hover:text-white" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {error ? (
          <p className="text-[12px] text-red-400">{error}</p>
        ) : !linkToken ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c6aef]" />
            <p className="ml-2 text-[12px] text-[#fff6]">Initializing Plaid Link...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] font-light text-[#fff9]">
              Plaid Link will open in a new window. Follow the prompts to connect your bank account.
            </p>
            <button
              onClick={() => {
                analytics.integrationConnected('plaid', instanceId);
                // In production, this would open Plaid Link with the token
                window.open(
                  `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}`,
                  'plaid-link',
                  'width=400,height=600',
                );
              }}
              className="w-full rounded-lg bg-[#7c6aef] px-4 py-2.5 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
            >
              Open Plaid Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
