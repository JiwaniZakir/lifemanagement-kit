import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { deployments, instances } from '@/lib/db/schema';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await params;

  const [deployment] = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, id))
    .limit(1);

  if (!deployment) {
    return Response.json({ error: 'Deployment not found.' }, { status: 404 });
  }

  // Verify ownership
  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.id, deployment.instanceId))
    .limit(1);

  if (!instance || instance.userId !== session.user.id) {
    return Response.json({ error: 'Not found.' }, { status: 404 });
  }

  // Auto-fail stale deployments: if a deployment has been in a non-terminal
  // status for more than 15 minutes, mark it as failed.
  const STALE_THRESHOLD_MS = 15 * 60 * 1000;
  const terminalStatuses = ['completed', 'failed'];
  let currentStatus = deployment.status;
  let currentError = deployment.error;

  if (!terminalStatuses.includes(currentStatus)) {
    const updatedAt = new Date(deployment.updatedAt).getTime();
    const now = Date.now();

    if (now - updatedAt > STALE_THRESHOLD_MS) {
      currentStatus = 'failed';
      currentError = 'Deployment timed out.';

      await db
        .update(deployments)
        .set({ status: 'failed', error: currentError })
        .where(eq(deployments.id, deployment.id));

      await db
        .update(instances)
        .set({ status: 'unhealthy' })
        .where(eq(instances.id, instance.id));
    }
  }

  return Response.json({
    id: deployment.id,
    status: currentStatus,
    currentStep: deployment.currentStep,
    logs: deployment.logs ?? [],
    error: currentError,
    instanceId: instance.id,
    serverIp: instance.serverIp,
    tunnelDomain: instance.tunnelDomain,
  });
}
