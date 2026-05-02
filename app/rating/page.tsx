"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { recordRecentSymbol } from "@/lib/recent-queries";
import { RatingHistoryChart } from "./rating-history-chart";

type RatingApiResponse = {
  symbol: string;
  companyName: string;
  rating: string;
  score: number;
  conclusion: string;
  reasons: string[];
  metrics: {
    Growth: number;
    FinancialHealth: number;
    Momentum: number;
    Value: number;
    Sentiment: number;
  };
  trustInfo: {
    indicatorsCount: number;
    modelVersion: string;
    dataUpdatedAt: string;
    ratingValidUntil: string;
  };
  cached?: boolean;
};

function isFallbackRating(data: RatingApiResponse): boolean {
  const reasonsMentionPlaceholder = data.reasons.some((r) =>
    r.toLowerCase().includes("placeholder"),
  );
  const neutralCPlus =
    data.score === 50 && data.rating.trim().toUpperCase() === "C+";
  return reasonsMentionPlaceholder || neutralCPlus;
}

type ApiMetrics = RatingApiResponse["metrics"];

const METRIC_BARS: { key: keyof ApiMetrics; label: string }[] = [
  { key: "Growth", label: "Growth" },
  { key: "FinancialHealth", label: "Financial Health" },
  { key: "Momentum", label: "Momentum" },
  { key: "Value", label: "Value" },
  { key: "Sentiment", label: "Sentiment" },
];

const INVESTING_TIPS_BUFFETT = [
  "Price is what you pay. Value is what you get. — Warren Buffett",
  "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price. — Warren Buffett",
  "The stock market is a device for transferring money from the impatient to the patient. — Warren Buffett",
  "Risk comes from not knowing what you're doing. — Warren Buffett",
  "Our favorite holding period is forever. — Warren Buffett",
];

function normalizeSymbol(raw: string | null): string {
  if (raw == null || raw.trim() === "") return "";
  return raw.trim().toUpperCase();
}

function gradeBadgeStyle(grade: string) {
  const letter = grade.charAt(0).toUpperCase();
  if (letter === "A") {
    return {
      bg: "bg-emerald-500/20",
      border: "border-emerald-400/50",
      text: "text-emerald-200",
      shadow: "shadow-emerald-500/20",
    };
  }
  if (letter === "B" || letter === "C") {
    return {
      bg: "bg-amber-500/20",
      border: "border-amber-400/50",
      text: "text-amber-100",
      shadow: "shadow-amber-500/20",
    };
  }
  return {
    bg: "bg-rose-500/20",
    border: "border-rose-400/50",
    text: "text-rose-100",
    shadow: "shadow-rose-500/20",
  };
}

function normalizeConclusion(raw: string): "Bullish" | "Neutral" | "Bearish" {
  const t = raw.trim().toLowerCase();
  if (t === "bullish") return "Bullish";
  if (t === "bearish") return "Bearish";
  return "Neutral";
}

function conclusionStyle(
  conclusion: "Bullish" | "Neutral" | "Bearish",
): { label: string; className: string } {
  switch (conclusion) {
    case "Bullish":
      return {
        label: "Bullish",
        className:
          "border-emerald-400/40 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/20",
      };
    case "Bearish":
      return {
        label: "Bearish",
        className:
          "border-rose-400/40 bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/20",
      };
    default:
      return {
        label: "Neutral",
        className:
          "border-slate-500/40 bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/20",
      };
  }
}

const trustDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
});

function formatTrustDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return trustDateFormatter.format(d);
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-5 animate-spin rounded-full border-2 border-white/20 border-t-[#3B82F6] ${className}`}
      aria-hidden
    />
  );
}

function NoSymbolPrompt() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Enter a stock symbol
        </h1>
        <p className="mt-3 text-slate-400">
          Add <span className="font-mono text-slate-300">?symbol=AAPL</span> to
          the URL, or search below.
        </p>
        <form
          action="/rating"
          method="get"
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <label className="sr-only" htmlFor="rating-symbol">
            Stock ticker symbol
          </label>
          <input
            id="rating-symbol"
            name="symbol"
            type="text"
            required
            placeholder="e.g. AAPL"
            className="min-h-12 w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none ring-[#3B82F6] transition-[box-shadow,border-color] focus:border-[#3B82F6]/50 focus:ring-2"
          />
          <button
            type="submit"
            className="min-h-12 shrink-0 rounded-xl bg-[#3B82F6] px-6 py-3 text-base font-semibold text-white hover:bg-[#2563EB] sm:w-auto"
          >
            View rating
          </button>
        </form>
        <Link
          href="/"
          className="mt-8 text-sm font-medium text-[#3B82F6] hover:underline"
        >
          ← Back to home
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

type LockPrompt = "sign-in" | "upgrade";

