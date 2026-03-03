import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';
import { OpenClawHome } from '@/components/home/openclaw-home';
import { redirect, notFound } from 'next/navigation';

export default async function InstanceHomePage({
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

  const config = (instance.config ?? {}) as Record<string, unknown>;
  const enabledSkills = Array.isArray(config.enabledSkills)
    ? (config.enabledSkills as string[])
    : [
        'aegis-finance',
        'aegis-calendar',
        'aegis-lms',
        'aegis-health',
        'aegis-social',
        'aegis-content',
        'aegis-briefing',
        'aegis-security',
      ];

  return (
    <OpenClawHome
      instanceId={instance.id}
      instanceName={instance.name}
      enabledSkills={enabledSkills}
    />
  );
}
