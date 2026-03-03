'use client';

import { useState } from 'react';

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        console.error('Portal error:', data.error);
        setError(data.error ?? 'Failed to open billing portal.');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handlePortal}
        disabled={loading}
        className="flex items-center justify-center rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[13px] font-medium text-white transition-all hover:border-[#ffffff28] hover:bg-[#ffffff08] disabled:opacity-50"
      >
        {loading ? 'Opening...' : 'Manage Subscription'}
      </button>
      {error && (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      )}
    </div>
  );
}
