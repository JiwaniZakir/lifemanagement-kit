const HETZNER_API = 'https://api.hetzner.cloud/v1';

interface CreateServerOptions {
  name: string;
  location: string;
  token: string;
  userData: string;
  sshKeyIds?: number[];
}

interface HetznerServer {
  id: number;
  name: string;
  status: string;
  public_net: {
    ipv4: { ip: string };
    ipv6: { ip: string };
  };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create a Hetzner CX22 server with cloud-init user_data.
 * CX22 = 2 vCPU, 4GB RAM, 40GB disk, ~$4.49/mo
 */
export async function createServer(opts: CreateServerOptions): Promise<HetznerServer> {
  const res = await fetch(`${HETZNER_API}/servers`, {
    method: 'POST',
    headers: headers(opts.token),
    body: JSON.stringify({
      name: opts.name,
      server_type: 'cx22',
      location: opts.location,
      image: 'ubuntu-24.04',
      user_data: opts.userData,
      ssh_keys: opts.sshKeyIds ?? [],
      labels: { app: 'aegis', managed: 'true' },
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Hetzner API error: ${error.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  return data.server;
}

/**
 * Get server status from Hetzner.
 */
export async function getServerStatus(
  token: string,
  serverId: number,
): Promise<HetznerServer> {
  const res = await fetch(`${HETZNER_API}/servers/${serverId}`, {
    headers: headers(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to get server status: ${res.statusText}`);
  }

  const data = await res.json();
  return data.server;
}

/**
 * Delete a Hetzner server.
 */
export async function deleteServer(token: string, serverId: number): Promise<void> {
  const res = await fetch(`${HETZNER_API}/servers/${serverId}`, {
    method: 'DELETE',
    headers: headers(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to delete server: ${res.statusText}`);
  }
}
