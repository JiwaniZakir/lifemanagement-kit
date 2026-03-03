import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.');
    return Response.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return Response.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        if (!userId || !customerId) {
          console.error('Missing userId or customerId in checkout session.');
          break;
        }

        // Retrieve the subscription to get price and period info
        let priceId: string | null = null;
        let periodEnd: Date | null = null;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const firstItem = sub.items.data[0];
          priceId = firstItem?.price?.id ?? null;
          const itemPeriodEnd = firstItem?.current_period_end;
          periodEnd = itemPeriodEnd ? new Date(itemPeriodEnd * 1000) : null;
        }

        // Upsert subscription record
        const existing = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(subscriptions)
            .set({
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId ?? null,
              stripePriceId: priceId,
              status: 'active',
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.userId, userId));
        } else {
          await db.insert(subscriptions).values({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? null,
            stripePriceId: priceId,
            status: 'active',
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;

        const statusMap: Record<string, typeof subscriptions.$inferInsert.status> = {
          active: 'active',
          past_due: 'past_due',
          canceled: 'canceled',
          trialing: 'trialing',
          incomplete: 'incomplete',
          incomplete_expired: 'incomplete',
          unpaid: 'past_due',
          paused: 'canceled',
        };

        const mappedStatus = statusMap[subscription.status] ?? 'incomplete';
        const subItemPeriodEnd = subscription.items.data[0]?.current_period_end;
        const periodEnd = subItemPeriodEnd
          ? new Date(subItemPeriodEnd * 1000)
          : null;

        await db
          .update(subscriptions)
          .set({
            status: mappedStatus,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            stripePriceId: subscription.items.data[0]?.price?.id ?? null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, subId));
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await db
          .update(subscriptions)
          .set({
            status: 'canceled',
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const parentSub = invoice.parent?.subscription_details?.subscription;
        const subId =
          typeof parentSub === 'string' ? parentSub : parentSub?.id;

        if (subId) {
          await db
            .update(subscriptions)
            .set({
              status: 'past_due',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.stripeSubscriptionId, subId));
        }
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }

  return Response.json({ received: true });
}
