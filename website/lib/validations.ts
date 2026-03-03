import { z } from 'zod';

// ── Deploy ──

export const deployBodySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('local'),
    instanceName: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens, and underscores'),
    anthropicKey: z.string().min(10).max(200),
    whatsappPhone: z.string().max(20).default(''),
    enabledIntegrations: z.array(z.string().max(30)).max(20).default([]),
  }),
  z.object({
    mode: z.literal('hetzner'),
    instanceName: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens, and underscores'),
    anthropicKey: z.string().min(10).max(200),
    whatsappPhone: z.string().max(20).default(''),
    enabledIntegrations: z.array(z.string().max(30)).max(20).default([]),
    hetznerToken: z.string().min(10).max(200),
    cloudflareToken: z.string().min(10).max(500),
    serverLocation: z.string().max(10).default('nbg1'),
  }),
]);

// ── Webhook ──

export const webhookBodySchema = z.object({
  step: z.string().min(1).max(50),
  message: z.string().min(1).max(500),
  timestamp: z.string().max(50),
});

// ── Submit ──

export const submitBodySchema = z.object({
  title: z.string().min(1).max(200),
  request: z.string().min(1).max(10_000),
  plan: z.string().min(1).max(100_000),
  submitter: z.string().min(1).max(100),
  notes: z.string().max(5_000).optional(),
  diagramJson: z.string().max(500_000).optional(),
});

// ── Integrations ──

export const connectIntegrationSchema = z.object({
  service: z.string().min(1).max(50),
  credentials: z.record(z.string(), z.string().max(2_000)),
});
