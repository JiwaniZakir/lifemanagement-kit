'use client';

import Link from 'next/link';

export function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6">
      <div className="flex items-center gap-3 text-[12px] font-light leading-[12px] tracking-wide">
        <Link
          href="/"
          className="text-[#fffc] transition-colors hover:text-white"
        >
          Home
        </Link>
        <span className="text-[#fff3]">/</span>
        <Link
          href="/docs"
          className="text-[#fffc] transition-colors hover:text-white"
        >
          Docs
        </Link>
        <span className="text-[#fff3]">/</span>
        <Link
          href="/community"
          className="text-[#fffc] transition-colors hover:text-white"
        >
          Community
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
      </div>
    </nav>
  );
}
