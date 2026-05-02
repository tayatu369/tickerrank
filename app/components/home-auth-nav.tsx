"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BenignDomErrorBoundary } from "./benign-dom-error-boundary";

const userButtonAppearance = {
  elements: {
    avatarBox: "h-9 w-9 ring-1 ring-white/10",
  },
} as const;

function ClerkNavSkeleton() {
  return (
    <div
      className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/10"
      aria-hidden
    />
  );
}

/**
 * useAuth + branch avoids Clerk &lt;Show&gt; swapping parallel trees.
 * Deferred portal mount (after commit) reduces Strict Mode / concurrent
 * races with sibling trees.
 */
export function HomeAuthNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const [portalsReady, setPortalsReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (alive) setPortalsReady(true);
      });
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  if (!isLoaded || !portalsReady) {
    return <ClerkNavSkeleton />;
  }

  return (
    <BenignDomErrorBoundary>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        {isSignedIn ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
            >
              Dashboard
            </Link>
            <UserButton appearance={userButtonAppearance} />
          </>
        ) : (
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-4 py-2 text-sm font-medium text-[#3B82F6] transition-colors hover:bg-[#3B82F6]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
            >
              Sign In
            </button>
          </SignInButton>
        )}
      </div>
    </BenignDomErrorBoundary>
  );
}
