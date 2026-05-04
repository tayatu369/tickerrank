"use client";

import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { FormEvent, useState } from "react";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export default function FeatureRequestsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [idea, setIdea] = useState("");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/feature-requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, reason, email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(
          data.error ??
            "Something went wrong. Please try again in a moment.",
        );
        return;
      }
      setSuccess(true);
      setIdea("");
      setReason("");
      setEmail("");
    } catch {
      setError(
        "We could not reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <p className="text-sm text-slate-400">Loading…</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0B1120] text-slate-100">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto w-full max-w-lg">
          <p className="text-sm font-medium text-[#3B82F6]">Feedback</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Request a Feature
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
            Help shape the future of TickerRank. We build what you need.
          </p>

          {success ? (
            <div
              className="mt-10 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 sm:text-base"
              role="status"
            >
              Thank you! Your request has been submitted. We review every
              suggestion.
            </div>
          ) : (
            <form className="mt-10 space-y-6" onSubmit={onSubmit}>
              {error ? (
                <div
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="idea"
                  className="block text-sm font-medium text-slate-200"
                >
                  Your idea{" "}
                  <span className="font-normal text-red-400">*</span>
                </label>
                <textarea
                  id="idea"
                  name="idea"
                  required
                  rows={4}
                  value={idea}
                  onChange={(ev) => setIdea(ev.target.value)}
                  placeholder='e.g., Add a portfolio tracker...'
                  className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                />
              </div>

              <div>
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-slate-200"
                >
                  Why is this important to you?
                  <span className="ml-1 font-normal text-slate-500">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  value={reason}
                  onChange={(ev) => setReason(ev.target.value)}
                  className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-200"
                >
                  Your email (optional, if you&apos;d like a reply)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px]"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
