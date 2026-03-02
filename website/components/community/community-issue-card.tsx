'use client';

import type { CommunityIssue } from '@/lib/types/planner';

const STATUS_STYLES = {
  pending: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/20',
    label: 'Pending',
  },
  approved: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/20',
    label: 'Approved',
  },
  rejected: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    label: 'Rejected',
  },
};

interface CommunityIssueCardProps {
  issue: CommunityIssue;
  highlighted?: boolean;
}

export function CommunityIssueCard({ issue, highlighted }: CommunityIssueCardProps) {
  const status = STATUS_STYLES[issue.status];
  const date = new Date(issue.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`glass block p-4 transition-all hover:scale-[1.01] hover:border-[#ffffff26] ${
        highlighted ? 'ring-1 ring-[#7c6aef]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-normal text-white">{issue.title}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[#fff6]">
            <span>{issue.submitter}</span>
            <span>&middot;</span>
            <span>{date}</span>
            <span>&middot;</span>
            <span>#{issue.number}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase ${status.bg} ${status.text} ${status.border}`}
        >
          {status.label}
        </span>
      </div>
    </a>
  );
}
