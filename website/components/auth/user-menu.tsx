'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!session?.user) return null;

  const initials = (session.user.name ?? session.user.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7c6aef] text-[10px] font-medium text-white">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-lg border border-[#ffffff14] bg-[#0a0a0a] p-1 shadow-xl">
          <div className="border-b border-[#ffffff0d] px-3 py-2">
            <p className="truncate text-[12px] font-medium text-white">
              {session.user.name}
            </p>
            <p className="truncate text-[11px] text-[#fff6]">
              {session.user.email}
            </p>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-md px-3 py-1.5 text-[12px] text-[#fffc] transition-colors hover:bg-[#ffffff08] hover:text-white"
          >
            Dashboard
          </Link>
          <button
            onClick={() => signOut()}
            className="mt-0.5 w-full rounded-md px-3 py-1.5 text-left text-[12px] text-[#fff6] transition-colors hover:bg-[#ffffff08] hover:text-[#fffc]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
