'use client';

import { useState } from 'react';
import { analytics } from '@/lib/analytics';

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    analytics.checkoutStarted();
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        console.error('Checkout error:', data.error);
        setError(data.error ?? 'Failed to create checkout session.');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="flex items-center justify-center rounded-lg bg-[#7c6aef] px-4 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[#6b5bd6] disabled:opacity-50"
      >
        {loading ? 'Redirecting...' : 'Get Started'}
      </button>
      {error && (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      )}
    </div>
  );
}
