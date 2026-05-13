"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

const MAX_TICKERS = 10;

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
};

type PortfolioRow = { symbol: string; data: RatingApiResponse };
type PortfolioError = { symbol: string; message: string };

function validateTicker(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (!s || !/^[A-Z]{1,10}$/.test(s)) return null;
  return s;
}

function scoreGaugeColor(score: number): string {
  const s = Math.min(100, Math.max(0, score));
  if (s < 45) return "#EF4444";
  if (s < 60) return "#F59E0B";
  if (s < 75) return "#EAB308";
  return "#22C55E";
}

function assessPortfolioRisk(rows: PortfolioRow[]): {
  label: string;
  detail: string;
  tone: "high" | "moderate" | "low";
} {
  const n = rows.length;
  if (n === 0) {
    return {
      label: "—",
      detail: "Add tickers and run a rating.",
      tone: "low",
    };
  }
  const below50 = rows.filter((r) => r.data.score < 50).length;
  const avg = rows.reduce((a, r) => a + r.data.score, 0) / n;
  const shareWeak = below50 / n;

  if (
    (n === 1 && rows[0]!.data.score < 50) ||
    below50 >= 2 ||
    shareWeak >= 0.4
  ) {
    return {
      label: "High Risk",
      detail: `${below50} of ${n} position(s) score below 50 — concentration in weaker names raises portfolio risk.`,
      tone: "high",
    };
  }
  if (below50 >= 1 || avg < 55) {
    return {
      label: "Moderate Risk",
      detail:
        below50 >= 1
          ? "At least one holding is below 50 — review sizing and thesis."
          : "Average score is subdued; diversification or quality upgrades may help.",
      tone: "moderate",
    };
  }
  return {
    label: "Lower Risk",
    detail:
      "Most holdings show healthier composite scores; still not a guarantee of performance.",
    tone: "low",
  };
}

