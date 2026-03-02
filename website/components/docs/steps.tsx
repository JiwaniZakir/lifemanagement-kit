import type { ReactNode } from 'react';

export function Steps({ children }: { children: ReactNode }) {
  return (
    <div className="relative ml-3 border-l border-fd-border pl-6 [counter-reset:step]">
      {children}
    </div>
  );
}

export function Step({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative pb-8 last:pb-0 [counter-increment:step]">
      <div className="absolute -left-[1.9rem] flex h-7 w-7 items-center justify-center rounded-full border border-fd-border bg-fd-background text-xs font-medium before:content-[counter(step)]" />
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="text-sm text-fd-muted-foreground">{children}</div>
    </div>
  );
}
