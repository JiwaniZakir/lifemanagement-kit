import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  // Allow Stripe webhooks through without auth
  if (req.nextUrl.pathname === '/api/billing/webhook') {
    return NextResponse.next();
  }

  // All other matched routes require authentication
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/deploy/:path*',
    '/api/instances/:path*',
    '/api/billing/:path*',
    '/api/user/:path*',
  ],
};
