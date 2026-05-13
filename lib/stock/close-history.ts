import YahooFinance from "yahoo-finance2";
import { validateSymbol } from "@/lib/rating/daily-cached-rating";

export type CloseHistoryPoint = { date: string; close: number };

function toUtcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Yahoo Finance requires period1 and period2 to differ; enforce a minimum span. */
export function normalizeChartDateRange(
  period1: Date,
  period2: Date,
): { period1: Date; period2: Date } {
  let start = new Date(period1);
  let end = new Date(period2);
  if (start > end) {
    const t = start;
    start = end;
    end = t;
  }
  if (end.getTime() - start.getTime() < 86_400_000) {
    start = new Date(end.getTime() - 35 * 86_400_000);
  }
  return { period1: start, period2: end };
}

async function fetchYahooCloses(
  symbol: string,
  period1: Date,
  period2: Date,
): Promise<CloseHistoryPoint[]> {
  const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
  });
  const { period1: p1, period2: p2 } = normalizeChartDateRange(period1, period2);

  const result = await yahooFinance.chart(symbol, {
    period1: p1,
    period2: p2,
    interval: "1d",
  });

  const out: CloseHistoryPoint[] = [];
  for (const q of result.quotes ?? []) {
    if (q.close == null || typeof q.close !== "number" || Number.isNaN(q.close)) {
      continue;
    }
    const d = q.date instanceof Date ? q.date : new Date(q.date);
    if (Number.isNaN(d.getTime())) continue;
    out.push({ date: toUtcDateKey(d), close: q.close });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

async function fetchFinnhubCloses(
  symbol: string,
  token: string,
  period1: Date,
  period2: Date,
): Promise<CloseHistoryPoint[]> {
  const { period1: p1, period2: p2 } = normalizeChartDateRange(period1, period2);
  const from = Math.floor(p1.getTime() / 1000);
  const to = Math.floor(p2.getTime() / 1000);
  const enc = encodeURIComponent;
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${enc(
    symbol,
  )}&resolution=D&from=${from}&to=${to}&token=${enc(token)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Finnhub candle HTTP ${res.status}`);
  }

  const j = (await res.json()) as {
    s?: string;
    t?: number[];
    c?: number[];
  };

  if (j.s !== "ok" || !j.t?.length || !j.c?.length) {
    return [];
  }

  const out: CloseHistoryPoint[] = [];
  for (let i = 0; i < j.t.length; i++) {
    const c = j.c[i];
    if (c == null || typeof c !== "number" || Number.isNaN(c)) continue;
    out.push({
      date: toUtcDateKey(new Date(j.t[i]! * 1000)),
      close: c,
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/**
 * Daily close prices for the given UTC date span (inclusive intent).
 * Tries Yahoo Finance first, then Finnhub candle if `FINNHUB_API_KEY` is set.
 */
export async function fetchCloseHistory(
  rawSymbol: string,
  period1: Date,
  period2: Date,
): Promise<CloseHistoryPoint[]> {
  const symbol = validateSymbol(rawSymbol);
  if (!symbol) {
    return [];
  }

  try {
    return await fetchYahooCloses(symbol, period1, period2);
  } catch (err) {
    console.error("[close-history] Yahoo chart failed; trying Finnhub if configured", err);
    const token = process.env.FINNHUB_API_KEY?.trim();
    if (!token) {
      return [];
    }
    try {
      return await fetchFinnhubCloses(symbol, token, period1, period2);
    } catch (e2) {
      console.error("[close-history] Finnhub candle failed", e2);
      return [];
    }
  }
}
