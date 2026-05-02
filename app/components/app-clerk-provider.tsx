"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { type ReactNode } from "react";

const publishableKey =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string"
    ? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim()
    : "";

/** Client-only Clerk root so the server layout stays a Server Component. */
export function AppClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      {...(publishableKey ? { publishableKey } : {})}
    >
      {children}
    </ClerkProvider>
  );
}
