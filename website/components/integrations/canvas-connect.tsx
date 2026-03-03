'use client';

import { useState } from 'react';
import { analytics } from '@/lib/analytics';

interface CanvasConnectProps {
  instanceId: string;
  onClose: () => void;
}

export function CanvasConnect({ instanceId, onClose }: CanvasConnectProps) {
  const [schoolUrl, setSchoolUrl] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!schoolUrl.trim() || !token.trim()) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/integrations/${instanceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'canvas',
          credentials: { baseUrl: schoolUrl.trim(), token: token.trim() },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Connection failed.');
      } else {
        analytics.integrationConnected('canvas', instanceId);
        onClose();
        window.location.reload();
      }
    } catch {
      setError('Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-[#ffffff0d] bg-[#0a0a0a] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-medium text-white">Connect Canvas LMS</h3>
          <button onClick={onClose} className="text-[#fff6] hover:text-white" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-[12px] font-light text-[#fff9]">
              Enter your school&apos;s Canvas URL (e.g. https://canvas.university.edu)
            </p>
            <input
              type="url"
              value={schoolUrl}
              onChange={(e) => setSchoolUrl(e.target.value)}
              placeholder="https://canvas.university.edu"
              className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[13px] text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
            />
            {error && step === 1 && <p className="text-[11px] text-red-400">{error}</p>}
            <button
              onClick={() => {
                try {
                  const url = new URL(schoolUrl.trim());
                  if (!url.protocol.startsWith('http')) throw new Error();
                  setError('');
                  setStep(2);
                } catch {
                  setError('Please enter a valid URL (e.g. https://canvas.university.edu)');
                }
              }}
              disabled={!schoolUrl.trim()}
              className="w-full rounded-lg bg-[#7c6aef] px-4 py-2.5 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-3">
              <p className="mb-2 text-[11px] font-medium text-[#fff9]">To get your Canvas token:</p>
              <ol className="space-y-1 text-[10px] font-light text-[#fff6]">
                <li>1. Go to Canvas &rarr; Account &rarr; Settings</li>
                <li>2. Scroll to &quot;Approved Integrations&quot;</li>
                <li>3. Click &quot;+ New Access Token&quot;</li>
                <li>4. Enter &quot;Aegis&quot; as the purpose</li>
                <li>5. Copy the generated token below</li>
              </ol>
            </div>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your Canvas access token"
              className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[13px] text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
            />
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[12px] text-[#fff9] hover:border-[#ffffff26]"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!token.trim() || isSubmitting}
                className="flex-1 rounded-lg bg-[#7c6aef] px-4 py-2.5 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6] disabled:opacity-40"
              >
                {isSubmitting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
