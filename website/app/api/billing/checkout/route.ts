import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return Response.json({ error: 'Stripe price not configured.' }, { status: 503 });
  }

  try {
    // Check if user already has an active subscription
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, session.user.id))
      .limit(1);

    let customerId: string | undefined;

    if (existing.length > 0) {
      customerId = existing[0].stripeCustomerId;

      // If they already have an active subscription, redirect to portal instead
      if (existing[0].status === 'active' || existing[0].status === 'trialing') {
        return Response.json(
          { error: 'You already have an active subscription. Use the billing portal to manage it.' },
          { status: 400 }
        );
      }
    }

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: session.user.email,
          name: session.user.name ?? undefined,
          metadata: { userId: session.user.id },
        });
        customerId = customer.id;
      }
    }

    const headersList = await headers();
    const origin = headersList.get('origin') ?? 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId: session.user.id },
    });

    return Response.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: 'Failed to create checkout session.' }, { status: 500 });
  }
}
