import type { ReactNode } from 'react';
import { Info, AlertTriangle, XCircle, Lightbulb } from 'lucide-react';

type CalloutType = 'info' | 'warning' | 'danger' | 'tip';

const config: Record<CalloutType, { border: string; bg: string; icon: ReactNode; iconColor: string }> = {
  info: {
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    icon: <Info className="h-4 w-4" />,
    iconColor: 'text-blue-400',
  },
  warning: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    icon: <AlertTriangle className="h-4 w-4" />,
    iconColor: 'text-amber-400',
  },
  danger: {
    border: 'border-red-500/20',
    bg: 'bg-red-500/5',
    icon: <XCircle className="h-4 w-4" />,
    iconColor: 'text-red-400',
  },
  tip: {
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    icon: <Lightbulb className="h-4 w-4" />,
    iconColor: 'text-green-400',
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
  const s = config[type];

  return (
    <div className={`my-4 rounded-lg border ${s.border} ${s.bg} p-4`}>
      {title && (
        <p className="mb-1.5 flex items-center gap-2 text-sm font-medium">
          <span className={s.iconColor}>{s.icon}</span>
          {title}
        </p>
      )}
      <div className="text-sm leading-relaxed text-fd-muted-foreground">{children}</div>
    </div>
  );
}