function LockedReason({ preview, lockPrompt }: { preview: string; lockPrompt: LockPrompt }) {
  return (
    <li className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] py-4 pl-4 pr-4">
      <p className="select-none text-sm leading-relaxed text-slate-300 blur-sm">
        {preview}
      </p>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-[#0B1120]/70 backdrop-blur-[2px]">
        <span className="text-lg text-slate-400" aria-hidden>
          🔒
        </span>
        <span className="text-sm text-slate-300">
          <Link
            href="/pricing"
            className="pointer-events-auto font-semibold text-[#3B82F6] hover:underline"
          >
            {lockPrompt === "sign-in" ? "Sign in to upgrade" : "Upgrade to Pro"}
          </Link>
        </span>
      </div>
    </li>
  );
}

function LockedMetricBar({
  label,
  pct,
  lockPrompt,
}: {
  label: string;
  pct: number;
  lockPrompt: LockPrompt;
}) {
  const w = `${Math.min(100, Math.max(0, pct))}%`;
  return (
    <li className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-1 py-3">
      <div className="pointer-events-none select-none blur-sm">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-slate-200">{label}</span>
          <span className="tabular-nums text-slate-400">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: w }} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-[#0B1120]/70 backdrop-blur-[2px]">
        <span className="text-lg text-slate-400" aria-hidden>
          🔒
        </span>
        <span className="text-sm text-slate-300">
          <Link
            href="/pricing"
            className="pointer-events-auto font-semibold text-[#3B82F6] hover:underline"
          >
            {lockPrompt === "sign-in" ? "Sign in to upgrade" : "Upgrade to Pro"}
          </Link>
        </span>
      </div>
    </li>
  );
}

