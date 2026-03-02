import type { ReactNode } from 'react';
import Link from 'next/link';

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}

export function FeatureCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-fd-border bg-fd-card p-5 transition-colors hover:border-fd-primary/30 hover:bg-fd-accent/5"
    >
      {icon && <span className="mb-2 block text-2xl">{icon}</span>}
      <h3 className="mb-1 font-semibold text-fd-foreground group-hover:text-fd-primary">
        {title}
      </h3>
      <p className="text-sm text-fd-muted-foreground">{description}</p>
    </Link>
  );
}
