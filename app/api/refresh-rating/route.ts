import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  isKvUnavailableError,
  kvDecrSafe,
  kvDelSafe,
  kvGetSafe,
  kvIncrSafe,
  warnKvUnavailableOnce,
} from "@/lib/kv-safe";
import { type NextRequest, NextResponse } from "next/server";

function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function validateSymbol(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.trim() === "") return null;
  const symbol = raw.trim().toUpperCase();
  if (!/^[A-Z]{1,10}$/.test(symbol)) return null;
  return symbol;
}

function countFromKvGet(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const symbol = validateSymbol(
      body &&
        typeof body === "object" &&
        body !== null &&
        "symbol" in body &&
        (body as { symbol: unknown }).symbol != null
        ? (body as { symbol: unknown }).symbol
        : null,
    );
    if (!symbol) {
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
    }

    const today = new Date();
    const cacheDate = utcDateKey(today);
    const countKey = `refresh-count:${userId}:${cacheDate}`;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const subscription = user.publicMetadata?.subscription;
    const isPro = subscription === "pro";

    let newCount: number | null = null;
    try {
      const priorRaw = await kvGetSafe(countKey);
      if (!isPro) {
        const prior = countFromKvGet(priorRaw);
        if (prior >= 3) {
          return NextResponse.json(
            { error: "Daily refresh limit reached" },
            { status: 429 },
          );
        }
      }

      newCount = await kvIncrSafe(countKey);

      if (!isPro && newCount !== null) {
        if (newCount > 3) {
          await kvDecrSafe(countKey);
          return NextResponse.json(
            { error: "Daily refresh limit reached" },
            { status: 429 },
          );
        }
      }

      const ratingCacheKey = `rating:${symbol}:${cacheDate}`;
      await kvDelSafe(ratingCacheKey);
    } catch (err) {
      console.error("[refresh-rating] KV block", err);
      if (isKvUnavailableError(err)) {
        warnKvUnavailableOnce();
      }
      newCount = null;
    }

    const remaining =
      isPro || newCount === null ? -1 : Math.max(0, 3 - newCount);

    return NextResponse.json({ success: true, remaining });
  } catch (err) {
    console.error("[refresh-rating]", err);
    if (isKvUnavailableError(err)) {
      warnKvUnavailableOnce();
      return NextResponse.json({ success: true, remaining: -1 });
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to refresh rating cache",
      },
      { status: 500 },
    );
  }
}
