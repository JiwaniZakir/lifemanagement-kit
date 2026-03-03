import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Aegis platform terms of service.',
};

export default function TermsOfServicePage() {
  return (
    <article className="rounded-xl border border-[#ffffff0a] bg-[#ffffff06] p-8 backdrop-blur-sm">
      <h1 className="mb-2 text-[clamp(1.6rem,3.5vw,2.4rem)] font-normal tracking-tight text-white">
        Terms of Service
      </h1>
      <p className="mb-8 text-[12px] font-light text-[#fff6]">
        Last updated: March 3, 2026
      </p>

      <div className="space-y-6 text-[14px] font-light leading-[1.8] text-[#ffffffcc]">
        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            1. Platform Overview
          </h2>
          <p>
            Aegis (&quot;the Platform&quot;) is a deployment platform for self-hosted personal
            AI instances. We provide tools to provision, configure, and manage your own
            Aegis instance on infrastructure you control. The Platform is designed for
            personal use and is not intended for enterprise deployments.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            2. Your Infrastructure
          </h2>
          <p>
            Aegis deploys to your own Hetzner Cloud server behind a Cloudflare Tunnel.
            You are solely responsible for maintaining your Hetzner and Cloudflare accounts,
            including all associated costs, billing, and account security. We do not manage,
            monitor, or guarantee the availability of your infrastructure accounts.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            3. Credential Handling
          </h2>
          <p>
            During the deployment process, you provide API keys and credentials (such as
            Hetzner tokens, Cloudflare tokens, and Anthropic API keys). These credentials
            are used exclusively to provision and configure your instance. They pass through
            our platform only during the setup process, are never stored permanently on
            our servers, and are discarded once deployment is complete. After deployment,
            credentials reside solely on your server.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            4. Data Ownership
          </h2>
          <p>
            You own all data stored on your deployed instance, including financial data,
            health metrics, calendar events, messages, and any other personal information.
            We do not access, read, or process data on your deployed instance. Your instance
            operates independently once deployed.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            5. No Warranty
          </h2>
          <p>
            The Platform is provided &quot;as is&quot; and &quot;as available&quot; without
            warranties of any kind, whether express or implied. We do not guarantee the uptime,
            reliability, or data integrity of your deployed instance. You are responsible for
            maintaining backups and ensuring the security of your server.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            6. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, Aegis and its operators shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of data, loss of profits, or business
            interruption, arising from your use of the Platform or any deployed instance.
            Our total liability shall not exceed the amount you paid for the service in the
            twelve months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            7. Acceptable Use
          </h2>
          <p>
            You agree to use the Platform only for lawful purposes and in accordance with
            these Terms. You may not use the Platform to deploy instances for illegal
            activities, spam, harassment, or any purpose that violates applicable laws
            or regulations.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            8. Account Termination
          </h2>
          <p>
            You may delete your account at any time. Upon account deletion, we will remove
            your account data from our platform. Note that this does not automatically
            destroy your deployed instance or Hetzner server — you are responsible for
            managing those resources. We reserve the right to suspend or terminate accounts
            that violate these Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            9. Changes to Terms
          </h2>
          <p>
            We may update these Terms from time to time. We will notify you of material
            changes by posting the updated Terms on the Platform. Your continued use of
            the Platform after such changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[18px] font-medium text-white">
            10. Contact
          </h2>
          <p>
            For questions about these Terms, contact us at{' '}
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
