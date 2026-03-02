'use client';

import { useEffect, useState } from 'react';
import type { ContributorProfile } from '@/lib/types/planner';

export function Leaderboard() {
  const [contributors, setContributors] = useState<ContributorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community?status=all&perPage=100')
      .then((r) => r.json())
      .then((data) => {
        if (!data.issues?.length) {
          setContributors([]);
          return;
        }
        // Aggregate by submitter
        const counts = new Map<string, number>();
        for (const issue of data.issues) {
          const name = issue.submitter || 'Anonymous';
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
        const sorted = Array.from(counts.entries())
          .map(([name, submissionCount]) => ({ name, submissionCount }))
          .sort((a, b) => b.submissionCount - a.submissionCount)
          .slice(0, 5);
        setContributors(sorted);
      })
      .catch(() => setContributors([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#fff6]">
          Top Contributors
        </p>
        <div className="mt-4 flex items-center justify-center">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c6aef]" />
        </div>
      </div>
    );
  }

  if (contributors.length === 0) {
    return (
      <div className="glass p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#fff6]">
          Top Contributors
        </p>
        <p className="mt-3 text-[12px] font-light text-[#fff6]">
          No contributions yet.
        </p>
      </div>
    );
  }

  return (
    <div className="glass p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#fff6]">
        Top Contributors
      </p>
      <div className="space-y-2">
        {contributors.map((c, i) => (
          <div
            key={c.name}
            className="flex items-center gap-3 rounded-lg bg-[#ffffff05] px-3 py-2"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7c6aef15] text-[11px] font-medium text-[#7c6aef]">
              {i + 1}
            </span>
            <span className="flex-1 truncate text-[13px] font-light text-white">
              {c.name}
            </span>
            <span className="text-[11px] text-[#fff6]">
              {c.submissionCount} {c.submissionCount === 1 ? 'feature' : 'features'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
