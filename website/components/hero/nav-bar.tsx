'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SignInButton } from '@/components/auth/sign-in-button';
import { UserMenu } from '@/components/auth/user-menu';
import { useState, useEffect } from 'react';

interface EnabledProviders {
  github: boolean;
  google: boolean;
}

export function NavBar() {
  const { data: session, status } = useSession();
  const [showSignIn, setShowSignIn] = useState(false);
  const [providers, setProviders] = useState<EnabledProviders | null>(null);

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProviders(d))
      .catch(() => {});
  }, []);

  const hasProviders = providers?.github || providers?.google;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-gradient-to-t from-black via-black/80 to-transparent pb-6 pt-10">
      <div className="flex items-center gap-3 text-[12px] font-light leading-[12px] tracking-wide">
        <Link href="/" className="text-[#fffc] transition-colors hover:text-white">
          Home
        </Link>
        <span className="text-[#fff3]">/</span>
        <Link href="/docs" className="text-[#fffc] transition-colors hover:text-white">
          Docs
        </Link>
        <span className="text-[#fff3]">/</span>
        <Link href="/community" className="text-[#fffc] transition-colors hover:text-white">
          Community
        </Link>
        <span className="text-[#fff3]">/</span>
        <Link href="/deploy" className="text-[#7c6aef] transition-colors hover:text-[#a89cf5]">
          Deploy
        </Link>
        <span className="text-[#fff3]">/</span>
        <a
          href="https://github.com/JiwaniZakir/lifemanagement-kit"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#fffc] transition-colors hover:text-white"
        >
          GitHub
        </a>
        <span className="text-[#fff3]">/</span>
        <Link href="/legal/terms" className="text-[#fffc] transition-colors hover:text-white">
          Terms
        </Link>
        <span className="text-[#fff3]">/</span>
        <Link href="/legal/privacy" className="text-[#fffc] transition-colors hover:text-white">
          Privacy
        </Link>

        {status !== 'loading' && hasProviders && (
          <>
            <span className="text-[#fff3]">/</span>
            {session ? (
              <>
                <Link href="/dashboard" className="text-[#fffc] transition-colors hover:text-white">
                  Dashboard
                </Link>
                <span className="text-[#fff3]">/</span>
                <UserMenu />
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowSignIn(!showSignIn)}
                  className="text-[#fffc] transition-colors hover:text-white"
                >
                  Sign In
                </button>
                {showSignIn && (
                  <div className="absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 rounded-lg border border-[#ffffff14] bg-[#0a0a0a] p-3 shadow-xl">
                    <p className="mb-2 text-center text-[11px] text-[#fff6]">
                      Sign in to deploy &amp; manage instances
                    </p>
                    <div className="space-y-2">
                      {providers?.github && <SignInButton provider="github" />}
                      {providers?.google && <SignInButton provider="google" />}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
