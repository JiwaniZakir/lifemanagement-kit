'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export function IdentifyUser() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      analytics.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
        provider: (session as unknown as Record<string, unknown>).provider,
      });
    }
  }, [session]);

  return null;
}
