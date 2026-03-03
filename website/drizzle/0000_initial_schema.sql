-- Custom SQL migration file, put your code below! --

-- Enums
CREATE TYPE "public"."instance_provider" AS ENUM('local', 'hetzner');
CREATE TYPE "public"."instance_status" AS ENUM('provisioning', 'bootstrapping', 'configuring', 'healthy', 'unhealthy', 'destroyed');
CREATE TYPE "public"."deployment_status" AS ENUM('pending', 'creating_server', 'installing', 'cloning', 'bootstrapping', 'configuring', 'health_check', 'completed', 'failed');
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'trialing', 'incomplete');
CREATE TYPE "public"."integration_status" AS ENUM('disconnected', 'connecting', 'connected', 'error');

-- Tables
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_id" text,
	"github_id" text,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"provider" "instance_provider" NOT NULL,
	"server_id" text,
	"server_ip" text,
	"status" "instance_status" DEFAULT 'provisioning' NOT NULL,
	"tunnel_domain" text,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"status" "deployment_status" DEFAULT 'pending' NOT NULL,
	"current_step" text,
	"total_steps" text,
	"logs" jsonb,
	"error" text,
	"webhook_secret" text,
	"hetzner_token" text,
	"anthropic_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"service" text NOT NULL,
	"status" "integration_status" DEFAULT 'disconnected' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"status" "subscription_status" DEFAULT 'incomplete' NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);

-- Foreign keys
ALTER TABLE "instances" ADD CONSTRAINT "instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
