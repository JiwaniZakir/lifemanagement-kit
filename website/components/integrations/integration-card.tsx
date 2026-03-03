'use client';

import { useState } from 'react';

interface IntegrationCardProps {
  service: string;
  label: string;
  description: string;
  icon: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  instanceId: string;
  onConnect: () => void;
}

export function IntegrationCard({
  service,
  label,
  description,
  icon,
  status,
  instanceId,
  onConnect,
}: IntegrationCardProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch(`/api/integrations/${instanceId}/${service}`, {
        method: 'DELETE',
      });
      window.location.reload();
    } catch {
      setIsDisconnecting(false);
    }
  };

  const statusColors = {
    disconnected: 'bg-gray-500',
    connecting: 'bg-yellow-400',
    connected: 'bg-green-400',
    error: 'bg-red-400',
  };

  return (
    <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className="text-[13px] font-medium text-white">{label}</h3>
            <p className="text-[11px] text-[#fff6]">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
          <span className="text-[10px] capitalize text-[#fff6]">{status}</span>
        </div>
      </div>

      <div className="mt-4">
        {status === 'connected' ? (
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="w-full rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-40"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={status === 'connecting'}
            className="w-full rounded-lg border border-[#7c6aef33] bg-[#7c6aef0d] px-3 py-2 text-[11px] text-[#7c6aef] transition-all hover:bg-[#7c6aef1a] disabled:opacity-40"
          >
            {status === 'connecting' ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  );
}
