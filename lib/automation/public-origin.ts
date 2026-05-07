import { type NextRequest } from "next/server";

/** Prefer proxy headers so URLs match production host in cron / server contexts. */
export function publicOriginFromRequest(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return request.nextUrl.origin;
}
