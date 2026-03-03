'use client';

import { useEffect, useState } from 'react';
import { HealthIndicator } from '@/components/dashboard/health-indicator';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
}

export function InstanceHealthPanel({ instanceId }: { instanceId: string }) {
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: 'OpenClaw Gateway', status: 'unknown' },
    { name: 'Data API', status: 'unknown' },
    { name: 'PostgreSQL', status: 'unknown' },
    { name: 'Cloudflare Tunnel', status: 'unknown' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/instances/${instanceId}/health`, {
      signal: AbortSignal.timeout(10000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.healthy) {
          setServices((prev) =>
            prev.map((s) => ({ ...s, status: 'healthy' as const })),
          );
        } else if (data) {
          setServices((prev) =>
            prev.map((s) => ({ ...s, status: data.status === 'healthy' ? 'healthy' as const : 'unhealthy' as const })),
          );
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [instanceId]);

  return (
    <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl">
      <h3 className="mb-4 text-[14px] font-medium text-white">Service Health</h3>
      <div className="space-y-3">
        {services.map((svc) => (
          <div key={svc.name} className="flex items-center justify-between">
            <span className="text-[12px] text-[#fff9]">{svc.name}</span>
            {loading ? (
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ffffff1a]" />
            ) : (
              <HealthIndicator status={svc.status} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
