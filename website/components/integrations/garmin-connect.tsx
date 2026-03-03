'use client';

import { useState } from 'react';
import { analytics } from '@/lib/analytics';

interface GarminConnectProps {
  instanceId: string;
  onClose: () => void;
}

export function GarminConnect({ instanceId, onClose }: GarminConnectProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/integrations/${instanceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'garmin',
          credentials: { email: email.trim(), password: password.trim() },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Connection failed.');
      } else {
        analytics.integrationConnected('garmin', instanceId);
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
          <h3 className="text-[15px] font-medium text-white">Connect Garmin</h3>
          <button onClick={onClose} className="text-[#fff6] hover:text-white" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2">
          <p className="text-[10px] text-yellow-200/80">
            Uses unofficial Garmin API. Credentials are encrypted and stored only on your Aegis instance.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Garmin Connect email"
            className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[13px] text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Garmin Connect password"
            className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[13px] text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
          />
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[12px] text-[#fff9] hover:border-[#ffffff26]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!email.trim() || !password.trim() || isSubmitting}
              className="flex-1 rounded-lg bg-[#7c6aef] px-4 py-2.5 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6] disabled:opacity-40"
            >
              {isSubmitting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
