'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

const HeroCanvas = dynamic(() => import('./hero-canvas').then((m) => m.HeroCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-[120px] w-[120px] items-center justify-center">
      <div className="h-8 w-8 animate-pulse rounded-full bg-[#7c6aef20]" />
    </div>
  ),
});

export function HeroSection() {
  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Title */}
      <h1 className="animate-fade-up relative z-10 text-[clamp(2.5rem,6vw,4.5rem)] font-normal tracking-tight text-white">
        Aegis
      </h1>

      {/* Subtitle */}
      <p className="animate-fade-up-delay relative z-10 mt-4 max-w-md text-[clamp(12px,0.9vw,15px)] font-light leading-[1.7] text-[#fff9]">
        Self-hosted personal intelligence. Financial accounts, calendars, health,
        and social — surfaced through AI agents on WhatsApp.
      </p>

      {/* 3D emblem — small, inline, between text and buttons */}
      <div className="animate-fade-up-delay-2 relative z-10 my-6">
        <HeroCanvas />
      </div>

      {/* CTAs */}
      <div className="animate-fade-up-delay-3 relative z-10 flex items-center gap-4">
        <Link
          href="/deploy"
          className="rounded-lg bg-[#7c6aef] px-5 py-2 text-[12px] font-medium leading-[12px] text-white transition-all hover:bg-[#6b5bd6]"
        >
          Deploy Now
        </Link>
        <Link
          href="/docs/getting-started/setup-from-scratch"
          className="rounded-lg bg-white/90 px-5 py-2 text-[12px] font-medium leading-[12px] text-black transition-all hover:bg-white"
        >
          Get Started
        </Link>
        <Link
          href="/docs"
          className="rounded-lg border border-[#ffffff1a] px-5 py-2 text-[12px] font-light leading-[12px] text-[#fffc] transition-all hover:border-[#ffffff33] hover:text-white"
        >
          Documentation
        </Link>
      </div>
    </section>
  );
}
