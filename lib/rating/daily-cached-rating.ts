import { kvGetSafe, kvSetSafe, warnKvUnavailableOnce } from "@/lib/kv-safe";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import YahooFinance from 'yahoo-finance2';
import type { Quote } from "yahoo-finance2/modules/quote";
import type { QuoteSummaryResult } from "yahoo-finance2/modules/quoteSummary-iface";

export const SYMBOL_NOT_FOUND =
  "Symbol not found. Please enter a valid US stock ticker.";

/**
 * Symbols pre-warmed by cron (`/api/cron/prewarm`) and kept in sync with
 * `scripts/render-daily-videos.mjs` / `scripts/generate-voiceover.mjs`.
 *
 * Update this list weekly based on market volatility for better video engagement.
 */
export const DAILY_PREWARM_SYMBOLS = [
  "TSLA",
  "PLTR",
  "MARA",
  "AAPL",
  "GME",
] as const;

const YAHOO_QUOTE_UNRECOGNIZED = "YAHOO_QUOTE_UNRECOGNIZED";

export class SymbolNotFoundError extends Error {
  constructor(message = SYMBOL_NOT_FOUND) {
    super(message);
    this.name = "SymbolNotFoundError";
  }
}

const OPENAI_TIMEOUT_MS = 25_000;
const OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

type FinancialMetricsPayload = {
  currentPrice: number;
  marketCap: number;
  peRatio: number;
  eps: number;
  revenueGrowth: number;
  profitMargins: number;
  debtToEquity: number;
  returnOnEquity: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  movingAverage50Day: number;
  movingAverage200Day: number;
  forwardPE: number;
  grossMargins: number;
  operatingMargins: number;
  analystRecommendationMean: number;
  freeCashflow: number;
  totalRevenue: number;
};

type CategoryMetrics = {
  Growth: number;
  FinancialHealth: number;
  Momentum: number;
  Value: number;
  Sentiment: number;
};

type GptRatingOutput = {
  rating: string;
  score: number;
  conclusion: string;
  reasons: string[];
  metrics: CategoryMetrics;
};

const FALLBACK_GPT_RATING: Omit<GptRatingOutput, "metrics"> & {
  metrics: CategoryMetrics;
} = {
  rating: "C+",
  score: 50,
  conclusion: "Neutral",
  reasons: [
    "Rating service returned an incomplete response; neutral placeholder applied.",
  ],
  metrics: {
    Growth: 50,
    FinancialHealth: 50,
    Momentum: 50,
    Value: 50,
    Sentiment: 50,
  },
};

export function logRatingApiError(context: string, err: unknown): void {
  console.error(`[rating API] ${context}`, err);
  if (err instanceof Error) {
    console.error(`[rating API] ${context} stack:`, err.stack);
  }
}

export function validateSymbol(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return null;
  const symbol = raw.trim().toUpperCase();
  if (!/^[A-Z]{1,10}$/.test(symbol)) return null;
  return symbol;
}

export function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function yahooQuoteIndicatesRecognizedSymbol(
  requestedUpper: string,
  quote: Quote,
): boolean {
  const sym = String((quote as { symbol?: string }).symbol ?? "").toUpperCase();
  if (sym && sym !== requestedUpper) return false;

  const qt = String(quote.quoteType ?? "").toUpperCase();
  if (qt === "NONE") return false;

  const marketCap = num(quote.marketCap);
  const bestPrice = Math.max(
    num(quote.regularMarketPrice),
    num(quote.regularMarketPreviousClose),
    num(quote.postMarketPrice),
    num((quote as { preMarketPrice?: number }).preMarketPrice),
    num((quote as { bid?: number }).bid),
    num((quote as { ask?: number }).ask),
  );
  return marketCap > 0 || bestPrice > 0;
}

function requireOpenRouterCompatibleApiKey(): string {
  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  const openai = process.env.OPENAI_API_KEY?.trim();
  const v = openrouter || openai;
  if (!v) {
    throw new Error(
      "OPENROUTER_API_KEY or OPENAI_API_KEY is missing or empty",
    );
  }
  return v;
}

