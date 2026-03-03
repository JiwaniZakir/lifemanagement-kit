import { ne, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Authenticate via Bearer token (not NextAuth — cron jobs don't have user sessions)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return Response.json(
      { error: 'CRON_SECRET is not configured.' },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json(
      { error: 'Unauthorized.' },
      { status: 401 },
    );
  }

  // Query all instances that are not destroyed
  const activeInstances = await db
    .select()
    .from(instances)
    .where(ne(instances.status, 'destroyed'));

  let checked = 0;
  let healthy = 0;
  let unhealthy = 0;

  for (const instance of activeInstances) {
    // Skip instances without a reachable endpoint
    if (!instance.tunnelDomain && !instance.serverIp) {
      continue;
    }

    checked++;

    const baseUrl = instance.tunnelDomain
      ? `https://${instance.tunnelDomain}`
      : `http://${instance.serverIp}:8000`;

    let isHealthy = false;

    try {
      const res = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(10_000),
      });
      isHealthy = res.ok;
    } catch {
      isHealthy = false;
    }

    const newStatus = isHealthy ? 'healthy' : 'unhealthy';

    if (isHealthy) {
      healthy++;
    } else {
      unhealthy++;
    }

    // Update instance status if it changed
    if (newStatus !== instance.status) {
      await db
        .update(instances)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(instances.id, instance.id));
    }
  }

  return Response.json({ checked, healthy, unhealthy });
}
