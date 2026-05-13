import {
  generatePortfolioAnalysis,
  type PortfolioHoldingInput,
} from "@/lib/portfolio/generate-portfolio-analysis";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { holdings?: unknown };

function isHolding(x: unknown): x is PortfolioHoldingInput {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const metrics = o.metrics;
  if (!metrics || typeof metrics !== "object") return false;
  const m = metrics as Record<string, unknown>;
  return (
    typeof o.symbol === "string" &&
    typeof o.companyName === "string" &&
    typeof o.rating === "string" &&
    typeof o.score === "number" &&
    typeof o.conclusion === "string" &&
    Array.isArray(o.reasons) &&
    o.reasons.every((r) => typeof r === "string") &&
    typeof m.Growth === "number" &&
    typeof m.FinancialHealth === "number" &&
    typeof m.Momentum === "number" &&
    typeof m.Value === "number" &&
    typeof m.Sentiment === "number"
  );
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const subscription = user?.publicMetadata?.subscription;
    if (subscription !== "pro") {
      return NextResponse.json(
        { error: "Pro subscription required" },
        { status: 403 },
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const rawHoldings = body.holdings;
    if (!Array.isArray(rawHoldings) || rawHoldings.length === 0) {
      return NextResponse.json(
        { error: "holdings must be a non-empty array" },
        { status: 400 },
      );
    }
    if (rawHoldings.length > 10) {
      return NextResponse.json(
        { error: "Too many holdings" },
        { status: 400 },
      );
    }

    const holdings: PortfolioHoldingInput[] = [];
    for (const item of rawHoldings) {
      if (!isHolding(item)) {
        return NextResponse.json(
          { error: "Invalid holding shape" },
          { status: 400 },
        );
      }
      holdings.push({
        ...item,
        reasons: item.reasons
          .filter((r): r is string => typeof r === "string")
          .map((r) => r.slice(0, 200)),
      });
    }

    const analysis = await generatePortfolioAnalysis(holdings);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[portfolio-analysis API]", err);
    const msg =
      err instanceof Error ? err.message : "Failed to analyze portfolio";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
