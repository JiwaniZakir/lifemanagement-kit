'use client';

import Link from 'next/link';

interface QuickActionsProps {
  instanceId: string;
}

export function QuickActions({ instanceId }: QuickActionsProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-[13px] font-medium text-white">Quick Actions</h4>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/dashboard/instances/${instanceId}/home`}
          className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] px-3 py-2.5 text-center text-[11px] text-[#fffc] transition-all hover:border-[#ffffff1a] hover:text-white"
        >
          WhatsApp Pairing
        </Link>
        <Link
          href="/dashboard/integrations"
          className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] px-3 py-2.5 text-center text-[11px] text-[#fffc] transition-all hover:border-[#ffffff1a] hover:text-white"
        >
          Add Integration
        </Link>
      </div>
    </div>
  );
}
