import { kvGetSafe } from "@/lib/kv-safe";
import {
  utcDateKey,
  validateSymbol,
} from "@/lib/rating/daily-cached-rating";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BG = "#0B1120";
const ACCENT = "#3B82F6";

function reason1FromCached(cached: Record<string, unknown>): string {
  if (cached.reason1 != null) return String(cached.reason1).trim();
  const reasons = cached.reasons;
  if (Array.isArray(reasons) && reasons[0] != null) {
    return String(reasons[0]).trim();
  }
  return "";
}

function shorten(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen - 1).trimEnd();
  return `${slice}…`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await context.params;
  const symbol = validateSymbol(raw);
  if (!symbol) {
    return new Response("Invalid symbol", { status: 400 });
  }

  const cacheDate = utcDateKey(new Date());
  const cacheKey = `rating:${symbol}:${cacheDate}`;
  let cached: Record<string, unknown> | null = null;
  try {
    const rawCached = await kvGetSafe<unknown>(cacheKey);
    if (rawCached && typeof rawCached === "object" && !Array.isArray(rawCached)) {
      cached = rawCached as Record<string, unknown>;
    }
  } catch {
    cached = null;
  }

  if (!cached) {
    return new Response("No cached rating for today", { status: 404 });
  }

  const rating =
    cached.rating != null ? String(cached.rating).trim() : "";
  if (!rating) {
    return new Response("No cached rating for today", { status: 404 });
  }

  const reason1 = shorten(reason1FromCached(cached), 80);

  const { origin } = new URL(request.url);
  let iconSrc: string | undefined;
  try {
    const iconRes = await fetch(`${origin}/icon.svg`);
    if (iconRes.ok) {
      const svg = await iconRes.text();
      iconSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
  } catch {
    iconSrc = undefined;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: 72,
          position: "relative",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%) rotate(-18deg)",
            fontSize: 280,
            fontWeight: 900,
            color: "rgba(148, 163, 184, 0.16)",
            letterSpacing: "-0.06em",
          }}
        >
          NFA
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            position: "relative",
          }}
        >
          {iconSrc ? (
            <img alt="" src={iconSrc} width={88} height={88} />
          ) : (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 22,
                background: BG,
                border: `3px solid ${ACCENT}`,
              }}
            />
          )}
          <span
            style={{
              color: "#94A3B8",
              fontSize: 34,
              fontWeight: 600,
            }}
          >
            TickerRank
          </span>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 20,
            position: "relative",
            paddingTop: 20,
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: "#F8FAFC",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {symbol}
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              color: ACCENT,
              lineHeight: 1,
            }}
          >
            {rating}
          </div>
          <div
            style={{
              fontSize: 34,
              color: "#CBD5E1",
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            {reason1 || "—"}
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    },
  );
}
