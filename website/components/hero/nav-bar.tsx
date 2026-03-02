'use client';

import Link from 'next/link';

export function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6">
      <div className="flex items-center gap-3 text-xs font-light tracking-wide">
        <Link
          href="/"
          className="text-[#ffffffcc] transition-colors hover:text-white"
        >
          Home
        </Link>
        <span className="text-[#ffffff33]">/</span>
        <Link
          href="/docs"
          className="text-[#ffffffcc] transition-colors hover:text-white"
        >
          Docs
        </Link>
        <span className="text-[#ffffff33]">/</span>
        <a
          href="https://github.com/JiwaniZakir/lifemanagement-kit"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#ffffffcc] transition-colors hover:text-white"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}
