import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';

export async function POST(
  request: Request,
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

  let body: { skillId: string; enabled: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const { skillId, enabled } = body;
  const config = (instance.config ?? {}) as Record<string, unknown>;
  const currentSkills = Array.isArray(config.enabledSkills)
    ? (config.enabledSkills as string[])
    : [];

  const updatedSkills = enabled
    ? [...new Set([...currentSkills, skillId])]
    : currentSkills.filter((s) => s !== skillId);

  await db
    .update(instances)
    .set({
      config: { ...config, enabledSkills: updatedSkills },
      updatedAt: new Date(),
    })
    .where(eq(instances.id, id));

  return Response.json({ ok: true, enabledSkills: updatedSkills });
}
