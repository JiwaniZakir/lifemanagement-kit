import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, id), eq(instances.userId, session.user.id)))
    .limit(1);

  if (!instance) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // NOTE: If the instance has a serverId, the Hetzner server still exists remotely.
  // The Hetzner API token is stored on the deployment record and cleared after deploy
  // completes, so we cannot programmatically delete the server from here. The user
  // must manually delete the server from the Hetzner Cloud console.
  // Deleting the instance record cascades to deployments via ON DELETE CASCADE.
  await db.delete(instances).where(eq(instances.id, id));

  return NextResponse.json({
    success: true,
    ...(instance.serverId
      ? {
          warning:
            'The Hetzner server was not deleted. Please remove it manually from the Hetzner Cloud console.',
        }
      : {}),
  });
}
