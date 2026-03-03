import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const deleted = await db
      .delete(users)
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id });

    if (deleted.length === 0) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return Response.json({ error: 'Failed to delete account.' }, { status: 500 });
  }
}
