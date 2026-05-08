import {
  getOrGenerateDailyCachedRating,
  logRatingApiError,
  SYMBOL_NOT_FOUND,
  SymbolNotFoundError,
  utcDateKey,
  validateSymbol,
} from "@/lib/rating/daily-cached-rating";
import {
  isKvUnavailableError,
  kvDecrSafe,
  kvGetSafe,
  kvIncrSafe,
  warnKvUnavailableOnce,
} from "@/lib/kv-safe";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

function countFromKvGet(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Enforces free-tier daily rating fetches via KV (Pro skipped). Returns 429 response or null to continue. */
async function consumeRatingUsageOrLimitResponse(
  userId: string,
  todayKey: string,
): Promise<NextResponse | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const subscription = user.publicMetadata?.subscription;
  const isPro = subscription === "pro";
  if (isPro) return null;

  const usageKey = `usage:${userId}:${todayKey}`;
  try {
    const priorRaw = await kvGetSafe(usageKey);
    const prior = countFromKvGet(priorRaw);
    if (prior >= 3) {
      return NextResponse.json({ error: "Daily limit reached" }, { status: 429 });
    }

    const newCount = await kvIncrSafe(usageKey);

    if (newCount !== null && newCount > 3) {
      await kvDecrSafe(usageKey);
      return NextResponse.json({ error: "Daily limit reached" }, { status: 429 });
    }
  } catch (err) {
    console.error("[rating API] usage KV block", err);
    if (isKvUnavailableError(err)) {
      warnKvUnavailableOnce();
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const symbolParam = request.nextUrl.searchParams.get("symbol");
    const symbol = validateSymbol(symbolParam);
    if (!symbol) {
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
    }

    const utcToday = new Date();
    const cacheDate = utcDateKey(utcToday);

    const { userId } = await auth();
    if (userId) {
      const limited = await consumeRatingUsageOrLimitResponse(userId, cacheDate);
      if (limited) return limited;
    }

    const result = await getOrGenerateDailyCachedRating(symbol);
    if (!result.ok) {
      return NextResponse.json(result.responseBody, { status: result.status });
    }
    return NextResponse.json(result.responseBody);
  } catch (err) {
    logRatingApiError("GET /api/rating unhandled failure", err);
    if (err instanceof SymbolNotFoundError) {
      return NextResponse.json({ error: SYMBOL_NOT_FOUND }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate rating" }, { status: 500 });
  }
}
