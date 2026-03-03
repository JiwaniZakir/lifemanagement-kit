import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Aegis platform privacy policy.',
};

export default function PrivacyPolicyPage() {
  return (
    <article className="rounded-xl border border-[#ffffff0a] bg-[#ffffff06] p-8 backdrop-blur-sm">
      <h1 className="mb-2 text-[clamp(1.6rem,3.5vw,2.4rem)] font-normal tracking-tight text-white">
        Privacy Policy
      </h1>
      <p className="mb-8 text-[12px] font-light text-[#fff6]">
        Last updated: March 3, 2026
      </p>

      <div className="space-y-6 text-[14px] font-light leading-[1.8] text-[#ffffffcc]">
        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            1. Information We Collect
          </h2>
          <p className="mb-2">
            When you create an account, we collect:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-[#ffffffaa]">
            <li>Email address</li>
            <li>Name</li>
            <li>OAuth profile information (from Google or GitHub)</li>
            <li>Avatar URL</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            2. Information We Temporarily Process
          </h2>
          <p>
            During the deployment process, you provide API keys (Anthropic, Hetzner,
            Cloudflare) that we use to provision your instance. These credentials are used
            once during setup, transmitted directly to the relevant services, and then
            discarded. They are not stored in our database or logs.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            3. Information We Store
          </h2>
          <ul className="ml-5 list-disc space-y-1 text-[#ffffffaa]">
            <li>User account information (email, name, OAuth identifiers)</li>
            <li>Instance metadata (name, provider, server IP, tunnel domain, status)</li>
            <li>Deployment history and logs</li>
            <li>Subscription and billing information (processed by Stripe)</li>
            <li>Integration connection status</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            4. Information We Do NOT Store
          </h2>
          <p className="mb-2">
            Once your instance is deployed, all personal data lives on your own server.
            We never store or have access to:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-[#ffffffaa]">
            <li>Financial data (bank accounts, transactions, investments)</li>
            <li>Health data (Garmin metrics, health records)</li>
            <li>Calendar events or schedules</li>
            <li>WhatsApp messages or conversations</li>
            <li>LMS assignments or grades</li>
            <li>Social media content or credentials</li>
            <li>Any data processed by your AI agents</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            5. Third-Party Services
          </h2>
          <p className="mb-2">
            We use the following third-party services:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-[#ffffffaa]">
            <li>
              <span className="text-white">Stripe</span> — payment processing and
              subscription management
            </li>
            <li>
              <span className="text-white">Hetzner Cloud</span> — server provisioning
              (on your account)
            </li>
            <li>
              <span className="text-white">Cloudflare</span> — tunnel and DNS management
              (on your account)
            </li>
            <li>
              <span className="text-white">Google / GitHub</span> — OAuth authentication
            </li>
            <li>
              <span className="text-white">Vercel</span> — platform hosting and database
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            6. Data Retention
          </h2>
          <p>
            We retain your account data for as long as your account is active. If you
            delete your account, we will remove all associated personal data from our
            systems within 30 days. Deployment logs may be retained in anonymized form
            for service improvement.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            7. Your Rights (GDPR)
          </h2>
          <p className="mb-2">
            You have the right to:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-[#ffffffaa]">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data in a portable format</li>
            <li>Object to processing of your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact us at{' '}
            <a
              href="mailto:support@aegis.dev"
              className="text-[#7c6aef] transition-colors hover:text-[#a89cf5]"
            >
              support@aegis.dev
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            8. Cookies
          </h2>
          <p>
            We use essential cookies for authentication (session management via NextAuth).
            We do not use tracking cookies, analytics cookies, or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            9. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of
            material changes by posting the updated policy on the Platform. Your continued
            use of the Platform after such changes constitutes acceptance of the revised
            policy.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            10. Contact
          </h2>
          <p>
            For questions about this Privacy Policy or to exercise your data rights,
            contact us at{' '}
            <a
              href="mailto:support@aegis.dev"
              className="text-[#7c6aef] transition-colors hover:text-[#a89cf5]"
            >
              support@aegis.dev
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
