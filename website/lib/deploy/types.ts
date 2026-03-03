export type DeployMode = 'local' | 'hetzner';

export type DeployStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface DeployConfig {
  instanceName: string;
  anthropicKey: string;
  whatsappPhone: string;
  enabledIntegrations: string[];
}

export interface HetznerConfig {
  hetznerToken: string;
  cloudflareToken: string;
  serverLocation: string;
}

export type DeploymentPhase =
  | 'creating_server'
  | 'installing'
  | 'cloning'
  | 'bootstrapping'
  | 'configuring'
  | 'health_check'
  | 'completed'
  | 'failed';

export interface DeploymentLog {
  step: string;
  message: string;
  timestamp: string;
}

export interface DeploymentStatus {
  id: string;
  status: DeploymentPhase;
  currentStep: string;
  logs: DeploymentLog[];
  error?: string;
  instanceId?: string;
  serverIp?: string;
  tunnelDomain?: string;
}
