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
    return Response.json({ error: 'Auth required.' }, { status: 401 });
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

  // Proxy QR code from the OpenClaw gateway
  const gatewayBase = instance.tunnelDomain
    ? `https://${instance.tunnelDomain}`
    : instance.serverIp
      ? `http://${instance.serverIp}:18789`
      : null;

  if (!gatewayBase) {
    return Response.json({ error: 'Instance not reachable.' }, { status: 503 });
  }

  try {
    const res = await fetch(`${gatewayBase}/api/whatsapp/qr`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      // Gateway might not have QR endpoint or device is already paired
      return Response.json({ paired: true });
    }

    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: 'Could not reach gateway.' }, { status: 503 });
  }
}