function MetricBars({
  metrics,
  isPro,
  lockPrompt,
}: {
  metrics: ApiMetrics;
  isPro: boolean;
  lockPrompt: LockPrompt;
}) {
  return (
    <ul className="mt-4 space-y-4">
      {METRIC_BARS.map(({ key, label }, index) => {
        const pct = Math.min(100, Math.max(0, Math.round(metrics[key])));
        if (isPro || index < 3) {
          return (
            <li key={key}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-200">{label}</span>
                <span className="tabular-nums text-slate-400">{pct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#3B82F6]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        }
        return (
          <LockedMetricBar
            key={key}
            label={label}
            pct={pct}
            lockPrompt={lockPrompt}
          />
        );
      })}
    </ul>
  );
}

function RatingDetails({
  symbol,
  isPro,
  isSignedIn,
}: {
  symbol: string;
  isPro: boolean;
  isSignedIn: boolean;
}) {
  const [data, setData] = useState<RatingApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [loadingFireCount, setLoadingFireCount] = useState(0);
  const [showSlowTip, setShowSlowTip] = useState(false);
  const [slowTipQuote, setSlowTipQuote] = useState<string | null>(null);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadingSteps = useMemo(
    () =>
      [
        { text: "Connecting to market data...", progress: 20 },
        { text: `Fetching ${symbol}'s latest financials...`, progress: 40 },
        { text: "Analyzing 5 core financial metrics...", progress: 60 },
        { text: "AI computing composite rating...", progress: 80 },
        { text: "Rating almost ready...", progress: 90 },
      ] as const,
    [symbol],
  );

  const loadingStepText = useMemo(() => {
    const eff = loadingFireCount;
    const textIdx = eff <= 1 ? 0 : Math.min(eff - 1, 4);
    return loadingSteps[textIdx]!.text;
  }, [loadingFireCount, loadingSteps]);

  useEffect(() => {
    if (!loading) {
      if (progressIntervalRef.current != null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (tipTimeoutRef.current != null) {
        clearTimeout(tipTimeoutRef.current);
        tipTimeoutRef.current = null;
      }
      return;
    }

    queueMicrotask(() => {
      if (!isMountedRef.current) return;
      setSimulatedProgress(0);
      setLoadingFireCount(0);
      setShowSlowTip(false);
      setSlowTipQuote(null);
    });

    let fires = 0;
    progressIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      fires += 1;
      const stepIdx = Math.min(fires - 1, 4);
      setSimulatedProgress(loadingSteps[stepIdx]!.progress);
      setLoadingFireCount(fires);
    }, 1500);

    tipTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setSlowTipQuote(
        INVESTING_TIPS_BUFFETT[
          Math.floor(Math.random() * INVESTING_TIPS_BUFFETT.length)
        ]!,
      );
      setShowSlowTip(true);
    }, 10_000);

    return () => {
      if (progressIntervalRef.current != null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (tipTimeoutRef.current != null) {
        clearTimeout(tipTimeoutRef.current);
        tipTimeoutRef.current = null;
      }
    };
  }, [loading, loadingSteps]);

  useEffect(() => {
    let cancelled = false;
    let successDeferred = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled || !isMountedRef.current) return;
      setLoading(true);
      setError(false);
      setData(null);
      try {
        const res = await fetch(
          `/api/rating?symbol=${encodeURIComponent(symbol)}`,
          { cache: "no-store" },
        );
        if (cancelled || !isMountedRef.current) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        const json = (await res.json()) as RatingApiResponse | { error?: string };
        if (cancelled || !isMountedRef.current) return;
        if ("error" in json && json.error) {
          setError(true);
          return;
        }
        successDeferred = true;
        setSimulatedProgress(100);
        recordRecentSymbol(symbol);
        startTransition(() => {
          if (!isMountedRef.current) return;
          setData(json as RatingApiResponse);
        });
        window.setTimeout(() => {
          if (!cancelled && isMountedRef.current) setLoading(false);
        }, 200);
      } catch {
        if (!cancelled && isMountedRef.current) setError(true);
      } finally {
        if (!cancelled && !successDeferred && isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const gradeStyle = data ? gradeBadgeStyle(data.rating) : null;
  const conclusionResolved = data
    ? conclusionStyle(normalizeConclusion(data.conclusion))
    : null;
  const showFallbackNotice = Boolean(data && isFallbackRating(data));

  const lockedPreview = (i: number) =>
    data?.reasons[i] ??
    "Further analyst-style drivers are included with TickerRank Pro.";

  const lockPrompt: LockPrompt = isSignedIn ? "upgrade" : "sign-in";

  return (
    <div className="rating-details-root min-w-0">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      {error ? (
        <div
          className="mb-8 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          Data temporarily unavailable. Please try again later.
        </div>
      ) : null}

      {data && !loading && showFallbackNotice ? (
        <div
          className="mb-8 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          AI model temporarily unavailable. Showing neutral placeholder. Real
          ratings will return shortly.
        </div>
      ) : null}

      <div className="border-b border-white/10 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Rating
            </p>
            <h1 className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {symbol}
              </span>
              <span className="text-lg text-slate-400 sm:text-xl">
                {loading || !data ? "…" : data.companyName}
              </span>
            </h1>
          </div>
          {loading ? (
            <div className="inline-flex h-[4.5rem] min-w-[5.5rem] shrink-0 items-center justify-center rounded-2xl border-2 border-white/10 bg-white/[0.04] px-6 py-3 text-slate-500">
              <Spinner className="size-8 border-white/15 border-t-slate-400" />
            </div>
          ) : data && gradeStyle ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:justify-start">
              <div
                className={`inline-flex shrink-0 items-center justify-center rounded-2xl border-2 px-6 py-3 text-4xl font-black tabular-nums shadow-lg ${gradeStyle.bg} ${gradeStyle.border} ${gradeStyle.text} ${gradeStyle.shadow}`}
              >
                {data.rating}
              </div>
              {data.cached ? (
                <span
                  className="inline-flex shrink-0 items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200"
                  title="Served from cache"
                >
                  Cached
                </span>
              ) : null}
            </div>
          ) : (
            <div className="inline-flex h-[4.5rem] min-w-[5.5rem] shrink-0 items-center justify-center rounded-2xl border-2 border-white/10 bg-white/[0.04] px-6 py-3 text-2xl font-bold text-slate-500">
              —
            </div>
          )}
        </div>
      </div>

      <div key={symbol} className="contents">
        <div className="mt-8 flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-center">
            <div className="flex-1">
              {loading ? (
                <div className="w-full space-y-3">
                  <div
                    className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="text-sm font-medium text-slate-400">
                      Score
                    </span>
                    <span className="text-sm font-medium leading-snug text-slate-200">
                      {loadingStepText}
                    </span>
                  </div>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={simulatedProgress}
                    aria-label="Rating progress"
                  >
                    <div
                      className="h-full rounded-full bg-[#3B82F6] transition-[width] duration-300 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, simulatedProgress))}%` }}
                    />
                  </div>
                  {showSlowTip && slowTipQuote ? (
                    <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs italic leading-relaxed text-slate-400">
                      {slowTipQuote}
                    </p>
                  ) : null}
                </div>
              ) : data ? (
                <>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium text-slate-400">
                      Score
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-white">
                      {data.score}
                      <span className="text-base font-normal text-slate-500">
                        {" "}
                        / 100
                      </span>
                    </span>
                  </div>
                  <div
                    className="mt-2 h-3 overflow-hidden rounded-full bg-white/10"
                    role="meter"
                    aria-valuenow={data.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Composite score"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] transition-[width] duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, data.score))}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium text-slate-400">
                      Score
                    </span>
                    <span className="text-slate-500">—</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10" />
                </>
              )}
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Conclusion
              </p>
              {loading ? (
                <p className="mt-1 text-sm text-slate-500">…</p>
              ) : data && conclusionResolved ? (
                <p
                  className={`mt-1 inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${conclusionResolved.className}`}
                >
                  {conclusionResolved.label}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">—</p>
              )}
            </div>
          </div>

        <section className="mt-10" aria-labelledby="trend-heading">
          <h2
            id="trend-heading"
            className="text-sm font-semibold uppercase tracking-wider text-slate-400"
          >
            Trend (sample data)
          </h2>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <RatingHistoryChart />
          </div>
        </section>

        {data && !loading ? (
          <div>
            <section className="mt-10" aria-labelledby="metrics-heading">
              <h2
                id="metrics-heading"
                className="text-sm font-semibold uppercase tracking-wider text-slate-400"
              >
                Metric bars
              </h2>
              <MetricBars
                metrics={data.metrics}
                isPro={isPro}
                lockPrompt={lockPrompt}
              />
            </section>

            {isPro ? (
              <section className="mt-10" aria-labelledby="news-sentiment-heading">
                <h2
                  id="news-sentiment-heading"
                  className="text-sm font-semibold uppercase tracking-wider text-slate-400"
                >
                  News sentiment
                </h2>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                  <p className="text-sm leading-relaxed text-slate-300">
                    Sentiment score in the model blends analyst tone, earnings
                    context, and directional language from recent headlines. Your
                    composite{" "}
                    <span className="font-semibold text-white">
                      {METRIC_BARS.find((b) => b.key === "Sentiment")?.label ??
                        "Sentiment"}
                    </span>{" "}
                    reading is{" "}
                    <span className="font-semibold tabular-nums text-[#93C5FD]">
                      {Math.min(100, Math.max(0, Math.round(data.metrics.Sentiment)))}%
                    </span>
                    — higher suggests more constructive narrative pressure in the
                    inputs the AI weighed for this rating.
                  </p>
                </div>
              </section>
            ) : null}

            <section className="mt-10" aria-labelledby="reasons-heading">
              <h2
                id="reasons-heading"
                className="text-sm font-semibold uppercase tracking-wider text-slate-400"
              >
                Reasons
              </h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 marker:text-slate-500">
                {(isPro ? data.reasons : data.reasons.slice(0, 3)).map((r, i) => (
                  <li
                    key={`${symbol}-reason-${i}`}
                    className="rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-2 pr-4 text-sm leading-relaxed text-slate-300 sm:pl-3"
                  >
                    {r}
                  </li>
                ))}
              </ol>
              {isPro ? null : (
                <ul className="mt-3 list-none space-y-3">
                  <LockedReason
                    key={`${symbol}-locked-3`}
                    preview={lockedPreview(3)}
                    lockPrompt={lockPrompt}
                  />
                  <LockedReason
                    key={`${symbol}-locked-4`}
                    preview={lockedPreview(4)}
                    lockPrompt={lockPrompt}
                  />
                </ul>
              )}
            </section>

            <section
              className="mt-10 rounded-2xl border border-[#3B82F6]/30 bg-[#3B82F6]/10 p-5 sm:p-6"
              aria-labelledby="trust-heading"
            >
              <h2
                id="trust-heading"
                className="text-sm font-semibold uppercase tracking-wider text-[#93C5FD]"
              >
                AI trust panel
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>
                  Based on{" "}
                  <span className="font-semibold text-white">
                    {data.trustInfo.indicatorsCount}
                  </span>{" "}
                  indicators.
                </li>
                <li>
                  Model:{" "}
                  <span className="font-mono text-white">
                    TickerRank {data.trustInfo.modelVersion}
                  </span>
                </li>
                <li>
                  Updated:{" "}
                  <span className="text-white">
                    {formatTrustDate(data.trustInfo.dataUpdatedAt)}
                  </span>
                </li>
                <li>
                  Valid until:{" "}
                  <span className="text-white">
                    {formatTrustDate(data.trustInfo.ratingValidUntil)}
                  </span>
                </li>
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </main>
    </div>
  );
}

export default function RatingPage() {
  const searchParams = useSearchParams();
  const { user, isLoaded: userLoaded } = useUser();
  const symbol = useMemo(
    () => normalizeSymbol(searchParams.get("symbol")),
    [searchParams],
  );

  const subscription =
    userLoaded && user?.publicMetadata && typeof user.publicMetadata === "object"
      ? (user.publicMetadata as { subscription?: unknown }).subscription
      : undefined;
  const isPro = userLoaded && subscription === "pro";
  const isSignedIn = Boolean(user);

  if (!symbol) {
    return <NoSymbolPrompt />;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
      <SiteHeader />
      <RatingDetails
        symbol={symbol}
        isPro={isPro}
        isSignedIn={isSignedIn}
      />
      <SiteFooter />
    </div>
  );
}