import Link from 'next/link';
import { GradientOrb } from './gradient-orb';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 pt-14 text-center">
      <GradientOrb />
      <h1 className="max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
        Your life,{' '}
        <span className="bg-gradient-to-r from-[#7c6aef] to-[#a78bfa] bg-clip-text text-transparent">
          one AI away
        </span>
      </h1>
      <p className="mt-6 max-w-xl text-lg font-light leading-relaxed text-zinc-400">
        Self-hosted personal intelligence platform. Aggregate financial, calendar,
        health, and social data — surfaced through AI agents via WhatsApp.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/docs"
          className="rounded-lg bg-[#7c6aef] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6b5ce0]"
        >
          Get Started
        </Link>
        <a
          href="https://github.com/JiwaniZakir/lifemanagement-kit"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/10 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
        >
          GitHub
        </a>
      </div>
    </section>
  );
}
