import { create } from 'zustand';
import type { DeployMode, DeployStep, DeploymentLog } from '@/lib/deploy/types';

interface DeployState {
  // Wizard navigation
  step: DeployStep;
  setStep: (step: DeployStep) => void;

  // Step 1: Mode
  mode: DeployMode | null;
  setMode: (mode: DeployMode) => void;

  // Step 2: Configure
  instanceName: string;
  setInstanceName: (name: string) => void;
  anthropicKey: string;
  setAnthropicKey: (key: string) => void;
  whatsappPhone: string;
  setWhatsappPhone: (phone: string) => void;
  enabledIntegrations: string[];
  toggleIntegration: (id: string) => void;

  // Step 3: Provider (Hetzner only)
  hetznerToken: string;
  setHetznerToken: (token: string) => void;
  cloudflareToken: string;
  setCloudflareToken: (token: string) => void;
  serverLocation: string;
  setServerLocation: (location: string) => void;

  // Step 4: Deploying
  deploymentId: string | null;
  setDeploymentId: (id: string | null) => void;
  deployStatus: string;
  setDeployStatus: (status: string) => void;
  deployLogs: DeploymentLog[];
  addDeployLog: (log: DeploymentLog) => void;
  deployError: string;
  setDeployError: (error: string) => void;

  // Step 5: Complete
  instanceId: string | null;
  setInstanceId: (id: string | null) => void;
  serverIp: string;
  setServerIp: (ip: string) => void;
  tunnelDomain: string;
  setTunnelDomain: (domain: string) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  step: 1 as DeployStep,
  mode: null as DeployMode | null,
  instanceName: '',
  anthropicKey: '',
  whatsappPhone: '',
  enabledIntegrations: [] as string[],
  hetznerToken: '',
  cloudflareToken: '',
  serverLocation: 'nbg1',
  deploymentId: null as string | null,
  deployStatus: '',
  deployLogs: [] as DeploymentLog[],
  deployError: '',
  instanceId: null as string | null,
  serverIp: '',
  tunnelDomain: '',
};

export const useDeployStore = create<DeployState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setMode: (mode) => set({ mode }),
  setInstanceName: (instanceName) => set({ instanceName }),
  setAnthropicKey: (anthropicKey) => set({ anthropicKey }),
  setWhatsappPhone: (whatsappPhone) => set({ whatsappPhone }),
  toggleIntegration: (id) =>
    set((s) => ({
      enabledIntegrations: s.enabledIntegrations.includes(id)
        ? s.enabledIntegrations.filter((i) => i !== id)
        : [...s.enabledIntegrations, id],
    })),
  setHetznerToken: (hetznerToken) => set({ hetznerToken }),
  setCloudflareToken: (cloudflareToken) => set({ cloudflareToken }),
  setServerLocation: (serverLocation) => set({ serverLocation }),
  setDeploymentId: (deploymentId) => set({ deploymentId }),
  setDeployStatus: (deployStatus) => set({ deployStatus }),
  addDeployLog: (log) => set((s) => ({ deployLogs: [...s.deployLogs, log] })),
  setDeployError: (deployError) => set({ deployError }),
  setInstanceId: (instanceId) => set({ instanceId }),
  setServerIp: (serverIp) => set({ serverIp }),
  setTunnelDomain: (tunnelDomain) => set({ tunnelDomain }),

  reset: () => set(initialState),
}));