function requireFinnhubApiKey(): string {
  const v = process.env.FINNHUB_API_KEY?.trim();
  if (!v) {
    throw new Error("FINNHUB_API_KEY is missing or empty");
  }
  return v;
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function clamp01to100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function pickMetric(metric: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(metric, k)) continue;
    const v = metric[k];
    if (v == null) continue;
    return num(v);
  }
  return 0;
}

function revenueGrowthFromIncomeHistory(
  history: QuoteSummaryResult["incomeStatementHistory"],
): number {
  const rows = history?.incomeStatementHistory;
  if (!rows || rows.length < 2) return 0;
  const latest = rows[0]!.totalRevenue;
  const prev = rows[1]!.totalRevenue;
  if (prev == null || prev === 0) return 0;
  return (latest - prev) / Math.abs(prev);
}

function debtToEquityFromBalanceSheet(
  balanceSheet: QuoteSummaryResult["balanceSheetHistory"],
  fallback: number,
): number {
  if (fallback !== 0) return fallback;
  const row = balanceSheet?.balanceSheetStatements?.[0] as
    | { totalLiab?: number; totalStockholderEquity?: number }
    | undefined;
  if (!row) return 0;
  const liab = num(row.totalLiab);
  const eq = Math.abs(num(row.totalStockholderEquity));
  if (!eq) return 0;
  return liab / eq;
}

