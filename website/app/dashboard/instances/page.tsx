import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { instances } from '@/lib/db/schema';
import { InstanceCard } from '@/components/dashboard/instance-card';
import { redirect } from 'next/navigation';
import Link from 'next/link';

type Instance = typeof instances.$inferSelect;

async function getInstances(userId: string): Promise<{ data: Instance[]; dbError: boolean }> {
  try {
    const { db } = await import('@/lib/db');
    const rows = await db
      .select()
      .from(instances)
      .where(eq(instances.userId, userId))
      .orderBy(instances.createdAt);
    return { data: rows, dbError: false };
  } catch (error) {
    console.error('Instances DB error:', error);
    return { data: [], dbError: true };
  }
}

export default async function InstancesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { data: userInstances, dbError } = await getInstances(session.user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[22px] font-normal text-white">Instances</h1>
        <Link
          href="/deploy"
          className="rounded-lg bg-[#7c6aef] px-4 py-2 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
        >
          + New Instance
        </Link>
      </div>

      {dbError ? (
        <div className="flex flex-col items-center rounded-xl border border-yellow-500/20 bg-yellow-500/5 py-12 backdrop-blur-xl">
          <p className="mb-2 text-[14px] text-yellow-300">Database unavailable</p>
          <p className="text-[12px] text-[#fff6]">
            Instance data could not be loaded. Check your POSTGRES_URL configuration.
          </p>
        </div>
      ) : userInstances.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-[#ffffff0d] bg-[#ffffff06] py-12 backdrop-blur-xl">
          <p className="mb-2 text-[14px] text-white">No instances</p>
          <p className="mb-4 text-[12px] text-[#fff6]">Deploy your first Aegis instance.</p>
          <Link
            href="/deploy"
            className="rounded-lg bg-[#7c6aef] px-6 py-2 text-[12px] font-medium text-white hover:bg-[#6b5bd6]"
          >
            Deploy Now
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userInstances.map((instance) => (
            <InstanceCard
              key={instance.id}
              id={instance.id}
              name={instance.name}
              provider={instance.provider}
              status={instance.status}
              serverIp={instance.serverIp}
              tunnelDomain={instance.tunnelDomain}
            />
          ))}
        </div>
      )}
    </div>
  );
}
