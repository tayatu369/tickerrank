"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useState } from "react";
import { HomeAuthNav } from "../components/home-auth-nav";

const FREE_FEATURES = [
  "3 ratings per day",
  "Rating badge (A+ to F)",
  "Basic rating history chart (last 6 months)",
  "1 AI reason",
  "3 core metrics",
] as const;

const PRO_FEATURES = [
  "Unlimited ratings",
  "Full rating history (unlimited)",
  "5 AI reasons",
  "All 5 metrics (Growth, Financial Health, Momentum, Value, Sentiment)",
  "News sentiment analysis",
  "Buffett Lens (valuation perspective)",
  "Weekly email report",
] as const;

function userIsPro(
  user: ReturnType<typeof useUser>["user"],
  isLoaded: boolean,
): boolean {
  if (!isLoaded || !user?.publicMetadata) return false;
  const m = user.publicMetadata as Record<string, unknown>;
  return m.plan === "pro" || m.isPro === true;
}

function SiteHeader() {
  return (
    <header className="border-b border-white/5 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6] text-sm font-bold text-white"
            aria-hidden
          >
            TR
          </span>
          <span>TickerRank</span>
        </Link>
        <HomeAuthNav />
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 px-4 py-6 sm:px-6">
      <p className="mx-auto max-w-5xl text-center text-xs text-slate-500">
        Not financial advice. NFA.
      </p>
    </footer>
  );
}

export default function PricingPage() {
  const { user, isLoaded } = useUser();
  const isPro = userIsPro(user, isLoaded);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleSubscribe = useCallback(async () => {
    setCheckoutError(null);
    if (!user?.id) {
      setCheckoutError("Sign in to subscribe.");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      let data: { url?: string; error?: string } = {};
      const raw = await res.text();
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setCheckoutError(
          raw
            ? `Checkout failed (${res.status}): ${raw.slice(0, 200)}`
            : `Checkout failed (${res.status}): empty response`,
        );
        return;
      }

      if (!res.ok) {
        const detail =
          typeof data.error === "string" && data.error.length > 0
            ? data.error
            : `Request failed (${res.status})`;
        setCheckoutError(detail);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(
        typeof data.error === "string" && data.error.length > 0
          ? data.error
          : "No checkout URL returned.",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setCheckoutError(`Network error: ${msg}`);
    } finally {
      setCheckoutLoading(false);
    }
  }, [user?.id]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Simple pricing
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-400 sm:text-lg">
            Start free or unlock Pro for unlimited ratings and deeper AI insight.
          </p>
        </div>

        {checkoutError ? (
          <div
            className="mx-auto mt-8 max-w-2xl rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-100"
            role="alert"
          >
            {checkoutError}
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Free */}
          <section
            className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8"
            aria-labelledby="pricing-free"
          >
            <h2 id="pricing-free" className="text-xl font-semibold text-white">
              Free
            </h2>
            <p className="mt-2 text-3xl font-bold tabular-nums text-white sm:text-4xl">
              $0{" "}
              <span className="text-lg font-normal text-slate-400 sm:text-xl">
                / month
              </span>
            </p>
            <ul className="mt-8 flex-1 space-y-3 text-sm text-slate-300">
              {FREE_FEATURES.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="shrink-0 text-[#3B82F6]" aria-hidden>
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 text-base font-semibold text-slate-100 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
            >
              Get Started
            </Link>
          </section>

          {/* Pro */}
          <section
            className="relative flex flex-col rounded-2xl border-2 border-[#3B82F6] bg-white/[0.03] p-6 shadow-[0_0_40px_-12px_rgba(59,130,246,0.35)] sm:p-8"
            aria-labelledby="pricing-pro"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="pricing-pro" className="text-xl font-semibold text-white">
                Pro
              </h2>
              {isPro ? (
                <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                  Current Plan
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums text-white sm:text-4xl">
              $9.99{" "}
              <span className="text-lg font-normal text-slate-400 sm:text-xl">
                / month
              </span>
            </p>
            <ul className="mt-8 flex-1 space-y-3 text-sm text-slate-300">
              {PRO_FEATURES.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="shrink-0 text-[#3B82F6]" aria-hidden>
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isPro || checkoutLoading || !isLoaded || !user}
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#3B82F6] px-6 text-base font-semibold text-white transition-colors hover:bg-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6] disabled:pointer-events-none disabled:opacity-50"
            >
              {checkoutLoading
                ? "Redirecting…"
                : isPro
                  ? "Current Plan"
                  : "Subscribe"}
            </button>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
