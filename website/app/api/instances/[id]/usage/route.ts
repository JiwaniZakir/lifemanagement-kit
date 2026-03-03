import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';

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
    return Response.json({ error: 'Instance not reachable.' }, { status: 503 });
  }

  // Proxy budget/usage endpoint from the deployed data-api
  const baseUrl = instance.tunnelDomain
    ? `https://${instance.tunnelDomain}`
    : `http://${instance.serverIp}:8000`;

  try {
    const config = instance.config as Record<string, string> | null;
    const res = await fetch(`${baseUrl}/budget/usage`, {
      headers: {
        Authorization: `Bearer ${config?.dataApiToken ?? ''}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch usage.' }, { status: 502 });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error('Usage proxy error:', error);
    return Response.json({ error: 'Instance unreachable.' }, { status: 503 });
  }
}
