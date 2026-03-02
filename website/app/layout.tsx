import { RootProvider } from 'fumadocs-ui/provider/next';
import { Manrope } from 'next/font/google';
import type { Metadata } from 'next';
import './global.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Aegis - Personal Intelligence Platform',
    template: '%s | Aegis',
  },
  description:
    'Self-hosted personal intelligence platform. Aggregate financial, calendar, health, and social data — surfaced through AI agents via WhatsApp.',
  metadataBase: new URL('https://aegis-docs.vercel.app'),
  openGraph: {
    title: 'Aegis - Personal Intelligence Platform',
    description:
      'Self-hosted personal intelligence platform built on OpenClaw.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
