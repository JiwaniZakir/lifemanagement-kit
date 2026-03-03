'use client';

import Link from 'next/link';
import Script from 'next/script';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Spline 3D element */}
      <Script
        type="module"
        src="https://unpkg.com/@splinetool/viewer/build/spline-viewer.js"
        strategy="lazyOnload"
      />

      {/* Title with Spline object on top */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Spline 3D — sits directly above the title, no background */}
        <div className="pointer-events-auto relative h-[250px] w-[250px] sm:h-[300px] sm:w-[300px]">
          {/* @ts-expect-error — spline-viewer is a web component loaded via script */}
          <spline-viewer
            url="/polaroid_go_copy.spline"
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
            }}
          />
        </div>

        <h1 className="animate-fade-up -mt-4 text-[clamp(2.5rem,6vw,4.5rem)] font-normal tracking-tight text-white">
          Aegis
        </h1>
      </div>

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
