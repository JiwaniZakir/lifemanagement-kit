'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useDeployStore } from '@/lib/stores/deploy-store';
import { analytics } from '@/lib/analytics';

const phases = [
  { id: 'creating_server', label: 'Creating server' },
  { id: 'installing', label: 'Installing dependencies' },
  { id: 'cloning', label: 'Cloning repository' },
  { id: 'bootstrapping', label: 'Running bootstrap' },
  { id: 'configuring', label: 'Configuring services' },
  { id: 'health_check', label: 'Health check' },
  { id: 'completed', label: 'Complete' },
];

export function StepDeploying() {
  const {
    mode,
    deploymentId,
    deployStatus,
    deployLogs,
    deployError,
    setDeploymentId,
    setDeployStatus,
    addDeployLog,
    setDeployError,
    setInstanceId,
    setServerIp,
    setTunnelDomain,
    setStep,
    instanceName,
    anthropicKey,
    whatsappPhone,
    enabledIntegrations,
    hetznerToken,
    cloudflareToken,
    serverLocation,
  } = useDeployStore();

  const deployTracked = useRef(false);

  const startDeploy = useCallback(async () => {
    if (deploymentId) return;

    if (!deployTracked.current && mode) {
      analytics.deployStarted(mode);
      deployTracked.current = true;
    }

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          instanceName,
          anthropicKey,
          whatsappPhone,
          enabledIntegrations,
          ...(mode === 'hetzner' && { hetznerToken, cloudflareToken, serverLocation }),
        }),
      });

      // Local mode returns a ZIP file directly as bytes
      if (mode === 'local') {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Download failed.' }));
          analytics.deployFailed(mode ?? 'local', err.error ?? 'Download failed.');
          setDeployError(err.error ?? 'Download failed.');
          return;
        }
        // Trigger browser download from blob
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aegis-${instanceName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Clear secrets from client-side store immediately after submission
        useDeployStore.getState().setAnthropicKey('');
        useDeployStore.getState().setHetznerToken('');
        useDeployStore.getState().setCloudflareToken('');

        analytics.deployCompleted('local');
        setDeployStatus('completed');
        setStep(6);
        return;
      }

      // Hetzner mode returns JSON
      const data = await res.json();

      if (!res.ok) {
        analytics.deployFailed('hetzner', data.error ?? 'Deploy failed.');
        setDeployError(data.error ?? 'Deploy failed.');
        return;
      }

      // Clear secrets from client-side store immediately after submission
      useDeployStore.getState().setAnthropicKey('');
      useDeployStore.getState().setHetznerToken('');
      useDeployStore.getState().setCloudflareToken('');

      setDeploymentId(data.deploymentId);
      setInstanceId(data.instanceId);
      if (data.serverIp) setServerIp(data.serverIp);
      setDeployStatus('creating_server');
    } catch {
      analytics.deployFailed(mode ?? 'local', 'Network error. Please try again.');
      setDeployError('Network error. Please try again.');
    }
  }, [
    deploymentId, mode, instanceName, anthropicKey, whatsappPhone,
    enabledIntegrations, hetznerToken, cloudflareToken, serverLocation,
    setDeploymentId, setDeployStatus, setDeployError, setStep,
    setInstanceId, setServerIp,
  ]);

  // Poll for status updates
  useEffect(() => {
    if (!deploymentId || deployStatus === 'completed' || deployStatus === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/deploy/${deploymentId}/status`);
        if (!res.ok) return;

        const data = await res.json();
        setDeployStatus(data.status);

        if (data.logs?.length > deployLogs.length) {
          for (const log of data.logs.slice(deployLogs.length)) {
            addDeployLog(log);
          }
        }

        if (data.error) {
          setDeployError(data.error);
        }

        if (data.instanceId) setInstanceId(data.instanceId);
        if (data.serverIp) setServerIp(data.serverIp);
        if (data.tunnelDomain) setTunnelDomain(data.tunnelDomain);

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          if (data.status === 'completed') {
            analytics.deployCompleted('hetzner', data.instanceId);
            setStep(6);
          } else {
            analytics.deployFailed('hetzner', data.error ?? 'Deployment failed.');
          }
        }
      } catch {
        // Silently retry on poll failure
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [deploymentId, deployStatus, deployLogs.length, setDeployStatus, addDeployLog, setDeployError, setInstanceId, setServerIp, setTunnelDomain, setStep]);

  // Start deploy on mount
  useEffect(() => {
    startDeploy();
  }, [startDeploy]);

  const currentPhaseIndex = phases.findIndex((p) => p.id === deployStatus);

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-1 text-[18px] font-normal text-white">
        {deployError ? 'Deployment Failed' : 'Deploying Aegis'}
      </h2>
      <p className="mb-6 text-[13px] font-light text-[#fff9]">
        {deployError
          ? 'Something went wrong during deployment.'
          : 'This usually takes 3-5 minutes. Do not close this page.'}
      </p>

      {/* Phase indicators */}
      <div className="mb-6 space-y-2">
        {phases.slice(0, -1).map((phase, i) => {
          const isActive = phase.id === deployStatus;
          const isDone = currentPhaseIndex > i;

          return (
            <div key={phase.id} className="flex items-center gap-3">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${
                  isDone
                    ? 'bg-green-500/20 text-green-400'
                    : isActive
                      ? 'bg-[#7c6aef]/20 text-[#7c6aef]'
                      : 'border border-[#ffffff14] text-[#fff3]'
                }`}
              >
                {isDone ? '\u2713' : isActive ? (
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c6aef]" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[12px] ${
                  isDone ? 'text-green-400/80' : isActive ? 'text-white' : 'text-[#fff4]'
                }`}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-[#ffffff0d]">
        <div
          className="h-full rounded-full bg-[#7c6aef] transition-all duration-500"
          style={{ width: `${Math.max(5, ((currentPhaseIndex + 1) / phases.length) * 100)}%` }}
        />
      </div>

      {/* Log preview */}
      {deployLogs.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-3">
          {deployLogs.slice(-5).map((log, i) => (
            <p key={i} className="text-[10px] font-light text-[#fff6]">
              <span className="text-[#fff3]">{log.timestamp?.split('T')[1]?.slice(0, 8)}</span>{' '}
              {log.message}
            </p>
          ))}
        </div>
      )}

      {/* Error */}
      {deployError && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-[12px] text-red-400">{deployError}</p>
          <button
            onClick={() => {
              setDeployError('');
              setDeploymentId(null);
              setDeployStatus('');
              setStep(4);
            }}
            className="mt-2 text-[11px] text-[#fffc] hover:text-white"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
