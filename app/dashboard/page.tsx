"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { readRecentSymbols } from "@/lib/recent-queries";

function subscriptionLabel(
  meta: Record<string, unknown> | undefined,
): "pro" | "free" {
  if (!meta || typeof meta !== "object") return "free";
  const sub = meta.subscription;
  if (typeof sub === "string" && sub.toLowerCase() === "pro") return "pro";
  return "free";
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setRecent(readRecentSymbols());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <p className="text-sm text-slate-400">Loading…</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const plan = subscriptionLabel(
    user?.publicMetadata as Record<string, unknown> | undefined,
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-base text-slate-400">
            Overview of your TickerRank account and recent activity.
          </p>

          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white">Subscription</h2>
            {plan === "pro" ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-slate-300">You are on the Pro plan.</p>
                <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                  Pro
                </span>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-slate-300">You are on the Free plan.</p>
                <span className="inline-flex w-fit items-center rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Free
                </span>
              </div>
            )}
            {plan === "free" ? (
              <p className="mt-4 text-sm text-slate-400">
                Unlock unlimited ratings and full Pro features.{" "}
                <Link
                  href="/pricing"
                  className="font-medium text-[#60A5FA] hover:text-[#93C5FD] hover:underline"
                >
                  View pricing and upgrade
                </Link>
                .
              </p>
            ) : null}
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white">Query history</h2>
            <p className="mt-2 text-sm text-slate-400">
              Tickers you recently viewed on this device appear below.
            </p>
            {recent.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-white/15 bg-[#0B1120]/60 px-4 py-8 text-center text-sm text-slate-500">
                No recent queries. Search for a ticker on the home page to build
                your history.
              </p>
            ) : (
              <ul className="mt-6 flex flex-wrap gap-2">
                {recent.map((sym) => (
                  <li key={sym}>
                    <Link
                      href={`/rating?symbol=${encodeURIComponent(sym)}`}
                      className="inline-flex min-h-10 items-center rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 font-mono text-sm font-medium text-[#93C5FD] transition-colors hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/10"
                    >
                      {sym}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
