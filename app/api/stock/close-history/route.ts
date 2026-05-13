import { validateSymbol } from "@/lib/rating/daily-cached-rating";
import { fetchCloseHistory } from "@/lib/stock/close-history";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const symbol = validateSymbol(request.nextUrl.searchParams.get("symbol"));
  if (!symbol) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { error: "Query params from and to (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }

  const period1 = new Date(`${from}T00:00:00.000Z`);
  const period2 = new Date(`${to}T23:59:59.999Z`);
  if (Number.isNaN(period1.getTime()) || Number.isNaN(period2.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const points = await fetchCloseHistory(symbol, period1, period2);
  return NextResponse.json({ symbol, points });
}
