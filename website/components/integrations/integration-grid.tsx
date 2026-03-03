'use client';

import { useEffect, useState, useCallback } from 'react';
import { IntegrationCard } from './integration-card';
import { PlaidConnect } from './plaid-connect';
import { GoogleOAuthConnect } from './google-oauth-connect';
import { CanvasConnect } from './canvas-connect';
import { GarminConnect } from './garmin-connect';

interface IntegrationStatus {
  service: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
}

const integrationDefs = [
  { service: 'plaid', label: 'Banking (Plaid)', description: 'Bank accounts and transactions', icon: '🏦' },
  { service: 'schwab', label: 'Investments (Schwab)', description: 'Portfolio and positions', icon: '📈' },
  { service: 'canvas', label: 'Canvas LMS', description: 'Assignments and grades', icon: '📚' },
  { service: 'google-calendar', label: 'Google Calendar', description: 'Events and scheduling', icon: '📅' },
  { service: 'outlook', label: 'Outlook Calendar', description: 'Microsoft calendar', icon: '📆' },
  { service: 'garmin', label: 'Garmin Connect', description: 'Health and fitness data', icon: '⌚' },
  { service: 'linkedin', label: 'LinkedIn', description: 'Post content to LinkedIn', icon: '💼' },
  { service: 'x', label: 'X / Twitter', description: 'Post content to X', icon: '🐦' },
];

export function IntegrationGrid({ instanceId }: { instanceId: string }) {
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [connectingService, setConnectingService] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/integrations/${instanceId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setStatuses)
      .catch(() => []);
  }, [instanceId]);

  const getStatus = useCallback(
    (service: string): 'disconnected' | 'connecting' | 'connected' | 'error' => {
      return statuses.find((s) => s.service === service)?.status ?? 'disconnected';
    },
    [statuses],
  );

  const handleConnect = (service: string) => {
    setConnectingService(service);
  };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrationDefs.map((def) => (
          <IntegrationCard
            key={def.service}
            {...def}
            status={getStatus(def.service)}
            instanceId={instanceId}
            onConnect={() => handleConnect(def.service)}
          />
        ))}
      </div>

      {/* Connection modals */}
      {connectingService === 'plaid' && (
        <PlaidConnect instanceId={instanceId} onClose={() => setConnectingService(null)} />
      )}
      {connectingService === 'google-calendar' && (
        <GoogleOAuthConnect instanceId={instanceId} onClose={() => setConnectingService(null)} />
      )}
      {connectingService === 'canvas' && (
        <CanvasConnect instanceId={instanceId} onClose={() => setConnectingService(null)} />
      )}
      {connectingService === 'garmin' && (
        <GarminConnect instanceId={instanceId} onClose={() => setConnectingService(null)} />
      )}
    </div>
  );
}
