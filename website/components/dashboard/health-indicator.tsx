'use client';

export function HealthIndicator({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string; pulse: boolean; tooltip: string }> = {
    healthy: { color: 'bg-green-400', label: 'Healthy', pulse: true, tooltip: 'Instance is running and responding' },
    unhealthy: { color: 'bg-red-400', label: 'Unhealthy', pulse: false, tooltip: 'Instance is not responding to health checks' },
    provisioning: { color: 'bg-yellow-400', label: 'Provisioning', pulse: true, tooltip: 'Instance is being set up' },
    bootstrapping: { color: 'bg-yellow-400', label: 'Bootstrapping', pulse: true, tooltip: 'Instance is installing dependencies' },
    configuring: { color: 'bg-blue-400', label: 'Configuring', pulse: true, tooltip: 'Instance is being configured' },
    destroyed: { color: 'bg-gray-500', label: 'Destroyed', pulse: false, tooltip: 'Instance has been terminated' },
  };

  const c = config[status] ?? { color: 'bg-gray-400', label: status, pulse: false, tooltip: status };

  return (
    <div className="flex items-center gap-1.5" title={c.tooltip}>
      <div className="relative">
        <div className={`h-2 w-2 rounded-full ${c.color}`} />
        {c.pulse && (
          <div className={`absolute inset-0 animate-ping rounded-full ${c.color} opacity-40`} />
        )}
      </div>
      <span className="text-[10px] text-[#fff6]">{c.label}</span>
    </div>
  );
}
