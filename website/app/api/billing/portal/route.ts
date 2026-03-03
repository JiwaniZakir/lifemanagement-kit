import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const sub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, session.user.id))
      .limit(1);

    if (sub.length === 0 || !sub[0].stripeCustomerId) {
      return Response.json({ error: 'No subscription found.' }, { status: 404 });
    }

    const headersList = await headers();
    const origin = headersList.get('origin') ?? 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub[0].stripeCustomerId,
      return_url: `${origin}/dashboard/billing`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return Response.json({ error: 'Failed to create portal session.' }, { status: 500 });
  }
}