function buildMetricsFromYahoo(data: {
  quote: Quote;
  keyStatistics: QuoteSummaryResult;
  financialData: QuoteSummaryResult;
  incomeStatement: QuoteSummaryResult;
  balanceSheet: QuoteSummaryResult;
}): FinancialMetricsPayload {
  const quote = data.quote;
  const ks = data.keyStatistics.defaultKeyStatistics;
  const fd = data.financialData.financialData;

  let revenueGrowth = num(fd?.revenueGrowth);
  if (revenueGrowth === 0) {
    revenueGrowth = revenueGrowthFromIncomeHistory(data.incomeStatement.incomeStatementHistory);
  }

  const debtToEquity = debtToEquityFromBalanceSheet(
    data.balanceSheet.balanceSheetHistory,
    num(fd?.debtToEquity),
  );

  return {
    currentPrice: num(fd?.currentPrice ?? quote.regularMarketPrice),
    marketCap: num(quote.marketCap),
    peRatio: num(quote.trailingPE ?? ks?.forwardPE),
    eps: num(ks?.trailingEps ?? quote.epsTrailingTwelveMonths),
    revenueGrowth,
    profitMargins: num(fd?.profitMargins ?? ks?.profitMargins),
    debtToEquity,
    returnOnEquity: num(fd?.returnOnEquity),
    beta: num(quote.beta ?? ks?.beta),
    fiftyTwoWeekHigh: num(quote.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(quote.fiftyTwoWeekLow),
    movingAverage50Day: num(quote.fiftyDayAverage),
    movingAverage200Day: num(quote.twoHundredDayAverage),
    forwardPE: num(ks?.forwardPE),
    grossMargins: num(fd?.grossMargins),
    operatingMargins: num(fd?.operatingMargins),
    analystRecommendationMean: num(fd?.recommendationMean),
    freeCashflow: num(fd?.freeCashflow),
    totalRevenue: num(fd?.totalRevenue),
  };
}

type FinnhubQuoteJson = {
  c?: number;
  pc?: number;
  error?: string;
};

type FinnhubMetricJson = {
  metric?: Record<string, unknown>;
  error?: string;
};

function buildMetricsFromFinnhub(
  quote: FinnhubQuoteJson,
  metricRoot: FinnhubMetricJson,
): FinancialMetricsPayload {
  const m = metricRoot.metric ?? {};
  const price = num(quote.c);

  return {
    currentPrice: price,
    marketCap: pickMetric(m, [
      "marketCapitalization",
      "marketCap",
      "marketcapitalization",
    ]),
    peRatio: pickMetric(m, [
      "peNormalizedAnnual",
      "peBasicExclExtraTTM",
      "peTTM",
      "peAnnual",
    ]),
    eps: pickMetric(m, [
      "epsNormalizedAnnual",
      "epsBasicExclExtraItemsTTM",
      "epsAnnual",
      "epsTTM",
    ]),
    revenueGrowth: pickMetric(m, [
      "revenueGrowthAnnualYoy",
      "revenueGrowthTTMYoy",
      "salesGrowthAnnual",
    ]),
    profitMargins: pickMetric(m, [
      "netProfitMarginAnnual",
      "netMarginTTM",
      "pretaxMarginAnnual",
    ]),
    debtToEquity: pickMetric(m, [
      "bookValueDebtToEquityAnnual",
      "totalDebt/totalEquityAnnual",
      "debtEquityAnnual",
    ]),
    returnOnEquity: pickMetric(m, ["roeTTM", "roeAnnual", "roaTTM"]),
    beta: pickMetric(m, ["beta"]),
    fiftyTwoWeekHigh: pickMetric(m, ["52WeekHigh"]),
    fiftyTwoWeekLow: pickMetric(m, ["52WeekLow"]),
    movingAverage50Day: pickMetric(m, ["50DayMA", "50DayMovingAverage", "day50MovingAverage"]),
    movingAverage200Day: pickMetric(m, [
      "200DayMA",
      "200DayMovingAverage",
      "day200MovingAverage",
    ]),
    forwardPE: pickMetric(m, ["forwardPE", "forwardPEAnnual"]),
    grossMargins: pickMetric(m, ["grossMarginAnnual", "grossMarginTTM"]),
    operatingMargins: pickMetric(m, ["operatingMarginAnnual", "operatingMarginTTM"]),
    analystRecommendationMean: 0,
    freeCashflow: pickMetric(m, ["freeCashflowAnnual", "fcfMarginAnnual"]),
    totalRevenue: pickMetric(m, ["revenueAnnual", "revenueTTM"]),
  };
}

async function fetchYahooBundle(symbol: string) {
  const yahooFinance = new YahooFinance();
  try {
    const [quote, keyStatistics, financialData, incomeStatement, balanceSheet] =
      await Promise.all([
        yahooFinance.quote(symbol),
        yahooFinance.quoteSummary(symbol, { modules: ["defaultKeyStatistics"] }),
        yahooFinance.quoteSummary(symbol, { modules: ["financialData"] }),
        yahooFinance.quoteSummary(symbol, { modules: ["incomeStatementHistory"] }),
        yahooFinance.quoteSummary(symbol, { modules: ["balanceSheetHistory"] }),
      ]);
    return { quote, keyStatistics, financialData, incomeStatement, balanceSheet };
  } catch (err) {
    logRatingApiError(`yahoo-finance2 bundle failed for symbol=${symbol}`, err);
    throw err;
  }
}

async function fetchFinnhubBundle(
  symbol: string,
  finnhubToken: string,
): Promise<{
  companyName: string;
  metrics: FinancialMetricsPayload;
}> {
  const enc = encodeURIComponent;
  const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${enc(symbol)}&token=${enc(finnhubToken)}`;
  const metricUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${enc(symbol)}&metric=all&token=${enc(finnhubToken)}`;

  try {
    const [quoteRes, metricRes] = await Promise.all([fetch(quoteUrl), fetch(metricUrl)]);

    if (!quoteRes.ok || !metricRes.ok) {
      const detail = `quote status=${quoteRes.status} metric status=${metricRes.status}`;
      console.error(`[rating API] Finnhub HTTP error: ${detail}`);
      throw new Error(`Finnhub HTTP error: ${detail}`);
    }

    const [quoteJson, metricJson] = (await Promise.all([
      quoteRes.json(),
      metricRes.json(),
    ])) as [FinnhubQuoteJson, FinnhubMetricJson];

    if (quoteJson.error || metricJson.error) {
      const msg = String(quoteJson.error ?? metricJson.error);
      console.error(`[rating API] Finnhub API error field: ${msg}`);
      throw new Error(msg);
    }

    if (num(quoteJson.c) <= 0 && num(quoteJson.pc) <= 0) {
      throw new SymbolNotFoundError();
    }

    return {
      companyName: symbol,
      metrics: buildMetricsFromFinnhub(quoteJson, metricJson),
    };
  } catch (err) {
    logRatingApiError(`Finnhub fetch failed for symbol=${symbol}`, err);
    throw err;
  }
}

function yahooCompanyName(quote: Quote, symbol: string): string {
  const q = quote as { longName?: string; name?: string };
  return q.longName ?? q.name ?? symbol;
}

function metricsToUserPrompt(m: FinancialMetricsPayload): string {
  return [
    `Stock fundamentals (numeric; ratios may be fractions or percentages as reported by the data vendor):`,
    `- Current price: ${m.currentPrice}`,
    `- Market cap: ${m.marketCap}`,
    `- P/E (trailing / blended): ${m.peRatio}`,
    `- Forward P/E: ${m.forwardPE}`,
    `- EPS: ${m.eps}`,
    `- Revenue growth (YoY, as provided): ${m.revenueGrowth}`,
    `- Profit margins: ${m.profitMargins}`,
    `- Gross margins: ${m.grossMargins}`,
    `- Operating margins: ${m.operatingMargins}`,
    `- Debt to equity: ${m.debtToEquity}`,
    `- Return on equity: ${m.returnOnEquity}`,
    `- Beta: ${m.beta}`,
    `- 52-week high / low: ${m.fiftyTwoWeekHigh} / ${m.fiftyTwoWeekLow}`,
    `- 50-day / 200-day moving average: ${m.movingAverage50Day} / ${m.movingAverage200Day}`,
    `- Analyst recommendation mean (1–5, lower is stronger buy when from Yahoo): ${m.analystRecommendationMean}`,
    `- Free cash flow: ${m.freeCashflow}`,
    `- Total revenue: ${m.totalRevenue}`,
  ].join("\n");
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return fence?.[1] ?? t;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text.trim();
  return text.slice(start, end + 1).trim();
}

function jsonParseLenient(raw: string): unknown | null {
  const unfenced = stripJsonFence(raw).trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    try {
      return JSON.parse(extractJsonObject(unfenced));
    } catch {
      return null;
    }
  }
}

