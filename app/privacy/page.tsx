import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy — TickerRank",
  description:
    "How TickerRank collects, uses, and protects information when you use our stock rating tool.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <article className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-[#3B82F6]">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-slate-400">
            Last updated: May 2, 2026
          </p>

          <div className="mt-10 max-w-none space-y-6 text-sm leading-relaxed text-slate-300 sm:text-base">
            <p>
              TickerRank (“we,” “us,” or “our”) operates an AI-assisted stock
              rating tool that displays letter-grade style ratings and related
              information for educational and informational purposes. This
              Privacy Policy describes how we collect, use, and share
              information when you use our website and services (the
              “Services”).
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              1. Information we collect
            </h2>
            <p>
              <strong>Account information.</strong> If you sign in with Clerk,
              we process information that Clerk provides to us as part of
              authentication, which may include your email address, name, user
              ID, and profile image, depending on your sign-in method and
              settings.
            </p>
            <p>
              <strong>Subscription and billing.</strong> If you subscribe to
              TickerRank Pro, payment processing is handled by Stripe. Stripe
              collects and processes payment card and billing details according
              to its own privacy policy. We typically receive limited
              subscription status from Stripe (for example, whether a
              subscription is active) rather than full payment card numbers.
            </p>
            <p>
              <strong>Stock queries and ratings.</strong> When you request a
              rating for a ticker symbol, we process the symbol you submit and
              related technical data needed to fulfill the request (for
              example, server logs and request metadata such as timestamps and
              approximate device or browser information). Ratings may be cached
              or stored on our infrastructure to operate the Services and
              enforce usage limits.
            </p>
            <p>
              <strong>Technical and usage data.</strong> Like most websites, we
              may collect diagnostic and security information such as IP
              address, browser type, device type, and pages visited. We use this
              data to operate, secure, and improve the Services.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              2. How we use information
            </h2>
            <p>We use the information above to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide and maintain the Services, including ratings and Pro features;</li>
              <li>Authenticate users and manage accounts;</li>
              <li>Process payments and subscriptions through Stripe;</li>
              <li>Communicate with you about your account or subscription where appropriate;</li>
              <li>Detect abuse, fraud, and security issues;</li>
              <li>Analyze usage in aggregate to improve product quality and reliability.</li>
            </ul>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              3. Sharing of information
            </h2>
            <p>
              We share information with service providers who help us operate
              the Services, including Clerk (authentication), Stripe (payments),
              hosting and infrastructure providers, and AI or data vendors where
              needed to generate ratings. These providers process data under
              contractual safeguards appropriate to their roles.
            </p>
            <p>
              We may disclose information if required by law, legal process, or
              to protect the rights, safety, or integrity of users or TickerRank.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              4. Data retention
            </h2>
            <p>
              We retain information as long as reasonably necessary to provide
              the Services, comply with legal obligations, resolve disputes,
              and enforce our agreements. Retention periods may vary depending
              on the type of data and operational needs.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              5. Security
            </h2>
            <p>
              We implement reasonable administrative, technical, and physical
              safeguards designed to protect information we process. No method of
              transmission or storage is completely secure.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              6. Your choices
            </h2>
            <p>
              Depending on your location, you may have rights to access,
              correct, delete, or restrict certain processing of your personal
              information, or to object to processing or export data. To exercise
              these rights, contact us using the information below. You may also
              manage some account settings through Clerk or cancel your
              subscription through Stripe’s customer flows where available.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              7. Children’s privacy
            </h2>
            <p>
              The Services are not directed to children under 13, and we do not
              knowingly collect personal information from children under 13.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              8. Changes
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will post
              the updated policy on this page and revise the “Last updated” date
              above.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              9. Contact
            </h2>
            <p>
              For privacy questions, contact us at the support channel listed on
              the TickerRank website, or reach out through your account
              dashboard if available.
            </p>

            <p className="border-t border-white/10 pt-6 text-sm text-slate-400">
              Ratings and content on TickerRank are for informational purposes
              only and are{" "}
              <Link href="/terms" className="text-[#60A5FA] hover:underline">
                not financial advice
              </Link>
              .
            </p>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
