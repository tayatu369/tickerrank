"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HomeAuthNav } from "../components/home-auth-nav";

const PORTAL_MESSAGE =
  "Customer Portal will be available once the project is deployed to Vercel and connected to Stripe's live environment.";

function PortalModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-8 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0B1120]/80 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-2xl shadow-black/40 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-modal-title"
      >
        <h2
          id="portal-modal-title"
          className="text-lg font-semibold text-white"
        >
          Manage subscription
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {PORTAL_MESSAGE}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full min-h-11 rounded-xl bg-[#3B82F6] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function SuccessInner() {
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [portalOpen, setPortalOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  void searchParams.get("session_id");

  const handleSyncPro = useCallback(async () => {
    if (!user) return;
    setSyncError(null);
    setSyncSuccess(false);
    setSyncLoading(true);
    try {
      const res = await fetch("/api/sync-pro-status", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setSyncError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      await user.reload();
      setSyncSuccess(true);
    } catch (e) {
      setSyncError(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
    } finally {
      setSyncLoading(false);
    }
  }, [user]);

  const closePortal = useCallback(() => setPortalOpen(false), []);

  if (!isLoaded) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="max-w-md text-base leading-relaxed text-slate-300">
          Please sign in to view your subscription.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#3B82F6] px-6 text-base font-semibold text-white transition-colors hover:bg-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-lg text-center">
          <div
            className="text-5xl sm:text-6xl"
            role="img"
            aria-label="Success"
          >
            ✅
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Subscription Confirmed!
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
            You now have access to TickerRank Pro features. Enjoy unlimited
            ratings, full AI insights, and more.
          </p>

          {syncSuccess ? (
            <p
              className="mx-auto mt-6 max-w-md rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-200"
              role="status"
            >
              Pro status activated!
            </p>
          ) : null}
          {syncError ? (
            <p
              className="mx-auto mt-6 max-w-md rounded-xl border border-rose-400/35 bg-rose-500/15 px-4 py-3 text-sm text-rose-100"
              role="alert"
            >
              {syncError}
            </p>
          ) : null}

          <div className="mt-10 flex w-full flex-col gap-3 sm:mx-auto sm:max-w-md">
            <Link
              href="/"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#3B82F6] px-6 text-base font-semibold text-white shadow-lg shadow-[#3B82F6]/20 transition-colors hover:bg-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
            >
              Go to Rating
            </Link>
            <button
              type="button"
              onClick={() => setPortalOpen(true)}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#3B82F6]/40 bg-transparent px-6 text-base font-semibold text-[#93C5FD] transition-colors hover:border-[#3B82F6]/60 hover:bg-[#3B82F6]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
            >
              Manage Subscription
            </button>
            <button
              type="button"
              onClick={handleSyncPro}
              disabled={syncLoading}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-6 text-base font-semibold text-slate-200 transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6] disabled:pointer-events-none disabled:opacity-50"
            >
              {syncLoading ? "Syncing…" : "Manually Sync Pro Status"}
            </button>
          </div>
        </div>
      </div>
      <PortalModal open={portalOpen} onClose={closePortal} />
    </>
  );
}

export default function SuccessPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
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

      <Suspense
        fallback={
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
            <p className="text-sm text-slate-400">Loading…</p>
          </div>
        }
      >
        <SuccessInner />
      </Suspense>

      <footer className="mt-auto border-t border-white/5 px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-5xl text-center text-xs text-slate-500">
          Not financial advice. NFA.
        </p>
      </footer>
    </div>
  );
}
