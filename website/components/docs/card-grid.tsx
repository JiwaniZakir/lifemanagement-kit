import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Rocket,
  Brain,
  Layers,
  Bot,
  Zap,
  Shield,
  Wallet,
  TrendingUp,
  GraduationCap,
  Calendar,
  HeartPulse,
  Share2,
  ShieldCheck,
  Lock,
  FileCheck,
  Terminal,
  Plug,
  Server,
  GitPullRequest,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  rocket: Rocket,
  brain: Brain,
  layers: Layers,
  bot: Bot,
  zap: Zap,
  shield: Shield,
  wallet: Wallet,
  'trending-up': TrendingUp,
  'graduation-cap': GraduationCap,
  calendar: Calendar,
  'heart-pulse': HeartPulse,
  'share-2': Share2,
  'shield-check': ShieldCheck,
  lock: Lock,
  'file-check': FileCheck,
  terminal: Terminal,
  plug: Plug,
  server: Server,
  'git-pull-request': GitPullRequest,
};

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose grid grid-cols-1 gap-3 sm:grid-cols-2">
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
  const Icon = icon ? iconMap[icon] : null;

  return (
    <Link
      href={href}
      className="group rounded-lg border border-fd-border bg-fd-card/50 p-4 transition-all hover:border-fd-primary/20 hover:bg-fd-accent/5"
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-fd-primary/10 text-fd-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <div>
          <h3 className="text-sm font-medium text-fd-foreground group-hover:text-fd-primary">
            {title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-fd-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}
