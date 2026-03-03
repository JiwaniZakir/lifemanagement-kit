import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ── Enums ──

export const instanceProviderEnum = pgEnum('instance_provider', ['local', 'hetzner']);

export const instanceStatusEnum = pgEnum('instance_status', [
  'provisioning',
  'bootstrapping',
  'configuring',
  'healthy',
  'unhealthy',
  'destroyed',
]);

export const deploymentStatusEnum = pgEnum('deployment_status', [
  'pending',
  'creating_server',
  'installing',
  'cloning',
  'bootstrapping',
  'configuring',
  'health_check',
  'completed',
  'failed',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'canceled',
  'trialing',
  'incomplete',
]);

export const integrationStatusEnum = pgEnum('integration_status', [
  'disconnected',
  'connecting',
  'connected',
  'error',
]);

// ── Tables ──

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleId: text('google_id').unique(),
  githubId: text('github_id').unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const instances = pgTable('instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  provider: instanceProviderEnum('provider').notNull(),
  serverId: text('server_id'),
  serverIp: text('server_ip'),
  status: instanceStatusEnum('status').notNull().default('provisioning'),
  tunnelDomain: text('tunnel_domain'),
  config: jsonb('config').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const deployments = pgTable('deployments', {
  id: uuid('id').primaryKey().defaultRandom(),
  instanceId: uuid('instance_id')
    .notNull()
    .references(() => instances.id, { onDelete: 'cascade' }),
  status: deploymentStatusEnum('status').notNull().default('pending'),
  currentStep: text('current_step'),
  totalSteps: text('total_steps'),
  logs: jsonb('logs').$type<{ step: string; message: string; timestamp: string }[]>(),
  error: text('error'),
  webhookSecret: text('webhook_secret'),
  hetznerToken: text('hetzner_token'),
  anthropicKey: text('anthropic_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  instanceId: uuid('instance_id')
    .notNull()
    .references(() => instances.id, { onDelete: 'cascade' }),
  service: text('service').notNull(),
  status: integrationStatusEnum('status').notNull().default('disconnected'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripePriceId: text('stripe_price_id'),
  status: subscriptionStatusEnum('status').notNull().default('incomplete'),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