function PortfolioGauge({ score }: { score: number }) {
  const s = Math.min(100, Math.max(0, score));
  const color = scoreGaugeColor(s);
  const track = "rgba(148, 163, 184, 0.2)";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={140}
        height={80}
        viewBox="0 0 140 80"
        className="overflow-visible"
        aria-hidden
      >
        <path
          d="M 16 70 A 54 54 0 0 1 124 70"
          fill="none"
          stroke={track}
          strokeWidth={12}
          strokeLinecap="round"
          pathLength={100}
        />
        <path
          d="M 16 70 A 54 54 0 0 1 124 70"
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${s} ${100 - s}`}
        />
      </svg>
      <p
        className="text-3xl font-bold tabular-nums"
        style={{ color }}
        aria-live="polite"
      >
        {Math.round(s)}
      </p>
      <p className="text-xs text-slate-500">Equal-weighted composite (0–100)</p>
    </div>
  );
}

export default function PortfolioPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const subscription =
    userLoaded && user?.publicMetadata && typeof user.publicMetadata === "object"
      ? (user.publicMetadata as { subscription?: unknown }).subscription
      : undefined;
  const isPro = userLoaded && subscription === "pro";

  const [input, setInput] = useState("");
  const [tickers, setTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<PortfolioError[]>([]);
  const [rows, setRows] = useState<PortfolioRow[] | null>(null);

  const addTicker = useCallback(
    (raw: string) => {
      const t = validateTicker(raw);
      if (!t) return;
      setTickers((prev) => {
        if (prev.includes(t)) return prev;
        if (prev.length >= MAX_TICKERS) return prev;
        return [...prev, t];
      });
      setInput("");
    },
    [],
  );

  const removeTicker = useCallback((t: string) => {
    setTickers((prev) => prev.filter((x) => x !== t));
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTicker(input);
    }
    if (e.key === "Backspace" && !input && tickers.length > 0) {
      removeTicker(tickers[tickers.length - 1]!);
    }
  };

  const ratePortfolio = async () => {
    if (tickers.length === 0) return;
    setLoading(true);
    setErrors([]);
    setRows(null);

    const outcomes = await Promise.all(
      tickers.map(async (symbol) => {
        try {
          const res = await fetch(
            `/api/rating?symbol=${encodeURIComponent(symbol)}`,
            { cache: "no-store", credentials: "same-origin" },
          );
          const json = (await res.json()) as Record<string, unknown>;
          if (!res.ok) {
            const err =
              typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
            return {
              ok: false as const,
              symbol,
              message: err,
            };
          }
          const data = json as unknown as RatingApiResponse;
          if (typeof data.score !== "number") {
            return {
              ok: false as const,
              symbol,
              message: "Invalid response",
            };
          }
          return { ok: true as const, symbol, data };
        } catch {
          return {
            ok: false as const,
            symbol,
            message: "Network error",
          };
        }
      }),
    );

    const okRows: PortfolioRow[] = [];
    const bad: PortfolioError[] = [];
    for (const o of outcomes) {
      if (o.ok) okRows.push({ symbol: o.symbol, data: o.data });
      else bad.push({ symbol: o.symbol, message: o.message });
    }

    setErrors(bad);
    setRows(okRows.length > 0 ? okRows : null);
    setLoading(false);
  };

  const portfolioScore = useMemo(() => {
    if (!rows?.length) return null;
    const sum = rows.reduce((a, r) => a + r.data.score, 0);
    return sum / rows.length;
  }, [rows]);

  const risk = useMemo(() => (rows ? assessPortfolioRisk(rows) : null), [rows]);

  const riskBadgeClass =
    risk?.tone === "high"
      ? "border-red-500/40 bg-red-500/15 text-red-200"
      : risk?.tone === "moderate"
        ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Portfolio rater
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Add up to ten US tickers. We call the same AI rating used on single
          stocks and blend scores with equal weights (simple weighted average:
          each position 1/N).
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <label
            htmlFor="ticker-multiselect"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Tickers
          </label>
          <div
            id="ticker-multiselect"
            className="mt-2 flex min-h-[52px] flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2 focus-within:ring-2 focus-within:ring-[#3B82F6]/50"
          >
            {tickers.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/15 px-2.5 py-1 text-sm font-semibold text-[#93C5FD]"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTicker(t)}
                  className="ml-0.5 rounded p-0.5 text-[#93C5FD] hover:bg-white/10 hover:text-white"
                  aria-label={`Remove ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="ticker-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={10}
              disabled={tickers.length >= MAX_TICKERS}
              placeholder={
                tickers.length >= MAX_TICKERS
                  ? "Maximum 10 tickers"
                  : "Type symbol & press Enter"
              }
              value={input}
              onChange={(e) =>
                setInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
              }
              onKeyDown={onKeyDown}
              className="min-w-[160px] flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {tickers.length}/{MAX_TICKERS} tickers · US symbols only (letters
            A–Z)
          </p>
          <button
            type="button"
            onClick={() => void ratePortfolio()}
            disabled={tickers.length === 0 || loading}
            className="mt-4 w-full rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {loading ? "Rating portfolio…" : "Rate My Portfolio"}
          </button>
        </div>

        {errors.length > 0 ? (
          <div
            className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            role="alert"
          >
            <p className="font-semibold">Some requests failed</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/90">
              {errors.map((e) => (
                <li key={e.symbol}>
                  <span className="font-mono">{e.symbol}</span>: {e.message}
                </li>
              ))}
            </ul>
            {rows && rows.length > 0 ? (
              <p className="mt-2 text-xs text-amber-200/80">
                Scores below use {rows.length} successful response(s) only.
              </p>
            ) : null}
          </div>
        ) : null}

        {portfolioScore != null && risk && rows && rows.length > 0 ? (
          <section className="mt-10 space-y-8" aria-labelledby="portfolio-results">
            <h2
              id="portfolio-results"
              className="text-sm font-semibold uppercase tracking-wider text-slate-400"
            >
              Results
            </h2>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Overall portfolio score
                </p>
                <div className="mt-4 flex justify-center">
                  <PortfolioGauge score={portfolioScore} />
                </div>
              </div>
              <div className={`rounded-2xl border p-6 ${riskBadgeClass}`}>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
                  Risk assessment
                </p>
                <p className="mt-3 text-xl font-bold">{risk.label}</p>
                <p className="mt-2 text-sm leading-relaxed opacity-95">
                  {risk.detail}
                </p>
              </div>
            </div>

            <div className="relative mt-2">
              <div
                className={!isPro ? "select-none blur-md" : ""}
                aria-hidden={!isPro}
              >
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Holdings breakdown
                </h3>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3 font-semibold">Symbol</th>
                        <th className="px-4 py-3 font-semibold">Rating</th>
                        <th className="px-4 py-3 font-semibold">Score</th>
                        <th className="px-4 py-3 font-semibold">Conclusion</th>
                        <th className="px-4 py-3 font-semibold">
                          Metric snapshot
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.symbol}
                          className="border-b border-white/5 last:border-0"
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-white">
                            {r.symbol}
                          </td>
                          <td className="px-4 py-3 text-[#93C5FD]">
                            {r.data.rating}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-300">
                            {Math.round(r.data.score)}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {r.data.conclusion}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            G{" "}
                            {Math.round(r.data.metrics.Growth)} · H{" "}
                            {Math.round(r.data.metrics.FinancialHealth)} · M{" "}
                            {Math.round(r.data.metrics.Momentum)} · V{" "}
                            {Math.round(r.data.metrics.Value)} · S{" "}
                            {Math.round(r.data.metrics.Sentiment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {!isPro ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#0B1120]/55 px-6 text-center">
                  <p className="pointer-events-auto max-w-md text-sm font-medium leading-snug text-slate-200">
                    Upgrade to Pro for deep portfolio analysis
                  </p>
                  <Link
                    href="/pricing"
                    className="pointer-events-auto rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"
                  >
                    View plans
                  </Link>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
