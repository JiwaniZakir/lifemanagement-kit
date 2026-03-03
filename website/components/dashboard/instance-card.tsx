'use client';

import Link from 'next/link';
import { HealthIndicator } from './health-indicator';

interface InstanceCardProps {
  id: string;
  name: string;
  provider: 'local' | 'hetzner';
  status: string;
  serverIp?: string | null;
  tunnelDomain?: string | null;
}

export function InstanceCard({ id, name, provider, status, serverIp, tunnelDomain }: InstanceCardProps) {
  return (
    <Link
      href={`/dashboard/instances/${id}`}
      className="group rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl transition-all hover:border-[#7c6aef33] hover:bg-[#7c6aef08]"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-medium text-white">{name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-md bg-[#ffffff0d] px-1.5 py-0.5 text-[10px] text-[#fff6]">
              {provider}
            </span>
            {serverIp && (
              <span className="text-[10px] text-[#fff4]">{serverIp}</span>
            )}
          </div>
        </div>
        <HealthIndicator status={status} />
      </div>

      {tunnelDomain && (
        <p className="mt-3 truncate text-[11px] text-[#7c6aef]">
          https://{tunnelDomain}
        </p>
      )}
    </Link>
  );
}
