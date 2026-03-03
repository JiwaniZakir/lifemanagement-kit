'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import { HealthIndicator } from './health-indicator';
import { UsageStats } from './usage-stats';
import { QuickActions } from './quick-actions';

interface InstanceDetailProps {
  instance: {
    id: string;
    name: string;
    provider: 'local' | 'hetzner';
    status: string;
    serverIp?: string | null;
    tunnelDomain?: string | null;
    createdAt: string;
    config?: Record<string, unknown> | null;
  };
}

export function InstanceDetail({ instance }: InstanceDetailProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    analytics.instanceViewed(instance.id);
  }, [instance.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/instances/${instance.id}`, { method: 'DELETE' });
      if (res.ok) {
        analytics.instanceDeleted(instance.id);
        router.push('/dashboard/instances');
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-[11px]">
        <Link href="/dashboard/instances" className="text-[#fff6] hover:text-white">
          Instances
        </Link>
        <span className="text-[#fff3]">/</span>
        <span className="text-[#fff9]">{instance.name}</span>
      </nav>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[20px] font-normal text-white">{instance.name}</h2>
          <div className="mt-1 flex items-center gap-3">
            <span className="rounded-md bg-[#ffffff0d] px-2 py-0.5 text-[11px] text-[#fff6]">
              {instance.provider}
            </span>
            <HealthIndicator status={instance.status} />
          </div>
        </div>
        <button
          onClick={() => setShowDelete(true)}
          className="self-start rounded-lg border border-red-500/20 px-3 py-1.5 text-[11px] text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/5"
        >
          Delete Instance
        </button>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="mb-1 text-[13px] font-medium text-red-400">Delete &ldquo;{instance.name}&rdquo;?</p>
          <p className="mb-3 text-[11px] text-[#fff6]">
            {instance.provider === 'hetzner'
              ? 'This will destroy the Hetzner server and all data on it. This cannot be undone.'
              : 'This will remove the instance record from your dashboard.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-red-500/80 px-4 py-2 text-[11px] font-medium text-white transition-all hover:bg-red-500 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setShowDelete(false)}
              className="rounded-lg border border-[#ffffff14] px-4 py-2 text-[11px] text-[#fff9] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info panel */}
        <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl">
          <h3 className="mb-3 text-[14px] font-medium text-white">Details</h3>
          <dl className="space-y-2">
            {instance.serverIp && (
              <div className="flex justify-between">
                <dt className="text-[12px] text-[#fff6]">Server IP</dt>
                <dd className="text-[12px] text-white">{instance.serverIp}</dd>
              </div>
            )}
            {instance.tunnelDomain && (
              <div className="flex justify-between">
                <dt className="text-[12px] text-[#fff6]">URL</dt>
                <dd className="text-[12px] text-[#7c6aef]">
                  https://{instance.tunnelDomain}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[12px] text-[#fff6]">Created</dt>
              <dd className="text-[12px] text-white">
                {new Date(instance.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Usage + Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl">
            <UsageStats instanceId={instance.id} />
          </div>
          <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl">
            <QuickActions instanceId={instance.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
