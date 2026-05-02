import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Terms of Service — TickerRank",
  description:
    "Terms governing your use of TickerRank’s stock rating tool, including disclaimers and usage rules.",
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
            Last updated: May 2, 2026
          </p>

          <div className="mt-10 max-w-none space-y-6 text-sm leading-relaxed text-slate-300 sm:text-base">
            <p>
              These Terms of Service (“Terms”) govern your access to and use
              of TickerRank’s website, ratings, and related services
              (collectively, the “Services”). By accessing or using the
              Services, you agree to these Terms.
            </p>

            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
              <p className="m-0 font-semibold text-amber-50">
                Important: not financial advice
              </p>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-amber-100/95">
                TickerRank provides AI-generated ratings, scores, commentary, and
                related information for{" "}
                <strong className="font-semibold text-amber-50">
                  general informational and educational purposes only
                </strong>
                .
                Nothing on the Services is investment, legal, tax, or other
                professional advice. We are not a broker-dealer, investment
                adviser, or fiduciary. You alone are responsible for your
                investment and trading decisions. Past performance does not
                guarantee future results. You should consult a qualified
                professional before making financial decisions.
              </p>
            </div>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              1. Eligibility and accounts
            </h2>
            <p>
              You must be able to form a binding contract in your jurisdiction
              to use the Services. Some features require a free or paid account
              created through our authentication provider (Clerk). You are
              responsible for maintaining the confidentiality of your account
              credentials and for activity under your account.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              2. Subscriptions and billing
            </h2>
            <p>
              Paid plans (such as TickerRank Pro) are billed through Stripe
              subject to its terms and the pricing shown at checkout. Fees,
              renewal, cancellation, and refunds (if any) are as described at
              purchase or in supplemental materials we provide. We may change
              pricing with reasonable notice where required by law.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              3. Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Use the Services in violation of law or regulation;</li>
              <li>
                Scrape, crawl, overload, or attempt to interfere with our
                systems, rate limits, or security;
              </li>
              <li>
                Reverse engineer, decompile, or attempt to extract models,
                prompts, or proprietary logic except where prohibited by law;
              </li>
              <li>
                Use the Services to build a competing product or to resell
                ratings at scale without our written consent;
              </li>
              <li>
                Misrepresent ratings or TickerRank’s output as personalized
                advice or a guarantee of performance;
              </li>
              <li>
                Harass others, submit unlawful content, or attempt to access
                data or accounts without authorization.
              </li>
            </ul>
            <p>
              We may suspend or terminate access for conduct that violates these
              Terms or threatens the integrity of the Services.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              4. Intellectual property
            </h2>
            <p>
              The Services, including branding, software, ratings presentation,
              and documentation, are owned by TickerRank and its licensors and
              are protected by intellectual property laws. Subject to these
              Terms, we grant you a limited, non-exclusive, non-transferable
              license to use the Services for personal or internal business use
              as intended. You may not copy, modify, or distribute our materials
              except as expressly permitted.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              5. Third-party data
            </h2>
            <p>
              Ratings may rely on third-party market, financial, or news data.
              We do not control and are not responsible for the accuracy or
              availability of third-party sources. Data may be delayed or
              incomplete.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              6. Disclaimers
            </h2>
            <p>
              THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT
              WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. WE DO NOT WARRANT THAT RATINGS WILL BE ACCURATE,
              COMPLETE, OR ERROR-FREE, OR THAT THE SERVICES WILL BE UNINTERRUPTED.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              7. Limitation of liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TICKERRANK AND ITS
              AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR
              OTHER INTANGIBLE LOSSES, ARISING FROM YOUR USE OF THE SERVICES OR
              RELIANCE ON ANY RATING OR CONTENT, EVEN IF WE HAVE BEEN ADVISED OF
              THE POSSIBILITY OF SUCH DAMAGES. OUR AGGREGATE LIABILITY FOR CLAIMS
              ARISING OUT OF THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE
              AMOUNT YOU PAID US FOR THE SERVICES IN THE TWELVE MONTHS BEFORE
              THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100), UNLESS APPLICABLE
              LAW REQUIRES OTHERWISE.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              8. Indemnity
            </h2>
            <p>
              You will indemnify and hold harmless TickerRank and its affiliates
              from claims, damages, losses, and expenses (including reasonable
              attorneys’ fees) arising out of your misuse of the Services, your
              violation of these Terms, or your violation of others’ rights.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              9. Changes
            </h2>
            <p>
              We may modify the Services or these Terms. If we make material
              changes, we will provide notice as appropriate (for example, by
              posting an updated Terms page or notifying you through the
              Services). Continued use after changes become effective constitutes
              acceptance of the revised Terms.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              10. Termination
            </h2>
            <p>
              You may stop using the Services at any time. We may suspend or
              terminate your access if you breach these Terms or if we stop
              offering the Services. Provisions that by their nature should
              survive termination (including disclaimers, limitations of liability,
              and indemnity) will survive.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              11. Governing law
            </h2>
            <p>
              These Terms are governed by the laws applicable in the jurisdiction
              we designate in a future version of these Terms or your order flow,
              without regard to conflict-of-law principles. Courts in that
              jurisdiction will have exclusive jurisdiction over disputes,
              unless applicable law requires otherwise.
            </p>

            <h2 className="scroll-mt-24 text-xl font-semibold text-white">
              12. Contact
            </h2>
            <p>
              Questions about these Terms can be directed to the contact method
              shown on the TickerRank website.
            </p>

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
