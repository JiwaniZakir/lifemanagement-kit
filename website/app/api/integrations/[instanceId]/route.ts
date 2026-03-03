import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances, integrations } from '@/lib/db/schema';
import { connectIntegrationSchema } from '@/lib/validations';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ instanceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Auth required.' }, { status: 401 });
  }

  const { instanceId } = await params;

  // Verify ownership
  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, instanceId), eq(instances.userId, session.user.id)))
    .limit(1);

  if (!instance) {
    return Response.json({ error: 'Instance not found.' }, { status: 404 });
  }

  const result = await db
    .select({ service: integrations.service, status: integrations.status })
    .from(integrations)
    .where(eq(integrations.instanceId, instanceId));

  return Response.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Auth required.' }, { status: 401 });
  }

  const { instanceId } = await params;

  // Verify ownership
  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, instanceId), eq(instances.userId, session.user.id)))
    .limit(1);

  if (!instance) {
    return Response.json({ error: 'Instance not found.' }, { status: 404 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const parsed = connectIntegrationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed.' },
      { status: 400 },
    );
  }

  const { service, credentials } = parsed.data;

  // Proxy credential storage to the deployed instance's data-api
  const baseUrl = instance.tunnelDomain
    ? `https://${instance.tunnelDomain}`
    : instance.serverIp
      ? `http://${instance.serverIp}:8000`
      : null;

  if (baseUrl) {
    try {
      const config = instance.config as Record<string, string> | null;
      const res = await fetch(`${baseUrl}/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config?.dataApiToken ?? ''}`,
        },
        body: JSON.stringify({
          service,
          ...credentials,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return Response.json({ error: 'Failed to store credentials on instance.' }, { status: 502 });
      }
    } catch (error) {
      console.error('Integration connect proxy error:', error);
      return Response.json({ error: 'Instance unreachable.' }, { status: 503 });
    }
  }

  // Upsert integration status in website DB
  const existing = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.instanceId, instanceId), eq(integrations.service, service)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(integrations)
      .set({ status: 'connected', updatedAt: new Date() })
      .where(eq(integrations.id, existing[0].id));
  } else {
    await db.insert(integrations).values({
      instanceId,
      service,
      status: 'connected',
    });
  }

  return Response.json({ ok: true });
}
