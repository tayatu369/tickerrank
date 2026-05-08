import { type NextRequest, NextResponse } from "next/server";

/**
 * Validates cron invocations against `process.env.CRON_SECRET`.
 *
 * - **Production (Vercel):** When `CRON_SECRET` is set, Vercel sends it as
 *   `Authorization: Bearer <CRON_SECRET>` automatically (no `vercel.json` headers needed).
 * - **Local / custom:** You may also send `x-cron-secret: <CRON_SECRET>`.
 *
 * Returns a NextResponse to return early, or null when authorized.
 */
export function validateCronRequest(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const bearerMatches =
    authHeader != null &&
    authHeader.trim() === `Bearer ${expected}`;

  const headerMatches = request.headers.get("x-cron-secret") === expected;

  if (!bearerMatches && !headerMatches) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