function coerceRatingPayload(parsed: unknown): GptRatingOutput | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const metricsRaw = o.metrics;
  if (!metricsRaw || typeof metricsRaw !== "object") return null;
  const mm = metricsRaw as Record<string, unknown>;

  const rating = String(o.rating ?? "").trim();
  if (!rating) return null;

  const reasons = Array.isArray(o.reasons)
    ? o.reasons.map((r) => String(r)).filter((s) => s.length > 0)
    : [];

  return {
    rating,
    score: num(o.score),
    conclusion: String(o.conclusion ?? "Neutral"),
    reasons,
    metrics: {
      Growth: num(mm.Growth ?? mm.growth),
      FinancialHealth: num(
        mm.FinancialHealth ?? mm.financialHealth ?? mm.financial_health,
      ),
      Momentum: num(mm.Momentum ?? mm.momentum),
      Value: num(mm.Value ?? mm.value),
      Sentiment: num(mm.Sentiment ?? mm.sentiment),
    },
  };
}

function tryParseRatingContent(rawContent: string): GptRatingOutput | null {
  const parsed = jsonParseLenient(rawContent);
  if (parsed === null) return null;
  return coerceRatingPayload(parsed);
}

function normalizeGptOutput(raw: GptRatingOutput): GptRatingOutput {
  const reasons = (raw.reasons ?? [])
    .slice(0, 5)
    .map((r) => (typeof r === "string" ? r.slice(0, 120) : ""))
    .filter(Boolean);

  const m = raw.metrics ?? ({} as CategoryMetrics);
  return {
    rating: String(raw.rating ?? "C"),
    score: clamp01to100(num(raw.score)),
    conclusion: String(raw.conclusion ?? "Neutral"),
    reasons,
    metrics: {
      Growth: clamp01to100(num(m.Growth)),
      FinancialHealth: clamp01to100(num(m.FinancialHealth)),
      Momentum: clamp01to100(num(m.Momentum)),
      Value: clamp01to100(num(m.Value)),
      Sentiment: clamp01to100(num(m.Sentiment)),
    },
  };
}

