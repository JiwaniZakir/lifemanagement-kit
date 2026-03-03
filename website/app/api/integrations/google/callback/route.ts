import { createHmac } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { instances, integrations } from '@/lib/db/schema';

function verifyState(encoded: string): { instanceId: string; userId: string } | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET ?? '';
    const { d, s } = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    const expected = createHmac('sha256', secret).update(d).digest('base64url');
    if (s !== expected) return null;
    return JSON.parse(d);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');

  if (!code || !stateParam) {
    return Response.redirect(new URL('/dashboard/integrations?error=missing_params', request.url));
  }

  const state = verifyState(stateParam);
  if (!state) {
    return Response.redirect(new URL('/dashboard/integrations?error=invalid_state', request.url));
  }

  // Verify instance ownership
  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, state.instanceId), eq(instances.userId, state.userId)))
    .limit(1);

  if (!instance) {
    return Response.redirect(new URL('/dashboard/integrations?error=not_found', request.url));
  }

  // Exchange code for tokens
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL ?? url.origin}/api/integrations/google/callback`;

  if (!clientId || !clientSecret) {
    return Response.redirect(new URL('/dashboard/integrations?error=not_configured', request.url));
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return Response.redirect(new URL('/dashboard/integrations?error=token_exchange', request.url));
    }

    const tokens = await tokenRes.json();

    // Store tokens on the deployed instance's data-api
    const baseUrl = instance.tunnelDomain
      ? `https://${instance.tunnelDomain}`
      : instance.serverIp
        ? `http://${instance.serverIp}:8000`
        : null;

    if (baseUrl) {
      const config = instance.config as Record<string, string> | null;
      const storeRes = await fetch(`${baseUrl}/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config?.dataApiToken ?? ''}`,
        },
        body: JSON.stringify({
          service: 'google-calendar',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : undefined,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!storeRes.ok) {
        console.error('Failed to store Google Calendar credentials on instance');
      }
    }

    // Upsert integration status
    const existing = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.instanceId, state.instanceId),
          eq(integrations.service, 'google-calendar'),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(integrations)
        .set({ status: 'connected', updatedAt: new Date() })
        .where(eq(integrations.id, existing[0].id));
    } else {
      await db.insert(integrations).values({
        instanceId: state.instanceId,
        service: 'google-calendar',
        status: 'connected',
      });
    }

    return Response.redirect(new URL('/dashboard/integrations?success=google-calendar', request.url));
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return Response.redirect(new URL('/dashboard/integrations?error=unknown', request.url));
  }
}
