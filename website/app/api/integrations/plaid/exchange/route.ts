import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances, integrations } from '@/lib/db/schema';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Auth required.' }, { status: 401 });
  }

  let body: { instanceId: string; publicToken: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const { instanceId, publicToken } = body;

  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, instanceId), eq(instances.userId, session.user.id)))
    .limit(1);

  if (!instance) {
    return Response.json({ error: 'Instance not found.' }, { status: 404 });
  }

  const baseUrl = instance.tunnelDomain
    ? `https://${instance.tunnelDomain}`
    : instance.serverIp
      ? `http://${instance.serverIp}:8000`
      : null;

  if (!baseUrl) {
    return Response.json({ error: 'Instance not reachable.' }, { status: 503 });
  }

  try {
    const config = instance.config as Record<string, string> | null;
    const res = await fetch(`${baseUrl}/finance/plaid/exchange`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config?.dataApiToken ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicToken }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return Response.json({ error: 'Token exchange failed.' }, { status: 502 });
    }

    // Update integration status
    const existing = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.instanceId, instanceId), eq(integrations.service, 'plaid')))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(integrations)
        .set({ status: 'connected', updatedAt: new Date() })
        .where(eq(integrations.id, existing[0].id));
    } else {
      await db.insert(integrations).values({
        instanceId,
        service: 'plaid',
        status: 'connected',
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Plaid exchange proxy error:', error);
    return Response.json({ error: 'Instance unreachable.' }, { status: 503 });
  }
}
