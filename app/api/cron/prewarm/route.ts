import { validateCronRequest } from "@/lib/automation/cron-secret";
import { getOrGenerateDailyCachedRating } from "@/app/api/rating/route";
import { type NextRequest, NextResponse } from "next/server";

const PREWARM_SYMBOLS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"] as const;

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = validateCronRequest(request);
  if (denied) return denied;

  const results: Record<
    string,
    | { ok: true; fromCache: boolean }
    | { ok: false; status: number; error?: string }
  > = {};

  for (const symbol of PREWARM_SYMBOLS) {
    const result = await getOrGenerateDailyCachedRating(symbol);
    if (result.ok) {
      results[symbol] = {
        ok: true,
        fromCache: result.responseBody.cached === true,
      };
    } else {
      const err = result.responseBody.error;
      results[symbol] = {
        ok: false,
        status: result.status,
        error:
          typeof err === "string" ? err : "Failed to generate rating",
      };
    }
  }

  const succeeded = PREWARM_SYMBOLS.filter((s) => results[s]?.ok === true);
  const failed = PREWARM_SYMBOLS.filter((s) => results[s]?.ok !== true);

  return NextResponse.json({
    ok: true,
    symbols: [...PREWARM_SYMBOLS],
    successCount: succeeded.length,
    failureCount: failed.length,
    succeeded,
    failed,
    results,
  });
}
