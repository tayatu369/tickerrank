import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy — TickerRank",
  description:
    "How TickerRank collects, uses, and protects information when you use tickerrank.com.",
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
            Last Updated: May 2026
          </p>

          <div className="mt-10 max-w-none space-y-6 text-sm leading-relaxed text-slate-300 sm:text-base">
            <p>
              TickerRank (“we,” “us,” or “our”) operates tickerrank.com and
              related services (the “Services”), including an AI-assisted stock
              rating tool. This Privacy Policy describes how we collect, use,
              store, and share information when you use the Services.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              1. Information we collect
            </h2>
            <p>We collect the following categories of information:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-semibold text-slate-200">
                  Email and account information (via Clerk).
                </strong>{" "}
                When you sign in, Clerk handles authentication and shares with us
                data needed to operate your account, including your email address
                and may include your name, user ID, and profile image depending
                on how you sign in.
              </li>
              <li>
                <strong className="font-semibold text-slate-200">
                  Payment information (via Stripe).
                </strong>{" "}
                If you subscribe to TickerRank Pro, Stripe collects and
                processes payment card details and billing information under
                Stripe’s policies. We receive limited billing and subscription
                status from Stripe (for example, active subscription state), not
                your full payment card numbers.
              </li>
              <li>
                <strong className="font-semibold text-slate-200">
                  Stock ticker queries.
                </strong>{" "}
                When you request a rating, we process the ticker symbols you
                submit and related request data needed to return a result.
              </li>
              <li>
                <strong className="font-semibold text-slate-200">
                  Usage and technical logs.
                </strong>{" "}
                We collect diagnostic and security-related information such as IP
                address, timestamps, approximate device or browser metadata, and
                server logs reflecting how you use the Services—used to operate,
                secure, and troubleshoot the platform.
              </li>
            </ul>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              2. How we use your data
            </h2>
            <p>
              We use the information described above solely for legitimate
              business purposes tied to running TickerRank, including to:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Provide and improve the AI stock rating experience and enforce
                plan limits (for example, free-tier usage caps);
              </li>
              <li>Authenticate you, manage accounts, and communicate about the Services;</li>
              <li>
                Process and manage subscriptions and payments through Stripe;
              </li>
              <li>
                Maintain security, detect abuse or fraud, and improve product
                quality and reliability based on aggregated or operational
                patterns.
              </li>
            </ul>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              3. Third-party services
            </h2>
            <p>
              We rely on third-party processors to operate tickerrank.com. They
              handle data according to their own terms and privacy policies:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-semibold text-slate-200">Clerk</strong> —
                authentication and session management.
              </li>
              <li>
                <strong className="font-semibold text-slate-200">Stripe</strong> —
                payment processing for TickerRank Pro.
              </li>
              <li>
                <strong className="font-semibold text-slate-200">Vercel</strong> —
                hosting and deployment of our website and application
                infrastructure.
              </li>
              <li>
                <strong className="font-semibold text-slate-200">
                  OpenRouter
                </strong>{" "}
                — powering AI-generated stock ratings submitted through the
                Services.
              </li>
            </ul>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              4. Stock query data retention
            </h2>
            <p>
              Data associated with stock ticker lookups (such as cached query
              and rating payloads used to operate the Services) is retained for{" "}
              <strong className="font-semibold text-slate-200">
                up to 24 hours
              </strong>{" "}
              and is then automatically deleted from our systems, except where a
              longer period is required by law or to resolve disputes or abuse
              investigations.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              5. Cookies
            </h2>
            <p>
              We use cookies and similar technologies that are necessary for
              authentication through Clerk—for example to keep you signed in
              securely across sessions.{" "}
              <strong className="font-semibold text-slate-200">
                We do not use tracking cookies for advertising purposes.
              </strong>
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              6. Your rights (access, deletion, portability)
            </h2>
            <p>
              Depending on where you live, you may have the right to request
              access to the personal data we hold about you, ask us to delete
              personal data subject to lawful exceptions, and request data
              portability where applicable. To exercise{" "}
              <strong className="font-semibold text-slate-200">access</strong>,{" "}
              <strong className="font-semibold text-slate-200">deletion</strong>,
              {" or "}
              <strong className="font-semibold text-slate-200">
                data portability
              </strong>
              , email us using the contact information below. Include enough
              detail for us to verify your request. You may also manage some
              account settings through Clerk and subscription billing through
              Stripe where those tools apply.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              7. Sharing of information
            </h2>
            <p>
              We share information with the providers listed above to deliver
              the Services, under agreements appropriate for their roles. We may
              also disclose information if required by law, legal process, or to
              protect the rights, safety, or integrity of users or TickerRank.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              8. Security
            </h2>
            <p>
              We use reasonable administrative, technical, and organizational
              measures designed to protect information we process. No method of
              transmission or storage over the Internet is perfectly secure.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              9. Children’s privacy
            </h2>
            <p>
              The Services are not directed to children under 13, and we do not
              knowingly collect personal information from children under 13.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              10. Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy periodically. Updates will be
              posted on this page, and we will revise the “Last Updated” date
              above accordingly.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              11. Contact Us
            </h2>
            <p>
              Questions about privacy, your data, or this policy? Contact us:
            </p>
            <p className="m-0 rounded-lg border border-white/10 bg-white/5 p-4 text-slate-200">
              <strong className="font-semibold text-white">TickerRank Support</strong>
              <br />
              <a
                href="mailto:support@tickerrank.com"
                className="text-[#3B82F6] underline underline-offset-2 hover:text-[#60A5FA]"
              >
                support@tickerrank.com
              </a>
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
