import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { instances, deployments } from '@/lib/db/schema';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type Instance = typeof instances.$inferSelect;
type Deployment = typeof deployments.$inferSelect;

interface DashboardData {
  instances: Instance[];
  latestDeployment: Deployment | null;
  dbError: boolean;
}

async function getDashboardData(userId: string): Promise<DashboardData> {
  try {
    const { db } = await import('@/lib/db');
    const rows = await db
      .select()
      .from(instances)
      .where(eq(instances.userId, userId))
      .orderBy(desc(instances.updatedAt));

    let latestDeployment: Deployment | null = null;
    if (rows.length > 0) {
      const deploys = await db
        .select()
        .from(deployments)
        .where(eq(deployments.instanceId, rows[0].id))
        .orderBy(desc(deployments.createdAt))
        .limit(1);
      latestDeployment = deploys[0] ?? null;
    }

    return { instances: rows, latestDeployment, dbError: false };
  } catch (error) {
    console.error('Dashboard DB error:', error);
    return { instances: [], latestDeployment: null, dbError: true };
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'border-green-500/20 bg-green-500/10 text-green-400',
    unhealthy: 'border-red-500/20 bg-red-500/10 text-red-400',
    provisioning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
    bootstrapping: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
    configuring: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    destroyed: 'border-[#ffffff14] bg-[#ffffff08] text-[#fff6]',
    completed: 'border-green-500/20 bg-green-500/10 text-green-400',
    failed: 'border-red-500/20 bg-red-500/10 text-red-400',
    pending: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${colors[status] ?? colors.destroyed}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { instances: userInstances, latestDeployment, dbError } = await getDashboardData(
    session.user.id
  );

  const totalInstances = userInstances.length;
  const healthyCount = userInstances.filter((i) => i.status === 'healthy').length;
  const unhealthyCount = userInstances.filter((i) => i.status === 'unhealthy').length;
  const latestInstance = userInstances[0] ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[22px] font-normal text-white">Overview</h1>
        <Link
          href="/deploy"
          className="rounded-lg bg-[#7c6aef] px-4 py-2 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
        >
          + Deploy Instance
        </Link>
      </div>

      {dbError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-yellow-500/20 bg-yellow-500/5 py-12 backdrop-blur-xl">
          <p className="mb-2 text-[14px] text-yellow-300">Database unavailable</p>
          <p className="text-[12px] text-[#fff6]">
            Instance data could not be loaded. Check your POSTGRES_URL configuration.
          </p>
        </div>
      ) : totalInstances === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#ffffff0d] bg-[#ffffff06] py-16 backdrop-blur-xl">
          <p className="mb-2 text-[15px] text-white">No instances yet</p>
          <p className="mb-6 text-[12px] text-[#fff6]">
            Deploy your first Aegis instance to get started.
          </p>
          <Link
            href="/deploy"
            className="rounded-lg bg-[#7c6aef] px-6 py-2.5 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
          >
            Deploy Now
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl">
              <p className="text-[11px] text-[#fff6]">Total Instances</p>
              <p className="mt-1 text-[28px] font-light tracking-tight text-white">
                {totalInstances}
              </p>
            </div>
            <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl">
              <p className="text-[11px] text-[#fff6]">Healthy</p>
              <p className="mt-1 text-[28px] font-light tracking-tight text-green-400">
                {healthyCount}
              </p>
            </div>
            <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl">
              <p className="text-[11px] text-[#fff6]">Unhealthy</p>
              <p className="mt-1 text-[28px] font-light tracking-tight text-red-400">
                {unhealthyCount}
              </p>
            </div>
            <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-5 backdrop-blur-xl">
              <p className="text-[11px] text-[#fff6]">Latest Deploy</p>
              <div className="mt-2">
                {latestDeployment ? (
                  <StatusBadge status={latestDeployment.status} />
                ) : (
                  <span className="text-[12px] text-[#fff4]">--</span>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {latestInstance && (
            <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-6 backdrop-blur-xl">
              <h3 className="mb-4 text-[14px] font-medium text-white">Recent Activity</h3>
              <Link
                href={`/dashboard/instances/${latestInstance.id}`}
                className="flex items-center justify-between rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-4 transition-all hover:border-[#7c6aef33] hover:bg-[#7c6aef08]"
              >
                <div>
                  <p className="text-[14px] font-medium text-white">{latestInstance.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-md bg-[#ffffff0d] px-1.5 py-0.5 text-[10px] text-[#fff6]">
                      {latestInstance.provider}
                    </span>
                    {latestInstance.serverIp && (
                      <span className="text-[10px] text-[#fff4]">{latestInstance.serverIp}</span>
                    )}
                    {latestInstance.tunnelDomain && (
                      <span className="text-[10px] text-[#7c6aef]">
                        https://{latestInstance.tunnelDomain}
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={latestInstance.status} />
              </Link>
            </div>
          )}

          {/* Quick Action */}
          <div className="flex justify-center">
            <Link
              href="/deploy"
              className="rounded-lg border border-[#ffffff14] px-6 py-2.5 text-[12px] font-light text-[#fffc] transition-all hover:border-[#7c6aef33] hover:text-white"
            >
              Deploy Another Instance
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
