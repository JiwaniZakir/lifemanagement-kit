import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deployments, instances } from '@/lib/db/schema';
import { timingSafeEqual } from 'crypto';
import { webhookBodySchema } from '@/lib/validations';

function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const deploymentId = url.searchParams.get('id');

  if (!deploymentId) {
    return Response.json({ error: 'Missing deployment id.' }, { status: 400 });
  }

  const secret = request.headers.get('X-Webhook-Secret');
  if (!secret) {
    return Response.json({ error: 'Missing webhook secret.' }, { status: 401 });
  }

  // Look up deployment
  const [deployment] = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, deploymentId))
    .limit(1);

  if (!deployment || !deployment.webhookSecret) {
    return Response.json({ error: 'Deployment not found.' }, { status: 404 });
  }

  // Constant-time compare webhook secret
  if (!constantTimeCompare(secret, deployment.webhookSecret)) {
    return Response.json({ error: 'Invalid webhook secret.' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const parsed = webhookBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed.' }, { status: 400 });
  }

  const { step, message, timestamp } = parsed.data;

  // Append to logs
  const existingLogs = (deployment.logs ?? []) as { step: string; message: string; timestamp: string }[];
  const updatedLogs = [...existingLogs, { step, message, timestamp }];

  // Map step to deployment status
  const validStatuses = [
    'creating_server', 'installing', 'cloning', 'bootstrapping',
    'configuring', 'health_check', 'completed', 'failed',
  ] as const;
  const status = validStatuses.includes(step as typeof validStatuses[number])
    ? (step as typeof validStatuses[number])
    : deployment.status;

  await db
    .update(deployments)
    .set({
      status,
      currentStep: step,
      logs: updatedLogs,
      updatedAt: new Date(),
    })
    .where(eq(deployments.id, deploymentId));

  // Update instance status on completion
  if (step === 'completed') {
    await db
      .update(instances)
      .set({ status: 'healthy', updatedAt: new Date() })
      .where(eq(instances.id, deployment.instanceId));

    // Clear ephemeral tokens
    await db
      .update(deployments)
      .set({ hetznerToken: null, anthropicKey: null })
      .where(eq(deployments.id, deploymentId));
  }

  if (step === 'failed') {
    await db
      .update(instances)
      .set({ status: 'unhealthy', updatedAt: new Date() })
      .where(eq(instances.id, deployment.instanceId));
  }

  return Response.json({ ok: true });
}
