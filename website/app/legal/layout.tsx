import Link from 'next/link';
import { NavBar } from '@/components/hero/nav-bar';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hf0-type min-h-screen bg-black">
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-16">
        <Link
          href="/"
          className="mb-8 inline-block text-[12px] font-light text-[#fff6] transition-colors hover:text-[#fff9]"
        >
          &larr; Back to Home
        </Link>
        {children}
      </main>
      <NavBar />
    </div>
  );
}
