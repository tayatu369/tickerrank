import {
  getOrGenerateDailyCachedRating,
  validateSymbol,
} from "@/lib/rating/daily-cached-rating";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BG = "#0B1120";
const ACCENT = "#3B82F6";
const CTA_GRAY = "#94a3b8";

function OgImageFooter() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        flexShrink: 0,
        paddingTop: 28,
        gap: 10,
      }}
    >
      <div
        style={{
          width: "100%",
          borderTop: "1px solid rgba(148, 163, 184, 0.22)",
        }}
      />
      <div
        style={{
          fontSize: 10,
          color: CTA_GRAY,
          lineHeight: 1.35,
          letterSpacing: "0.02em",
        }}
      >
        Full analysis & more stock ratings → tickerrank.com
      </div>
    </div>
  );
}

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

  const result = await getOrGenerateDailyCachedRating(symbol);
  const body = result.ok ? result.responseBody : null;
  const rating =
    body && body.rating != null ? String(body.rating).trim() : "";
  const useFallback = !result.ok || !rating;

  if (useFallback) {
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
              alignItems: "flex-start",
              gap: 20,
              position: "relative",
              paddingTop: 20,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: "#94A3B8",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                maxWidth: 900,
              }}
            >
              Rating unavailable
            </div>
          </div>
          <OgImageFooter />
        </div>
      ),
      {
        width: 1080,
        height: 1080,
        status: 404,
      },
    );
  }

  const cached = body as Record<string, unknown>;
  const reason1 = shorten(reason1FromCached(cached), 80);

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
        <OgImageFooter />
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    },
  );
}
