import { type NextRequest, NextResponse } from "next/server";

/**
 * Validates internal API calls (webhooks, cron-like jobs) against
 * `process.env.INTERNAL_API_SECRET`.
 *
 * Send `Authorization: Bearer <INTERNAL_API_SECRET>` or header
 * `x-internal-api-secret: <INTERNAL_API_SECRET>`.
 *
 * Returns a NextResponse to return early, or null when authorized.
 */
export function validateInternalApiRequest(
  request: NextRequest,
): NextResponse | null {
  const expected = process.env.INTERNAL_API_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "INTERNAL_API_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const bearerMatches =
    authHeader != null && authHeader.trim() === `Bearer ${expected}`;

  const headerMatches =
    request.headers.get("x-internal-api-secret") === expected;

  if (!bearerMatches && !headerMatches) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
