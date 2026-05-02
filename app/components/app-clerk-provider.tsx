"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { type ReactNode } from "react";

type AppClerkProviderProps = {
  children: ReactNode;
  /** Production publishable key from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (passed from root layout). */
  publishableKey: string;
};

/** Client-only Clerk root so the server layout stays a Server Component. */
export function AppClerkProvider({
  children,
  publishableKey,
}: AppClerkProviderProps) {
  return (
    <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
  );
}
