import Link from 'next/link';
import { GradientOrb } from './gradient-orb';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <GradientOrb />

      {/* Title — hf0: weight 400, large viewport-relative */}
      <h1 className="animate-fade-up text-[clamp(2.5rem,6vw,4.5rem)] font-normal tracking-tight text-white">
        Aegis
      </h1>

      {/* Subtitle — hf0: weight 300, line-height 1.7, muted color */}
      <p className="animate-fade-up-delay mt-4 max-w-md text-[clamp(12px,0.9vw,15px)] font-light leading-[1.7] text-[#fff9]">
        Self-hosted personal intelligence. Financial accounts, calendars, health,
        and social — surfaced through AI agents on WhatsApp.
      </p>

      {/* CTAs — hf0: 12px buttons */}
      <div className="animate-fade-up-delay-2 mt-8 flex items-center gap-4">
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