const RATING_JSON_SYSTEM_PROMPT = `You are a stock analyst. The user message contains numeric financial metrics for one stock.

You MUST respond with ONLY a single JSON object. Do not wrap it in markdown code fences. Do not add any text before or after the JSON.

The JSON must use exactly these keys (spellings and nesting must match):

{
  "rating": string,
  "score": number,
  "conclusion": string,
  "reasons": string[],
  "metrics": {
    "Growth": number,
    "FinancialHealth": number,
    "Momentum": number,
    "Value": number,
    "Sentiment": number
  }
}

Field rules:
- rating: letter grade from A+ through F.
- score: number from 0 to 100 (composite score).
- conclusion: exactly one of: Bullish, Neutral, Bearish.
- reasons: at most 5 strings; each string at most 120 characters; short, specific points tied to the metrics.
- metrics: each value is a number from 0 to 100 for Growth, FinancialHealth, Momentum, Value, Sentiment (these exact camelCase keys).`;

const RATING_JSON_RETRY_USER = `Your previous reply could not be parsed as the required JSON. Reply again with ONLY one JSON object (no markdown, no commentary). It must include exactly these keys: "rating", "score", "conclusion", "reasons", "metrics", where "metrics" has exactly "Growth", "FinancialHealth", "Momentum", "Value", "Sentiment".`;

async function runRatingModel(
  openai: OpenAI,
  metrics: FinancialMetricsPayload,
): Promise<Omit<GptRatingOutput, "metrics"> & { metrics: CategoryMetrics }> {
  let rawContent: string | null = null;

  try {
    const baseMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: RATING_JSON_SYSTEM_PROMPT },
      { role: "user", content: metricsToUserPrompt(metrics) },
    ];

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 0) {
        console.log(`[OpenRouter] using model ${OPENROUTER_MODEL}`);
      } else {
        console.log(
          `[OpenRouter] retry (${attempt + 1}/2) after JSON parse failure, model ${OPENROUTER_MODEL}`,
        );
      }

      const messages: ChatCompletionMessageParam[] =
        attempt === 0
          ? baseMessages
          : [
              ...baseMessages,
              { role: "assistant", content: rawContent ?? "" },
              { role: "user", content: RATING_JSON_RETRY_USER },
            ];

      const completion = await openai.chat.completions.create(
        {
          model: OPENROUTER_MODEL,
          messages,
          response_format: { type: "json_object" },
          temperature: 0,
          seed: 42,
        },
        { timeout: OPENAI_TIMEOUT_MS },
      );

      rawContent = completion.choices[0]?.message?.content ?? null;
      if (!rawContent) {
        console.error("[rating API] OpenRouter empty message content:", completion);
        if (attempt === 0) continue;
        return FALLBACK_GPT_RATING;
      }

      const coerced = tryParseRatingContent(rawContent);
      if (coerced) {
        return normalizeGptOutput(coerced);
      }

      console.error(
        `[rating API] OpenRouter JSON parse/coerce failed (attempt ${attempt + 1}/2). Raw:`,
        rawContent,
      );
      if (attempt === 0) continue;
      return FALLBACK_GPT_RATING;
    }

    return FALLBACK_GPT_RATING;
  } catch (err) {
    console.error(
      "[rating API] OpenRouter chat.completions failed. Last raw content:",
      rawContent,
    );
    logRatingApiError("OpenRouter chat.completions.create", err);
    return FALLBACK_GPT_RATING;
  }
}

export type DailyCachedRatingResult =
  | { ok: true; responseBody: Record<string, unknown> }
  | {
      ok: false;
      status: number;
      responseBody: Record<string, unknown>;
    };

/**
 * Reads today's `rating:{SYMBOL}:{YYYY-MM-DD}` cache or generates via Yahoo → Finnhub → OpenRouter.
 * @param options.kvExSeconds TTL for newly written KV entries (default 86400).
 */
