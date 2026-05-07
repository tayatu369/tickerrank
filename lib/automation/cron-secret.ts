import { type NextRequest, NextResponse } from "next/server";

/**
 * Cron routes expect `x-cron-secret` to match `process.env.CRON_SECRET`.
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
  const got = request.headers.get("x-cron-secret");
  if (got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
