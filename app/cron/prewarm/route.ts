import { validateCronRequest } from "@/lib/automation/cron-secret";
import { kvGetSafe } from "@/lib/kv-safe";
import {
  getOrGenerateDailyCachedRating,
  utcDateKey,
} from "@/lib/rating/daily-cached-rating";
import { type NextRequest, NextResponse } from "next/server";

const PREWARM_SYMBOLS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"] as const;

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

/** Whole seconds from `now` until the next 00:00:00 UTC (minimum 60). */
function secondsUntilNextUtcMidnight(now: Date = new Date()): number {
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const d = now.getUTCDate();
  const nextMidnightMs = Date.UTC(y, mo, d + 1, 0, 0, 0, 0);
  const sec = Math.ceil((nextMidnightMs - now.getTime()) / 1000);
  return Math.max(60, sec);
}

type PrewarmSymbolResult =
  | { ok: true; skipped: true; reason: "already_cached" }
  | { ok: true; skipped: false; fromCache: boolean }
  | { ok: false; status: number; error: string };

export async function GET(request: NextRequest) {
  const denied = validateCronRequest(request);
  if (denied) return denied;

  const now = new Date();
  const cacheDate = utcDateKey(now);
  const kvTtlSeconds = secondsUntilNextUtcMidnight(now);

  const results: Record<string, PrewarmSymbolResult> = {};

  for (const symbol of PREWARM_SYMBOLS) {
    const cacheKey = `rating:${symbol}:${cacheDate}`;

    let cached: unknown = null;
    try {
      cached = await kvGetSafe(cacheKey);
    } catch {
      cached = null;
    }

    if (cached !== null && typeof cached === "object" && !Array.isArray(cached)) {
      results[symbol] = {
        ok: true,
        skipped: true,
        reason: "already_cached",
      };
      continue;
    }

    const result = await getOrGenerateDailyCachedRating(symbol, {
      kvExSeconds: kvTtlSeconds,
    });

    if (result.ok) {
      results[symbol] = {
        ok: true,
        skipped: false,
        fromCache: result.responseBody.cached === true,
      };
    } else {
      const err = result.responseBody.error;
      results[symbol] = {
        ok: false,
        status: result.status,
        error: typeof err === "string" ? err : "Failed to generate rating",
      };
    }
  }

  const succeeded = PREWARM_SYMBOLS.filter((s) => results[s]?.ok === true);
  const failed = PREWARM_SYMBOLS.filter((s) => results[s]?.ok !== true);

  return NextResponse.json({
    ok: true,
    cacheDate,
    kvTtlSeconds,
    symbols: [...PREWARM_SYMBOLS],
    successCount: succeeded.length,
    failureCount: failed.length,
    succeeded,
    failed,
    results,
  });
}
