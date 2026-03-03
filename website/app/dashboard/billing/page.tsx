import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { subscriptions } from '@/lib/db/schema';
import { ManageSubscriptionButton } from '@/components/billing/manage-subscription-button';
import { CheckoutButton } from '@/components/billing/checkout-button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billing',
};

type Subscription = typeof subscriptions.$inferSelect;

async function getSubscription(userId: string): Promise<{ data: Subscription | null; dbError: boolean }> {
  try {
    const { db } = await import('@/lib/db');
    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    return { data: rows[0] ?? null, dbError: false };
  } catch (error) {
    console.error('Billing DB error:', error);
    return { data: null, dbError: true };
  }
}

function formatDate(date: Date | null): string {
  if (!date) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: 'border-green-500/20 bg-green-500/10 text-green-400',
    trialing: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    past_due: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
    canceled: 'border-red-500/20 bg-red-500/10 text-red-400',
    incomplete: 'border-[#ffffff14] bg-[#ffffff08] text-[#fff6]',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${colors[status] ?? colors.incomplete}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { data: subscription, dbError } = await getSubscription(session.user.id);

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <div>
      <h1 className="mb-6 text-[22px] font-normal text-white">Billing</h1>

      {dbError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-yellow-500/20 bg-yellow-500/5 py-12 backdrop-blur-xl">
          <p className="mb-2 text-[14px] text-yellow-300">Database unavailable</p>
          <p className="text-[12px] text-[#fff6]">
            Billing data could not be loaded. Check your POSTGRES_URL configuration.
          </p>
        </div>
      ) : (
        <div className="max-w-lg space-y-6">
          {/* Current Plan */}
          <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-6 backdrop-blur-xl">
            <h3 className="mb-4 text-[14px] font-medium text-white">Current Plan</h3>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[16px] font-medium text-white">
                  {isActive ? 'Aegis Pro' : 'Free'}
                </p>
                <p className="text-[12px] text-[#fff6]">
                  {isActive
                    ? '$9/month -- managed cloud deployment'
                    : 'Self-hosted on your own infrastructure'}
                </p>
              </div>
              {subscription && statusBadge(subscription.status)}
            </div>

            {isActive && subscription && (
              <dl className="space-y-2 border-t border-[#ffffff0d] pt-4">
                <div className="flex justify-between">
                  <dt className="text-[12px] text-[#fff6]">Next billing date</dt>
                  <dd className="text-[12px] text-white">
                    {subscription.cancelAtPeriodEnd
                      ? 'Cancels ' + formatDate(subscription.currentPeriodEnd)
                      : formatDate(subscription.currentPeriodEnd)}
                  </dd>
                </div>
                {subscription.cancelAtPeriodEnd && (
                  <>
                    <p className="text-[11px] text-yellow-400">
                      Your subscription will end at the current billing period. You can reactivate
                      from the billing portal.
                    </p>
                    <p className="text-[11px] text-[#fff6]">
                      After your subscription period ends, your managed instance will continue
                      running for 7 days. After that, the server will be stopped. You can
                      re-subscribe at any time to restore access.
                    </p>
                  </>
                )}
              </dl>
            )}
          </div>

          {/* Action */}
          <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-6 backdrop-blur-xl">
            {isActive ? (
              <div>
                <h3 className="mb-2 text-[14px] font-medium text-white">Manage Subscription</h3>
                <p className="mb-4 text-[12px] text-[#fff6]">
                  Update payment method, view invoices, or cancel your subscription.
                </p>
                <ManageSubscriptionButton />
              </div>
            ) : (
              <div>
                <h3 className="mb-2 text-[14px] font-medium text-white">Upgrade to Pro</h3>
                <p className="mb-4 text-[12px] text-[#fff6]">
                  Get a fully managed Aegis instance on Hetzner with automated deployment, encrypted
                  backups, and priority support.
                </p>
                <CheckoutButton />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
