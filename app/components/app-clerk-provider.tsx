"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { type ReactNode } from "react";

/** Client-only Clerk root so the server layout stays a Server Component. */
export function AppClerkProvider({ children }: { children: ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
