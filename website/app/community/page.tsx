import { CommunityBoard } from '@/components/community/community-board';
import { ShippedFeatures } from '@/components/community/shipped-features';
import { Leaderboard } from '@/components/community/leaderboard';
import Link from 'next/link';

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-16">
      {/* Back link */}
      <Link
        href="/"
        className="mb-8 inline-block text-[12px] font-light text-[#fff6] transition-colors hover:text-[#fff9]"
      >
        &larr; Back to Home
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[clamp(1.8rem,4vw,3rem)] font-normal tracking-tight text-white">
          Community Board
        </h1>
        <p className="mt-2 text-[clamp(12px,0.85vw,14px)] font-light leading-[1.7] text-[#fff8]">
          Feature requests proposed by the community. Submit your own from the{' '}
          <Link href="/" className="text-[#7c6aef] hover:text-[#9b8df7]">
            feature planner
          </Link>.
        </p>
      </div>

      {/* Shipped features */}
      <ShippedFeatures />

      {/* Main board + leaderboard layout */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <CommunityBoard />
        <Leaderboard />
      </div>
    </main>
  );
}
