import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userInstances = await db
    .select()
    .from(instances)
    .where(eq(instances.userId, session.user.id))
    .orderBy(instances.createdAt);

  return Response.json(userInstances);
}
