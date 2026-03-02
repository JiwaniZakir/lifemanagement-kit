'use client';

import type { AegisMeta } from '@/lib/types/planner';

const IMPACT_COLORS = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

const FILE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  model: { label: 'Model', color: '#ec4899' },
  router: { label: 'Router', color: '#06b6d4' },
  integration: { label: 'Integration', color: '#3b82f6' },
  skill: { label: 'Skill', color: '#22c55e' },
  hook: { label: 'Hook', color: '#f59e0b' },
  migration: { label: 'Migration', color: '#a855f7' },
  test: { label: 'Test', color: '#64748b' },
  config: { label: 'Config', color: '#94a3b8' },
  other: { label: 'Other', color: '#6b7280' },
};

interface SummaryCardProps {
  meta: AegisMeta;
  summary: string;
}

export function SummaryCard({ meta, summary }: SummaryCardProps) {
  const impact = IMPACT_COLORS[meta.impact];

  return (
    <div className="glass overflow-hidden" style={{ borderTop: '2px solid #7c6aef40' }}>
      {/* Header */}
      <div className="border-b border-[#ffffff0d] px-5 py-4">
        <h3 className="text-[16px] font-normal text-white">{meta.title}</h3>
        <p className="mt-1 text-[13px] font-light leading-[1.7] text-[#fffc]">
          {summary.replace(/^###?\s*Summary\s*\n+/i, '').trim().split('\n')[0]}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${impact.bg} ${impact.text} ${impact.border}`}
          >
            {meta.impact} impact
          </span>
          {meta.affectedServices.map((svc) => (
            <span
              key={svc}
              className="rounded-full border border-[#7c6aef33] bg-[#7c6aef0d] px-2.5 py-0.5 text-[10px] font-medium text-[#7c6aef]"
            >
              {svc}
            </span>
          ))}
        </div>
      </div>

      {/* File changes */}
      {meta.newFiles.length > 0 && (
        <div className="px-5 py-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#fff6]">
            Files ({meta.newFiles.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {meta.newFiles.slice(0, 8).map((f) => {
              const typeInfo = FILE_TYPE_LABELS[f.type] ?? FILE_TYPE_LABELS.other;
              return (
                <div key={f.path} className="flex items-center gap-2">
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase"
                    style={{
                      color: typeInfo.color,
                      background: `${typeInfo.color}15`,
                    }}
                  >
                    {typeInfo.label}
                  </span>
                  <span className="truncate font-mono text-[11px] text-[#fff9]">
                    {f.path}
                  </span>
                </div>
              );
            })}
            {meta.newFiles.length > 8 && (
              <p className="text-[11px] text-[#fff4]">
                +{meta.newFiles.length - 8} more files
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
