'use client';

import Link from 'next/link';

export function NavBar() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Aegis
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/docs"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Docs
          </Link>
          <a
            href="https://github.com/JiwaniZakir/lifemanagement-kit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
