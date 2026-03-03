import posthog from 'posthog-js';

export const analytics = {
  // Deploy flow
  deployModeSelected: (mode: 'local' | 'hetzner') =>
    posthog.capture('deploy_mode_selected', { mode }),
  deployConfigured: (config: {
    instanceName: string;
    integrationsCount: number;
    hasWhatsapp: boolean;
  }) => posthog.capture('deploy_configured', config),
  deployProviderConfigured: (location: string) =>
    posthog.capture('deploy_provider_configured', { location }),
  deployReviewed: (mode: 'local' | 'hetzner') =>
    posthog.capture('deploy_reviewed', { mode }),
  deployStarted: (mode: 'local' | 'hetzner') =>
    posthog.capture('deploy_started', { mode }),
  deployCompleted: (mode: 'local' | 'hetzner', instanceId?: string) =>
    posthog.capture('deploy_completed', { mode, instanceId }),
  deployFailed: (mode: 'local' | 'hetzner', error: string) =>
    posthog.capture('deploy_failed', { mode, error }),

  // Auth
  signInClicked: (provider: string) =>
    posthog.capture('sign_in_clicked', { provider }),
  signedIn: (provider: string) => posthog.capture('signed_in', { provider }),

  // Billing
  pricingViewed: () => posthog.capture('pricing_viewed'),
  checkoutStarted: () => posthog.capture('checkout_started'),
  subscriptionChanged: (status: string) =>
    posthog.capture('subscription_changed', { status }),

  // Integrations
  integrationConnected: (service: string, instanceId: string) =>
    posthog.capture('integration_connected', { service, instanceId }),
  integrationDisconnected: (service: string, instanceId: string) =>
    posthog.capture('integration_disconnected', { service, instanceId }),

  // Dashboard
  instanceViewed: (instanceId: string) =>
    posthog.capture('instance_viewed', { instanceId }),
  instanceDeleted: (instanceId: string) =>
    posthog.capture('instance_deleted', { instanceId }),
  skillToggled: (skill: string, enabled: boolean) =>
    posthog.capture('skill_toggled', { skill, enabled }),
  whatsappPairingStarted: () => posthog.capture('whatsapp_pairing_started'),
  whatsappPaired: () => posthog.capture('whatsapp_paired'),

  // Community
  featureSubmitted: (title: string) =>
    posthog.capture('feature_submitted', { title }),
  featureForked: (issueNumber: number) =>
    posthog.capture('feature_forked', { issueNumber }),

  // User identification
  identify: (userId: string, properties?: Record<string, unknown>) =>
    posthog.identify(userId, properties),
};
