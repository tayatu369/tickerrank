import Link from "next/link";

const PLAN_COL_CLASS =
  "flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left sm:p-6";

export function HomePricingTeaser() {
  return (
    <section
      aria-labelledby="pricing-teaser-heading"
      className="mx-auto mt-16 w-full max-w-5xl sm:mt-20"
    >
      <h2
        id="pricing-teaser-heading"
        className="text-center text-xl font-semibold tracking-tight text-white sm:text-2xl"
      >
        Choose your plan
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-400 sm:text-base">
        Compare Free and Pro, then subscribe when you&apos;re ready on the pricing page.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
        <div className={PLAN_COL_CLASS}>
          <h3 className="text-lg font-semibold text-white">Free</h3>
          <p className="mt-1 text-2xl font-bold tracking-tight text-[#93C5FD]">
            $0
            <span className="text-base font-semibold text-slate-400">
              {" "}
              / month
            </span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            3 ratings/day, basic metrics, 1 AI reason
          </p>
        </div>

        <div
          className={`${PLAN_COL_CLASS} ring-1 ring-[#3B82F6]/35 shadow-lg shadow-[#3B82F6]/10`}
        >
          <h3 className="text-lg font-semibold text-white">Pro</h3>
          <p className="mt-1 text-2xl font-bold tracking-tight text-[#93C5FD]">
            $9.99
            <span className="text-base font-semibold text-slate-400">
              {" "}
              / month
            </span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Unlimited ratings, 5 metrics, 5 AI reasons, news sentiment,
            Buffett Lens
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/pricing"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#3B82F6] px-10 py-3 text-base font-semibold text-white shadow-lg shadow-[#3B82F6]/25 transition-colors hover:bg-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
        >
          View Pricing
        </Link>
      </div>
    </section>
  );
}
