import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';

/**
 * Returns true only for routable public IP addresses.
 * Rejects loopback, private (RFC 1918), link-local, multicast, and IPv6 loopback.
 */
function isPublicIp(ip: string): boolean {
  // IPv6 loopback
  if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1') return false;

  // IPv4
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return false;

  const [a, b] = nums;

  // 0.0.0.0/8 — current network
  if (a === 0) return false;
  // 10.0.0.0/8 — private
  if (a === 10) return false;
  // 127.0.0.0/8 — loopback
  if (a === 127) return false;
  // 169.254.0.0/16 — link-local
  if (a === 169 && b === 254) return false;
  // 172.16.0.0/12 — private
  if (a === 172 && b >= 16 && b <= 31) return false;
  // 192.168.0.0/16 — private
  if (a === 192 && b === 168) return false;
  // 224.0.0.0/4 — multicast
  if (a >= 224 && a <= 239) return false;
  // 240.0.0.0/4 — reserved
  if (a >= 240) return false;

  return true;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await params;

  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, id), eq(instances.userId, session.user.id)))
    .limit(1);

  if (!instance) {
    return Response.json({ error: 'Instance not found.' }, { status: 404 });
  }

  if (!instance.tunnelDomain && !instance.serverIp) {
    return Response.json({ status: instance.status, healthy: false });
  }

  // SSRF protection: validate the IP is a public address when not using a tunnel domain
  if (!instance.tunnelDomain && instance.serverIp && !isPublicIp(instance.serverIp)) {
    return Response.json(
      { error: 'Server IP is not a valid public address.' },
      { status: 400 },
    );
  }

  // Proxy health check to the deployed instance
  const baseUrl = instance.tunnelDomain
    ? `https://${instance.tunnelDomain}`
    : `http://${instance.serverIp}:8000`;

  try {
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const healthy = res.ok;

    // Update instance status if it changed
    const newStatus = healthy ? 'healthy' : 'unhealthy';
    if (newStatus !== instance.status) {
      await db
        .update(instances)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(instances.id, id));
    }

    return Response.json({ status: newStatus, healthy });
  } catch (error) {
    console.error('Health check proxy error:', error);
    return Response.json({ status: 'unhealthy', healthy: false });
  }
}