export async function getOrGenerateDailyCachedRating(
  symbol: string,
  options?: { kvExSeconds?: number },
): Promise<DailyCachedRatingResult> {
  const normalized = validateSymbol(symbol);
  if (!normalized) {
    return {
      ok: false,
      status: 400,
      responseBody: { error: "Invalid symbol" },
    };
  }

  const utcToday = new Date();
  const cacheDate = utcDateKey(utcToday);
  const cacheKey = `rating:${normalized}:${cacheDate}`;

  let cached: Record<string, unknown> | null = null;
  try {
    cached = await kvGetSafe<Record<string, unknown>>(cacheKey);
  } catch {
    warnKvUnavailableOnce();
    cached = null;
  }
  if (cached) {
    return {
      ok: true,
      responseBody: { ...cached, cached: true },
    };
  }

  let openaiApiKey: string;
  let finnhubApiKey: string;
  try {
    openaiApiKey = requireOpenRouterCompatibleApiKey();
    finnhubApiKey = requireFinnhubApiKey();
  } catch (err) {
    logRatingApiError("getOrGenerateDailyCachedRating env", err);
    return {
      ok: false,
      status: 500,
      responseBody: { error: "Failed to generate rating" },
    };
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_APP_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "TickerRank",
    },
    timeout: OPENAI_TIMEOUT_MS,
  });

  let companyName: string;
  let metrics: FinancialMetricsPayload;

  try {
    try {
      const yahooData = await fetchYahooBundle(normalized);
      if (!yahooQuoteIndicatesRecognizedSymbol(normalized, yahooData.quote)) {
        throw new Error(YAHOO_QUOTE_UNRECOGNIZED);
      }
      companyName = yahooCompanyName(yahooData.quote, normalized);
      metrics = buildMetricsFromYahoo(yahooData);
    } catch (yahooErr) {
      const silentUnrecognized =
        yahooErr instanceof Error &&
        yahooErr.message === YAHOO_QUOTE_UNRECOGNIZED;
      if (!silentUnrecognized) {
        logRatingApiError(
          `Yahoo Finance failed for ${normalized}; switching data source to Finnhub`,
          yahooErr,
        );
        console.error(
          `[rating API] Fallback: using Finnhub for symbol=${normalized} (Yahoo error above)`,
        );
      }
      try {
        const finnhub = await fetchFinnhubBundle(normalized, finnhubApiKey);
        companyName = finnhub.companyName;
        metrics = finnhub.metrics;
        console.log(
          `[rating API] Finnhub fallback succeeded for symbol=${normalized}`,
        );
      } catch (finnhubErr) {
        if (finnhubErr instanceof SymbolNotFoundError) {
          return {
            ok: false,
            status: 400,
            responseBody: { error: SYMBOL_NOT_FOUND },
          };
        }
        logRatingApiError(
          `Finnhub fallback also failed for ${normalized} after Yahoo failure`,
          finnhubErr,
        );
        return {
          ok: false,
          status: 500,
          responseBody: { error: "Failed to generate rating" },
        };
      }
    }

    const { rating, score, conclusion, reasons, metrics: categoryMetrics } =
      await runRatingModel(openai, metrics);

    const now = new Date();

    const ratingData = {
      symbol: normalized,
      companyName,
      rating,
      score,
      conclusion,
      reasons,
      metrics: categoryMetrics,
      trustInfo: {
        indicatorsCount: 12,
        modelVersion: "v1.0",
        dataUpdatedAt: now.toISOString(),
        ratingValidUntil: new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    };

    const kvExSeconds = options?.kvExSeconds ?? 86400;
    const kvStored = await kvSetSafe(cacheKey, ratingData, { ex: kvExSeconds });
    if (kvStored) {
      console.log(
        `[rating API] KV set succeeded key=${cacheKey} exSeconds=${kvExSeconds}`,
      );
    } else {
      console.error(
        `[rating API] KV set failed key=${cacheKey} exSeconds=${kvExSeconds}`,
      );
    }

    return { ok: true, responseBody: ratingData };
  } catch (err) {
    logRatingApiError(`getOrGenerateDailyCachedRating(${normalized})`, err);
    if (err instanceof SymbolNotFoundError) {
      return {
        ok: false,
        status: 400,
        responseBody: { error: SYMBOL_NOT_FOUND },
      };
    }
    return {
      ok: false,
      status: 500,
      responseBody: { error: "Failed to generate rating" },
    };
  }
}
