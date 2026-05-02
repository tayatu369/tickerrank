"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
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

/**
 * useAuth + branch avoids Clerk &lt;Show&gt; swapping parallel trees.
 */
export function HomeAuthNav() {
  const { isLoaded, isSignedIn } = useAuth();

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
          <SignInButton mode="modal" />
        )}
      </div>
    </BenignDomErrorBoundary>
  );
}
