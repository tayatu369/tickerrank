const SAMPLE_REASONS = [
  "Cash-rich balance sheet and resilient services mix support durable earnings quality.",
  "Brand strength and ecosystem stickiness still translate to premium pricing in devices.",
  "Valuation sits above long-run norms, which can cap upside if growth normalizes.",
] as const;

export function HomeExampleRatingCard() {
  const exampleScore = 78;

  return (
    <section
      aria-labelledby="example-rating-heading"
      className="mx-auto mt-14 w-full max-w-xl sm:mt-16"
    >
      <h2
        id="example-rating-heading"
        className="text-center text-xl font-semibold tracking-tight text-white sm:text-2xl"
      >
        See what you&apos;ll get
      </h2>
      <p className="mt-2 text-center text-sm text-slate-500">
        Illustrative preview only — not a live or real-time rating for AAPL.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/20 sm:p-5">
        <div className="mb-4 flex justify-end">
          <span className="rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#93C5FD]">
            Example
          </span>
        </div>

        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Rating
            </p>
            <h3 className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white">
                AAPL
              </span>
              <span className="text-sm text-slate-400">Apple Inc.</span>
            </h3>
          </div>
          <div
            className="inline-flex shrink-0 items-center justify-center self-start rounded-2xl border-2 border-amber-400/50 bg-amber-500/20 px-4 py-2 text-3xl font-black tabular-nums text-amber-100 shadow-lg shadow-amber-500/20 sm:self-auto"
            aria-hidden
          >
            B+
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-400">Score</span>
            <span className="text-xl font-bold tabular-nums text-white">
              {exampleScore}
              <span className="text-sm font-normal text-slate-500"> / 100</span>
            </span>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10"
            role="meter"
            aria-label="Illustrative composite score"
            aria-valuenow={exampleScore}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]"
              style={{
                width: `${Math.min(100, Math.max(0, exampleScore))}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Reasons
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-4 marker:text-slate-500 sm:pl-5">
            {SAMPLE_REASONS.map((r) => (
              <li
                key={r}
                className="rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-2 pr-3 text-xs leading-relaxed text-slate-300 sm:py-2.5 sm:pl-3 sm:text-sm"
              >
                {r}
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-5 border-t border-white/10 pt-4 text-center text-xs text-slate-500">
          Live ratings may vary with market conditions and updated data.
        </p>
      </div>
    </section>
  );
}
