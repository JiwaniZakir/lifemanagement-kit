'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '\u2302' },
  { href: '/dashboard/instances', label: 'Instances', icon: '\u2699' },
  { href: '/dashboard/integrations', label: 'Integrations', icon: '\u26D3' },
  { href: '/dashboard/billing', label: 'Billing', icon: '\u2B22' },
  { href: '/dashboard/settings', label: 'Settings', icon: '\u2638' },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-black">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-56 flex-col border-r border-[#ffffff0d] bg-[#0a0a0a] backdrop-blur-xl transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Dashboard navigation"
      >
        <div className="flex items-center justify-between border-b border-[#ffffff0d] px-5 py-4">
          <div>
            <Link href="/" className="text-[15px] font-medium text-white">
              Aegis
            </Link>
            <p className="text-[10px] text-[#fff4]">Personal Intelligence</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-[18px] text-[#fff6] hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-light transition-all ${
                      isActive
                        ? 'bg-[#7c6aef0d] text-white'
                        : 'text-[#fff9] hover:bg-[#ffffff08] hover:text-white'
                    }`}
                  >
                    <span className="text-[14px]" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[#ffffff0d] px-5 py-3">
          <Link
            href="/deploy"
            className="flex w-full items-center justify-center rounded-lg bg-[#7c6aef] px-3 py-2 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
          >
            + New Instance
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-4 py-4 lg:ml-56 lg:px-8 lg:py-6">
        {/* Mobile header */}
        <div className="mb-4 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-[#ffffff14] p-2 text-[#fff9] hover:text-white"
            aria-label="Open sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <Link href="/" className="text-[15px] font-medium text-white">
            Aegis
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
