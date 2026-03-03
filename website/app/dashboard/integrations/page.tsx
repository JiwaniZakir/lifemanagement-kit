import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { instances } from '@/lib/db/schema';
import { InstanceSelector } from '@/components/integrations/instance-selector';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userInstances = await db
    .select()
    .from(instances)
    .where(eq(instances.userId, session.user.id))
    .orderBy(instances.createdAt);

  if (userInstances.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-[22px] font-normal text-white">Integrations</h1>
        <div className="flex flex-col items-center rounded-xl border border-[#ffffff0d] bg-[#ffffff06] py-12 backdrop-blur-xl">
          <p className="mb-2 text-[14px] text-white">No instances to configure</p>
          <p className="mb-4 text-[12px] text-[#fff6]">Deploy an instance first to manage integrations.</p>
          <Link
            href="/deploy"
            className="rounded-lg bg-[#7c6aef] px-6 py-2 text-[12px] font-medium text-white hover:bg-[#6b5bd6]"
          >
            Deploy Instance
          </Link>
        </div>
      </div>
    );
  }

  const serializedInstances = userInstances.map((inst) => ({
    id: inst.id,
    name: inst.name,
    provider: inst.provider,
    status: inst.status,
  }));

  return (
    <div>
      <h1 className="mb-6 text-[22px] font-normal text-white">Integrations</h1>
      <InstanceSelector instances={serializedInstances} />
    </div>
  );
}
