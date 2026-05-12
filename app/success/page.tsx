"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function alertSignInError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  window.alert(`Sign-in could not open: ${msg}`);
}

function triggerSignIn(openSignIn: () => unknown): void {
  try {
    const result = openSignIn();
    if (
      result != null &&
      typeof (result as PromiseLike<unknown>).then === "function"
    ) {
      void (result as PromiseLike<unknown>).then(undefined, alertSignInError);
    }
  } catch (err) {
    alertSignInError(err);
  }
}

function SuccessCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="4" />
      <path
        d="M34 62l18 18 34-44"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SuccessInner() {
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();

  void searchParams.get("session_id");

  if (!isLoaded) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Sign in to continue
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-slate-400">
            Your payment succeeded. Sign in with the same account you used at
            checkout so we can link your TickerRank Pro subscription.
          </p>
          <button
            type="button"
            onClick={() => triggerSignIn(openSignIn)}
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#3B82F6] px-6 text-base font-semibold text-white shadow-lg shadow-[#3B82F6]/25 transition-colors hover:bg-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6] sm:w-auto sm:min-w-[200px]"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      <div className="w-full max-w-md">
        <div
          className="flex justify-center"
          role="img"
          aria-label="Subscription successful"
        >
          <SuccessCheckIcon className="h-24 w-24 text-emerald-400 sm:h-28 sm:w-28" />
        </div>
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Welcome to TickerRank Pro!
        </h1>
        <p className="mt-4 text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
          Your subscription is now active. You have unlimited ratings, full AI
          insights, and news sentiment analysis.
        </p>
        <div className="mt-10 flex w-full flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#3B82F6] px-6 text-base font-semibold text-white shadow-lg shadow-[#3B82F6]/25 transition-colors hover:bg-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#3B82F6]/45 bg-transparent px-6 text-base font-semibold text-[#93C5FD] transition-colors hover:border-[#3B82F6] hover:bg-[#3B82F6]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
          >
            Rate Your First Stock
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0B1120] text-slate-100">
      <Suspense
        fallback={
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
            <p className="text-sm text-slate-400">Loading…</p>
          </div>
        }
      >
        <SuccessInner />
      </Suspense>

      <footer className="mt-auto px-4 pb-8 pt-4 text-center">
        <a
          href="mailto:support@tickerrank.com"
          className="text-xs text-slate-500 transition-colors hover:text-[#3B82F6]"
        >
          Need help? support@tickerrank.com
        </a>
      </footer>
    </div>
  );
}
