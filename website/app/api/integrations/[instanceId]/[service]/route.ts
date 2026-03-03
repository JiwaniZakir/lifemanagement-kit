import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances, integrations } from '@/lib/db/schema';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ instanceId: string; service: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Auth required.' }, { status: 401 });
  }

  const { instanceId, service } = await params;

  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, instanceId), eq(instances.userId, session.user.id)))
    .limit(1);

  if (!instance) {
    return Response.json({ error: 'Not found.' }, { status: 404 });
  }

  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.instanceId, instanceId), eq(integrations.service, service)))
    .limit(1);

  if (!integration) {
    return Response.json({ service, status: 'disconnected' });
  }

  return Response.json({
    service: integration.service,
    status: integration.status,
    metadata: integration.metadata,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ instanceId: string; service: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Auth required.' }, { status: 401 });
  }

  const { instanceId, service } = await params;

  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, instanceId), eq(instances.userId, session.user.id)))
    .limit(1);

  if (!instance) {
    return Response.json({ error: 'Not found.' }, { status: 404 });
  }

  await db
    .update(integrations)
    .set({ status: 'disconnected', updatedAt: new Date() })
    .where(and(eq(integrations.instanceId, instanceId), eq(integrations.service, service)));

  return Response.json({ ok: true });
}
