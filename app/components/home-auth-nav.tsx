"use client";

import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { BenignDomErrorBoundary } from "./benign-dom-error-boundary";

const userButtonAppearance = {
  elements: {
    avatarBox: "h-9 w-9 ring-1 ring-white/10",
  },
} as const;

function ClerkNavSkeleton() {
  return (
    <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" aria-hidden />
  );
}

function alertSignInError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  window.alert(`Sign-in could not open: ${msg}`);
}

function triggerSignIn(openSignIn: () => unknown): void {
  try {
    const result = openSignIn();
    if (result != null && typeof (result as PromiseLike<unknown>).then === "function") {
      void (result as PromiseLike<unknown>).then(undefined, alertSignInError);
    }
  } catch (err) {
    alertSignInError(err);
  }
}

/**
 * useAuth + branch avoids Clerk &lt;Show&gt; swapping parallel trees.
 */
export function HomeAuthNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn } = useClerk();

  if (!isLoaded) {
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
          <button
            type="button"
            className="rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-4 py-2 text-sm font-medium text-[#3B82F6] hover:bg-[#3B82F6]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
            onClick={() => triggerSignIn(openSignIn)}
          >
            Sign In
          </button>
        )}
      </div>
    </BenignDomErrorBoundary>
  );
}
