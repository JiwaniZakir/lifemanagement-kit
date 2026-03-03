'use client';

import { useEffect, useState } from 'react';

interface UsageData {
  dailySpend: number;
  dailyLimit: number;
  monthlySpend: number;
  monthlyLimit: number;
}

export function UsageStats({ instanceId }: { instanceId: string }) {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch(`/api/instances/${instanceId}/usage`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setUsage)
      .catch(() => null);
  }, [instanceId]);

  if (!usage) {
    return (
      <div className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-4">
        <p className="text-[11px] text-[#fff4]">Usage data unavailable</p>
      </div>
    );
  }

  const dailyPct = Math.min(100, (usage.dailySpend / usage.dailyLimit) * 100);
  const monthlyPct = Math.min(100, (usage.monthlySpend / usage.monthlyLimit) * 100);

  return (
    <div className="space-y-3">
      <h4 className="text-[13px] font-medium text-white">LLM Budget</h4>

      <div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[#fff9]">Daily</span>
          <span className="text-[#fff6]">
            ${usage.dailySpend.toFixed(2)} / ${usage.dailyLimit.toFixed(2)}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#ffffff0d]">
          <div
            className={`h-full rounded-full transition-all ${
              dailyPct > 90 ? 'bg-red-400' : dailyPct > 75 ? 'bg-yellow-400' : 'bg-[#7c6aef]'
            }`}
            style={{ width: `${dailyPct}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[#fff9]">Monthly</span>
          <span className="text-[#fff6]">
            ${usage.monthlySpend.toFixed(2)} / ${usage.monthlyLimit.toFixed(2)}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#ffffff0d]">
          <div
            className={`h-full rounded-full transition-all ${
              monthlyPct > 90 ? 'bg-red-400' : monthlyPct > 75 ? 'bg-yellow-400' : 'bg-[#7c6aef]'
            }`}
            style={{ width: `${monthlyPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
