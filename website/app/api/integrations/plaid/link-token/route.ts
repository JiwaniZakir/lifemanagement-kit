import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Auth required.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const instanceId = url.searchParams.get('instanceId');
  if (!instanceId) {
    return Response.json({ error: 'instanceId required.' }, { status: 400 });
  }

  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, instanceId), eq(instances.userId, session.user.id)))
    .limit(1);

  if (!instance) {
    return Response.json({ error: 'Instance not found.' }, { status: 404 });
  }

  // Proxy to the deployed instance's data-api to create Plaid link token
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
    const res = await fetch(`${baseUrl}/finance/plaid/link-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config?.dataApiToken ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: session.user.id }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return Response.json({ error: 'Failed to create link token.' }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ linkToken: data.link_token });
  } catch (error) {
    console.error('Plaid link token proxy error:', error);
    return Response.json({ error: 'Instance unreachable.' }, { status: 503 });
  }
}
