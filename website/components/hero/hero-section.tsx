'use client';

import Link from 'next/link';
import Script from 'next/script';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      {/* Spline 3D element */}
      <Script
        type="module"
        src="https://unpkg.com/@splinetool/viewer/build/spline-viewer.js"
        strategy="lazyOnload"
      />
      <div className="pointer-events-auto absolute left-1/2 top-1/2 -z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-90 sm:h-[700px] sm:w-[700px] lg:h-[800px] lg:w-[800px]">
        {/* @ts-expect-error — spline-viewer is a web component loaded via script */}
        <spline-viewer
          url="https://prod.spline.design/LEvjG3OETYd2GsRw/scene.splinecode"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Bottom gradient overlay for text readability */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />

      {/* Title */}
      <h1 className="animate-fade-up relative z-10 text-[clamp(2.5rem,6vw,4.5rem)] font-normal tracking-tight text-white">
        Aegis
      </h1>

      {/* Subtitle */}
      <p className="animate-fade-up-delay relative z-10 mt-4 max-w-md text-[clamp(12px,0.9vw,15px)] font-light leading-[1.7] text-[#fff9]">
        Self-hosted personal intelligence. Financial accounts, calendars, health,
        and social — surfaced through AI agents on WhatsApp.
      </p>

      {/* CTAs */}
      <div className="animate-fade-up-delay-2 relative z-10 mt-8 flex items-center gap-4">
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
