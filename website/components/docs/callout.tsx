'use client';

import type { ReactNode } from 'react';

type CalloutType = 'info' | 'warning' | 'danger' | 'tip';

const styles: Record<CalloutType, { border: string; bg: string; icon: string }> = {
  info: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    icon: 'i',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    icon: '!',
  },
  danger: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    icon: 'x',
  },
  tip: {
    border: 'border-green-500/30',
    bg: 'bg-green-500/5',
    icon: '*',
  },
};

export function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}) {
  const s = styles[type];

  return (
    <div
      className={`my-4 rounded-lg border ${s.border} ${s.bg} p-4`}
    >
      {title && (
        <p className="mb-1 font-semibold text-sm">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs font-bold">
            {s.icon}
          </span>
          {title}
        </p>
      )}
      <div className="text-sm text-fd-muted-foreground">{children}</div>
    </div>
  );
}
