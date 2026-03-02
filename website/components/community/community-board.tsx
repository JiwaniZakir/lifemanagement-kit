'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CommunityIssueCard } from './community-issue-card';
import type { CommunityIssue } from '@/lib/types/planner';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export function CommunityBoard() {
  return (
    <Suspense
      fallback={
        <div className="glass flex items-center justify-center p-12">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c6aef]" />
          <p className="ml-2 text-[12px] font-light text-[#fff6]">Loading...</p>
        </div>
      }
    >
      <CommunityBoardInner />
    </Suspense>
  );
}

function CommunityBoardInner() {
  const searchParams = useSearchParams();
  const trackNumber = searchParams.get('track');

  const [issues, setIssues] = useState<CommunityIssue[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/community?status=${filter}`)
      .then((r) => r.json())
      .then((data) => {
        setIssues(data.issues ?? []);
        setConfigured(data.configured ?? false);
      })
      .catch(() => {
        setIssues([]);
        setConfigured(false);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) {
    return (
      <div className="glass flex items-center justify-center p-12">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c6aef]" />
        <p className="ml-2 text-[12px] font-light text-[#fff6]">Loading submissions...</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-[14px] font-light text-[#fff9]">
          Community board is not yet configured.
        </p>
        <p className="mt-1 text-[12px] text-[#fff6]">
          Set a <code className="text-[#7c6aef]">GITHUB_TOKEN</code> to enable community submissions.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              filter === tab.key
                ? 'bg-[#7c6aef] text-white'
                : 'bg-[#ffffff08] text-[#fff6] hover:bg-[#ffffff14] hover:text-[#fff9]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Issues list */}
      {issues.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-[13px] font-light text-[#fff8]">
            No feature requests yet. Be the first to submit one!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <CommunityIssueCard
              key={issue.number}
              issue={issue}
              highlighted={trackNumber === String(issue.number)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
