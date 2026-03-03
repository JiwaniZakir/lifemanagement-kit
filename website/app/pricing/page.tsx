import { auth } from '@/lib/auth';
import Link from 'next/link';
import { NavBar } from '@/components/hero/nav-bar';
import { CheckoutButton } from '@/components/billing/checkout-button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple pricing for your personal intelligence platform.',
};

const freeFeatures = [
  'Self-hosted on your own hardware',
  'Full OpenClaw agent platform',
  'WhatsApp integration (Baileys)',
  'All 8 skills included',
  'Unlimited local usage',
  'Community support',
];

const proFeatures = [
  'Managed Hetzner VPS (8 vCPU, 16GB)',
  'Full OpenClaw agent platform',
  'WhatsApp integration (Baileys)',
  'All 8 skills included',
  'Cloudflare Tunnel (zero-trust)',
  'Automated deployment + updates',
  'Encrypted backups',
  'Priority support',
];

export default async function PricingPage() {
  const session = await auth();
  const isSignedIn = !!session?.user?.id;

  return (
    <main className="flex min-h-screen flex-col items-center bg-black">
      <div className="mx-auto w-full max-w-5xl px-6 pb-32 pt-24">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-[36px] font-light tracking-tight text-white">
            Simple, transparent pricing
          </h1>
          <p className="text-[15px] text-[#fff6]">
            Run Aegis locally for free, or let us host and manage everything for you.
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free Tier */}
          <div className="flex flex-col rounded-2xl border border-[#ffffff0d] bg-[#ffffff06] p-8 backdrop-blur-xl">
            <div className="mb-6">
              <h2 className="mb-1 text-[18px] font-medium text-white">Self-Hosted</h2>
              <p className="text-[12px] text-[#fff6]">Run on your own infrastructure</p>
            </div>

            <div className="mb-8">
              <span className="text-[42px] font-light tracking-tight text-white">$0</span>
              <span className="text-[14px] text-[#fff6]"> /month</span>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[13px] text-[#fff9]">
                  <span className="mt-0.5 text-[#fff4]" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/deploy"
              className="flex items-center justify-center rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[13px] font-medium text-white transition-all hover:border-[#ffffff28] hover:bg-[#ffffff08]"
            >
              Download Bundle
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="relative flex flex-col rounded-2xl border border-[#7c6aef33] bg-[#7c6aef08] p-8 backdrop-blur-xl">
            <div className="absolute -top-3 right-6 rounded-full bg-[#7c6aef] px-3 py-0.5 text-[10px] font-medium text-white">
              Recommended
            </div>

            <div className="mb-6">
              <h2 className="mb-1 text-[18px] font-medium text-white">Aegis Pro</h2>
              <p className="text-[12px] text-[#fff6]">Fully managed cloud deployment</p>
            </div>

            <div className="mb-8">
              <span className="text-[42px] font-light tracking-tight text-white">$9</span>
              <span className="text-[14px] text-[#fff6]"> /month</span>
              <p className="mt-1 text-[11px] text-[#fff4]">Includes Hetzner hosting + platform management</p>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[13px] text-[#fff9]">
                  <span className="mt-0.5 text-[#7c6aef]" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            {isSignedIn ? (
              <CheckoutButton />
            ) : (
              <Link
                href="/login?callbackUrl=/pricing"
                className="flex items-center justify-center rounded-lg bg-[#7c6aef] px-4 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
              >
                Sign In to Subscribe
              </Link>
            )}
          </div>
        </div>

        {/* FAQ note */}
        <div className="mt-12 text-center">
          <p className="text-[12px] text-[#fff4]">
            All plans include the full Aegis platform. Pro adds managed hosting so you don&apos;t
            have to maintain your own server. Cancel anytime.
          </p>
        </div>
      </div>

      <NavBar />
    </main>
  );
}
