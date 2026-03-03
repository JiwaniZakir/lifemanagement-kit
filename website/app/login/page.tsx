import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, enabledProviders } from '@/lib/auth';
import { SignInButton } from '@/components/auth/sign-in-button';

export const metadata = {
  title: 'Sign In',
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  const hasAnyProvider = enabledProviders.github || enabledProviders.google;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#ffffff06] p-8 backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h1 className="text-[20px] font-normal text-white">
              Sign in to Aegis
            </h1>
            <p className="mt-1 text-[13px] font-light text-[#fff9]">
              Deploy and manage your personal intelligence platform
            </p>
          </div>

          {hasAnyProvider ? (
            <div className="space-y-3">
              {enabledProviders.google && (
                <SignInButton provider="google" label="Continue with Google" />
              )}
              {enabledProviders.github && (
                <SignInButton provider="github" label="Continue with GitHub" />
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
              <p className="mb-1 text-[13px] text-yellow-300">No auth providers configured</p>
              <p className="text-[11px] text-[#fff6]">
                Set GITHUB_CLIENT_ID/SECRET or GOOGLE_CLIENT_ID/SECRET in your environment to enable sign-in.
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-[11px] font-light leading-relaxed text-[#fff4]">
            By signing in, you agree to self-host and manage your own
            Aegis instance. No data is stored on our servers.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-[11px] text-[#fff6] transition-colors hover:text-white">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
