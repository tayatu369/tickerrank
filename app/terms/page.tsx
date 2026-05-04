import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Terms of Service — TickerRank",
  description:
    "Terms governing your use of TickerRank (tickerrank.com), including disclaimers and usage rules.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <article className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-[#3B82F6]">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-slate-400">
            Last Updated: May 2026
          </p>

          <div className="mt-10 max-w-none space-y-6 text-sm leading-relaxed text-slate-300 sm:text-base">
            <section
              aria-labelledby="not-financial-advice-heading"
              className="rounded-xl border-2 border-[#3B82F6]/60 bg-[#3B82F6]/15 p-5 shadow-lg shadow-black/30 sm:p-6"
            >
              <h2
                id="not-financial-advice-heading"
                className="m-0 text-lg font-bold tracking-tight text-white sm:text-xl"
              >
                1. Not financial advice{" "}
                <span className="text-[#3B82F6]">(read carefully)</span>
              </h2>
              <p className="mt-4 mb-0 leading-relaxed text-slate-100">
                <strong className="block text-base font-bold text-white sm:text-lg">
                  TickerRank is not a financial advisor and does not provide
                  personalized investment recommendations.
                </strong>
                <span className="mt-3 block font-semibold text-white">
                  TickerRank provides AI-generated ratings on tickerrank.com for
                  general informational purposes only—
                </span>
                not as investment research, fiduciary guidance, tax advice, or legal
                advice.
              </p>
              <p className="mt-3 mb-0 text-slate-200">
                Ratings and related content may be inaccurate, incomplete, or outdated.
                We are not a broker-dealer, registered investment adviser, or bank.
              </p>
              <p className="mt-3 mb-0 font-semibold text-white">
                You should consult a licensed financial advisor—or other licensed
                professional—before making any investment decisions.
              </p>
              <p className="mt-3 mb-0">
                Past performance does not indicate future results. You alone bear
                responsibility for any trades or purchases you make.
              </p>
            </section>

            <section aria-labelledby="agreement-heading">
              <h2
                id="agreement-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                2. Agreement to these Terms
              </h2>
              <p>
                These Terms of Service (“Terms”) govern your access to and use of
                TickerRank’s website at tickerrank.com, AI-generated ratings, and related
                services (collectively, the “Services”). By accessing or using the
                Services, you agree to these Terms. If you do not agree, do not use the
                Services.
              </p>
            </section>

            <section aria-labelledby="eligibility-heading">
              <h2
                id="eligibility-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                3. Eligibility and accounts
              </h2>
              <p>
                You must be able to enter a legally binding contract in your
                jurisdiction to use the Services. Some features require creating an
                account through our authentication provider (Clerk). You are responsible
                for safeguarding your credentials and for all activity under your
                account.
              </p>
              <p>
                <strong className="font-semibold text-slate-200">
                  One account per person:
                </strong>{" "}
                You may not register or operate multiple accounts to bypass usage limits,
                obtain unfair access to the Services, or otherwise violate these Terms.
              </p>
            </section>

            <section aria-labelledby="plans-heading">
              <h2
                id="plans-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                4. Free tier and TickerRank Pro
              </h2>
              <p>
                <strong className="font-semibold text-slate-200">Free tier.</strong>{" "}
                Free accounts may submit up to{" "}
                <strong className="font-semibold text-slate-200">
                  three (3) ratings per calendar day
                </strong>
                , subject to change with reasonable notice on the Site or via the
                Services.
              </p>
              <p>
                <strong className="font-semibold text-slate-200">
                  TickerRank Pro subscription.
                </strong>{" "}
                TickerRank Pro is billed through Stripe at{" "}
                <strong className="font-semibold text-slate-200">
                  USD $9.99 per month
                </strong>{" "}
                (plus applicable taxes, if any). Your subscription renews automatically
                each billing period unless you cancel before renewal. Pricing may change
                with notice where required by law.
              </p>
              <p>
                <strong className="font-semibold text-slate-200">Cancellation.</strong>{" "}
                You may cancel your Pro subscription{" "}
                <strong className="font-semibold text-slate-200">at any time</strong>{" "}
                through Stripe’s Billing Customer Portal (linked from checkout or account
                flows we provide).
              </p>
              <p>
                <strong className="font-semibold text-slate-200">Refunds.</strong>{" "}
                Subscription fees cover the billing period selected at purchase. Fees are{" "}
                <strong className="font-semibold text-slate-200">
                  non-refundable for partial months or unused portions of a period
                </strong>
                except where mandated by applicable law or otherwise stated by Stripe’s
                rules. After you cancel, you retain{" "}
                <strong className="font-semibold text-slate-200">
                  Pro-level access until the end of your current prepaid billing period
                </strong>
                , unless we terminate sooner for breach of these Terms.
              </p>
            </section>

            <section aria-labelledby="acceptable-use-heading">
              <h2
                id="acceptable-use-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                5. Acceptable use
              </h2>
              <p>You agree not to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Engage in <strong className="font-semibold text-slate-200">illegal</strong>{" "}
                  activities or use the Services in violation of applicable law or
                  regulation.
                </li>
                <li>
                  Deploy <strong className="font-semibold text-slate-200">automated</strong>
                  scraping, crawling, bots, scripts, or other non-human mechanisms to bulk
                  collect ratings or strain our systems, except through interfaces we
                  expressly document for integrations.
                </li>
                <li>
                  Circumvent authentication, reverse engineer prompts or models in
                  unauthorized ways, or misuse rate limits beyond what accounts are entitled
                  to.
                </li>
                <li>
                  Reverse engineer our rating pipeline or misuse output to impersonate us,
                  spam others, build a substantially competing scrape-based service without
                  permission, or harass users.
                </li>
                <li>
                  Misrepresent AI output as individualized professional advice from
                  licensed persons or as a guaranteed return.
                </li>
              </ul>
              <p>
                We may suspend access for conduct that threatens the Services,
                compromises security, or breaches these Terms.
              </p>
            </section>

            <section aria-labelledby="intellectual-property-heading">
              <h2
                id="intellectual-property-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                6. Intellectual property
              </h2>
              <p>
                The rating methodology, grading system, UX, prompts, workflows, software,
                branding, logos, wording, visuals, aggregated reports, documentation, and
                other proprietary materials appearing on tickerrank.com (collectively,
                “TickerRank IP”) are owned by TickerRank and its licensors. Subject to these
                Terms, we grant you a limited, non-exclusive, revocable license to use the
                Services for permitted personal use. Except as expressly allowed, you may
                not copy, scrape, sublicense, publicly perform, distribute, modify, merge,
                or create derivative commercial works from TickerRank IP.
              </p>
            </section>

            <section aria-labelledby="third-party-data-heading">
              <h2
                id="third-party-data-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                7. Third-party data and tools
              </h2>
              <p>
                Ratings rely on publicly available finance data, APIs, vendors, AI model
                providers, and comparable sources. Accuracy, timeliness, and availability
                of third-party data are not warranted.
              </p>
            </section>

            <section aria-labelledby="disclaimers-heading">
              <h2
                id="disclaimers-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                8. Disclaimers
              </h2>
              <p>
                EXCEPT WHERE PROHIBITED BY LAW, THE SERVICES ARE PROVIDED “AS IS” AND “AS
                AVAILABLE.” WE DISCLAIM ALL EXPRESS OR IMPLIED WARRANTIES, INCLUDING OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. WE DO
                NOT WARRANT THAT AI RATINGS ARE ACCURATE, COMPLETE, OR ERROR-FREE, OR THAT
                THE SITE WILL ALWAYS BE AVAILABLE.
              </p>
            </section>

            <section aria-labelledby="liability-heading">
              <h2
                id="liability-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                9. Limitation of liability
              </h2>
              <p className="font-semibold text-slate-200">
                TickerRank, its founders, contractors, affiliates, and suppliers are{" "}
                <strong className="text-white">not responsible</strong> for any losses,
                damages, or decisions you make in reliance on AI ratings—including trading
                losses, lost profits, or lost opportunity—even if such damages were foreseeable.
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TICKERRANK AND ITS AFFILIATES,
                OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
                LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM YOUR
                USE OF THE SERVICES OR RELIANCE ON ANY RATING OR CONTENT, EVEN IF ADVISED OF
                THE POSSIBILITY OF SUCH DAMAGES. OUR AGGREGATE LIABILITY FOR CLAIMS ARISING
                OUT OF THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID
                US FOR THE SERVICES IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED
                U.S. DOLLARS ($100), UNLESS APPLICABLE LAW REQUIRES OTHERWISE.
              </p>
            </section>

            <section aria-labelledby="indemnity-heading">
              <h2
                id="indemnity-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                10. Indemnity
              </h2>
              <p>
                You will indemnify and hold harmless TickerRank and its affiliates from
                claims, damages, losses, and expenses (including reasonable attorneys’ fees)
                arising from your misuse of the Services, your violation of these Terms, or
                your violation of others’ rights.
              </p>
            </section>

            <section aria-labelledby="changes-heading">
              <h2
                id="changes-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                11. Changes
              </h2>
              <p>
                We may modify the Services or these Terms. For material changes, we will
                provide notice as appropriate (for example, by posting an updated Terms page
                or notifying you through the Services). Continued use after changes become
                effective constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section aria-labelledby="termination-heading">
              <h2
                id="termination-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                12. Termination and suspension
              </h2>
              <p>
                You may stop using the Services at any time. TickerRank reserves the right
                to suspend or terminate accounts or access—{" "}
                <strong className="font-semibold text-slate-200">with or without notice</strong>
                —for abuse, fraud, security risk, repeated breach of these Terms, or if we
                discontinue the Services. Provisions that should survive (including
                disclaimers, limitations of liability, and indemnity) survive termination.
              </p>
            </section>

            <section aria-labelledby="governing-law-heading">
              <h2
                id="governing-law-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                13. Governing law
              </h2>
              <p>
                These Terms are governed by applicable law in the jurisdiction we designate
                in a future supplemental notice or invoice, without regard to conflict-of-law
                principles except where forbidden. Courts there will have jurisdiction over
                disputes unless mandatory law dictates otherwise.
              </p>
            </section>

            <section aria-labelledby="contact-heading">
              <h2
                id="contact-heading"
                className="scroll-mt-24 text-xl font-semibold text-white"
              >
                14. Contact
              </h2>
              <p>
                Questions about these Terms:&nbsp;
                <a
                  href="mailto:support@tickerrank.com"
                  className="text-[#3B82F6] underline underline-offset-2 hover:text-[#60A5FA]"
                >
                  support@tickerrank.com
                </a>
              </p>
            </section>

            <p className="border-t border-white/10 pt-6 text-sm text-slate-400">
              See also our{" "}
              <Link href="/privacy" className="text-[#60A5FA] hover:underline">
                Privacy Policy
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
