import { createHmac } from 'crypto';
import { auth } from '@/lib/auth';

function signState(payload: object): string {
  const secret = process.env.NEXTAUTH_SECRET ?? '';
  const data = JSON.stringify(payload);
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return Buffer.from(JSON.stringify({ d: data, s: sig })).toString('base64url');
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const instanceId = url.searchParams.get('instanceId');
  if (!instanceId) {
    return Response.json({ error: 'instanceId required.' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: 'Google Calendar not configured.' }, { status: 503 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL ?? url.origin}/api/integrations/google/callback`;
  const state = signState({ instanceId, userId: session.user.id });

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return Response.redirect(authUrl.toString());
}
