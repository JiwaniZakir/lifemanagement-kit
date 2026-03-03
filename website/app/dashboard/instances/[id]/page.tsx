import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';
import { InstanceDetail } from '@/components/dashboard/instance-detail';
import { redirect, notFound } from 'next/navigation';

export default async function InstanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, id), eq(instances.userId, session.user.id)))
    .limit(1);

  if (!instance) notFound();

  return (
    <InstanceDetail
      instance={{
        id: instance.id,
        name: instance.name,
        provider: instance.provider,
        status: instance.status,
        serverIp: instance.serverIp,
        tunnelDomain: instance.tunnelDomain,
        createdAt: instance.createdAt.toISOString(),
        config: instance.config,
      }}
    />
  );
}
