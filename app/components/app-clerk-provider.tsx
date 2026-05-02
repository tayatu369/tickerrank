"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { type ReactNode, useEffect } from "react";

type AppClerkProviderProps = {
  children: ReactNode;
  /** Production publishable key from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (passed from root layout). */
  publishableKey: string;
};

function maskPublishableKey(key: string): string {
  const t = key.trim();
  if (!t) return "(empty)";
  if (t.length <= 8) return `${t.slice(0, 2)}…${t.slice(-2)}`;
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

/** Client-only Clerk root so the server layout stays a Server Component. */
export function AppClerkProvider({
  children,
  publishableKey,
}: AppClerkProviderProps) {
  useEffect(() => {
    console.log(
      "[TickerRank][Clerk] publishableKey (masked):",
      maskPublishableKey(publishableKey),
    );
  }, [publishableKey]);

  return (
    <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
  );
}
