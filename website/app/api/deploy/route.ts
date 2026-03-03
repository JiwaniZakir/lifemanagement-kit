import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances, deployments } from '@/lib/db/schema';
import { createServer } from '@/lib/deploy/hetzner';
import { generateCloudInit } from '@/lib/deploy/cloud-init-template';
import { generateLocalBundle } from '@/lib/deploy/local-bundle';
import { deployBodySchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // Rate limit: 5 deploys per user per hour
  const rateLimit = checkRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = deployBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed.' },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const { mode, instanceName, anthropicKey, whatsappPhone, enabledIntegrations } = body;

  // Local mode: generate and return ZIP
  if (mode === 'local') {
    try {
      const buffer = await generateLocalBundle({
        instanceName,
        anthropicKey,
        whatsappPhone,
        enabledIntegrations,
      });

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="aegis-${instanceName}.zip"`,
        },
      });
    } catch (error) {
      console.error('Bundle generation error:', error);
      return Response.json({ error: 'Failed to generate bundle.' }, { status: 500 });
    }
  }

  // Hetzner mode
  const { hetznerToken, cloudflareToken, serverLocation } = body;

  // Validate Hetzner token before creating any DB records
  try {
    const hetznerCheck = await fetch('https://api.hetzner.cloud/v1/servers?per_page=1', {
      headers: { Authorization: `Bearer ${hetznerToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!hetznerCheck.ok) {
      return Response.json({ error: 'Invalid Hetzner API token.' }, { status: 400 });
    }
  } catch {
    return Response.json({ error: 'Invalid Hetzner API token.' }, { status: 400 });
  }

  let instanceId: string | undefined;

  try {
    // Create instance record
    const [instance] = await db
      .insert(instances)
      .values({
        userId: session.user.id,
        name: instanceName,
        provider: 'hetzner',
        status: 'provisioning',
        config: { enabledIntegrations },
      })
      .returning();

    instanceId = instance.id;

    // Create deployment record with webhook secret
    const webhookSecret = crypto.randomUUID();
    const [deployment] = await db
      .insert(deployments)
      .values({
        instanceId: instance.id,
        status: 'pending',
        webhookSecret,
        hetznerToken,
        anthropicKey,
      })
      .returning();

    // Generate cloud-init with webhook callback
    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://aegis-docs.vercel.app';
    const userData = generateCloudInit({
      webhookUrl: `${baseUrl}/api/deploy/webhook?id=${deployment.id}`,
      webhookSecret,
      anthropicKey,
      whatsappPhone,
      instanceName,
      enabledIntegrations,
      cloudflareToken,
      tunnelName: instanceName,
    });

    // Create Hetzner server — if this fails, clean up orphaned DB records
    let server;
    try {
      server = await createServer({
        name: `aegis-${instanceName}`,
        location: serverLocation,
        token: hetznerToken,
        userData,
      });
    } catch (hetznerError) {
      // Clean up: delete instance (deployment cascades via ON DELETE CASCADE)
      await db.delete(instances).where(eq(instances.id, instance.id));
      throw hetznerError;
    }

    // Update instance with server details
    await db
      .update(instances)
      .set({
        serverId: String(server.id),
        serverIp: server.public_net.ipv4.ip,
        status: 'bootstrapping',
      })
      .where(eq(instances.id, instance.id));

    // Update deployment status
    await db
      .update(deployments)
      .set({ status: 'creating_server' })
      .where(eq(deployments.id, deployment.id));

    return Response.json({
      deploymentId: deployment.id,
      instanceId: instance.id,
      serverIp: server.public_net.ipv4.ip,
    });
  } catch (error) {
    console.error('Deploy error:', error);

    // If we created an instance but failed after the Hetzner call (e.g. during
    // the DB update), mark the instance as destroyed so it doesn't linger.
    if (instanceId) {
      try {
        await db
          .update(instances)
          .set({ status: 'destroyed' })
          .where(eq(instances.id, instanceId));
      } catch (cleanupError) {
        console.error('Failed to mark instance as destroyed during cleanup:', cleanupError);
      }
    }

    return Response.json(
      { error: error instanceof Error ? error.message : 'Deployment failed.' },
      { status: 500 },
    );
  }
}
