import YahooFinance from "yahoo-finance2";
import OpenAI from "openai";
import { jsonParseLenient } from "@/lib/automation/json-lenient";

export const DAILY_CONTENT_KV_KEY = "daily-content:latest" as const;

export const TICKERS = ["TSLA", "AAPL", "NVDA", "MSFT", "AMZN"] as const;

export const CTA_TEXT =
  "Check your stock rating at tickerrank.com. NFA." as const;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

const QUOTE_FIELD_KEYS = [
  "symbol",
  "shortName",
  "longName",
  "currency",
  "exchangeName",
  "regularMarketPrice",
  "regularMarketPreviousClose",
  "regularMarketOpen",
  "regularMarketDayHigh",
  "regularMarketDayLow",
  "regularMarketVolume",
  "regularMarketChange",
  "regularMarketChangePercent",
  "marketState",
  "fiftyTwoWeekLow",
  "fiftyTwoWeekHigh",
  "trailingPE",
  "marketCap",
] as const;

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function pickQuoteFields(
  quote: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!quote || typeof quote !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const k of QUOTE_FIELD_KEYS) {
    if (quote[k] !== undefined) out[k] = quote[k];
  }
  return out;
}

type FinnhubQuoteJson = {
  c?: number;
  pc?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  t?: number;
  error?: string;
};

type FinnhubProfileJson = {
  name?: string;
  ticker?: string;
  currency?: string;
  exchange?: string;
};

type FinnhubMetricJson = {
  metric?: Record<string, unknown>;
  error?: string;
};

function buildQuoteFromFinnhub(
  symbol: string,
  q: FinnhubQuoteJson,
  profile: FinnhubProfileJson,
  metricRoot: FinnhubMetricJson,
): Record<string, unknown> {
  const m = metricRoot.metric ?? {};
  const price = num(q.c) ?? 0;
  const prevClose = num(q.pc) ?? 0;
  const change =
    num(q.d) ?? (price && prevClose ? price - prevClose : undefined);
  const pct = num(q.dp);
  const mc = num(m.marketCapitalization);
  const hi52 = num(m["52WeekHigh"]);
  const lo52 = num(m["52WeekLow"]);
  const pe = num(m.peTTM ?? m.peAnnual ?? m.peNormalizedAnnual);

  return {
    symbol,
    shortName: profile.name ?? symbol,
    longName: profile.name ?? symbol,
    currency: profile.currency ?? "USD",
    exchangeName: profile.exchange,
    regularMarketPrice: price || undefined,
    regularMarketPreviousClose: prevClose || undefined,
    regularMarketOpen: num(q.o),
    regularMarketDayHigh: num(q.h),
    regularMarketDayLow: num(q.l),
    regularMarketVolume: undefined,
    regularMarketChange: change,
    regularMarketChangePercent: pct,
    marketState: "REGULAR",
    fiftyTwoWeekLow: lo52,
    fiftyTwoWeekHigh: hi52,
    trailingPE: pe,
    marketCap: mc,
  };
}

export async function fetchQuoteWithFinnhubFallback(
  symbol: string,
  finnhubToken: string | undefined,
): Promise<{
  quote: Record<string, unknown>;
  source: "yahoo" | "finnhub";
}> {
  const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
  });

  try {
    const raw = await yahooFinance.quote(symbol);
    const q = pickQuoteFields(raw as Record<string, unknown>);
    if (q && Object.keys(q).length > 0) {
      return { quote: q, source: "yahoo" };
    }
  } catch {
    // fall through to Finnhub
  }

  const token = finnhubToken?.trim();
  if (!token) {
    throw new Error("Yahoo quote failed and FINNHUB_API_KEY is not set");
  }

  const enc = encodeURIComponent;

  const [quoteRes, profileRes, metricRes] = await Promise.all([
    fetch(
      `https://finnhub.io/api/v1/quote?symbol=${enc(symbol)}&token=${enc(token)}`,
    ),
    fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${enc(symbol)}&token=${enc(token)}`,
    ),
    fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${enc(symbol)}&metric=all&token=${enc(token)}`,
    ),
  ]);

  if (!quoteRes.ok || !profileRes.ok || !metricRes.ok) {
    throw new Error(
      `Finnhub HTTP error quote=${quoteRes.status} profile=${profileRes.status} metric=${metricRes.status}`,
    );
  }

  const quoteJson = (await quoteRes.json()) as FinnhubQuoteJson;
  const profileJson = (await profileRes.json()) as FinnhubProfileJson;
  const metricJson = (await metricRes.json()) as FinnhubMetricJson;

  if (quoteJson.error || metricJson.error) {
    throw new Error(String(quoteJson.error ?? metricJson.error));
  }

  const price = num(quoteJson.c) ?? 0;
  const prev = num(quoteJson.pc) ?? 0;
  if (price <= 0 && prev <= 0) {
    throw new Error("Finnhub: no price data for symbol");
  }

  const quote = buildQuoteFromFinnhub(symbol, quoteJson, profileJson, metricJson);
  return { quote, source: "finnhub" };
}

export function createOpenRouterClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": "https://tickerrank.com",
      "X-Title": "TickerRank",
    },
  });
}

async function callChatJson(
  client: OpenAI,
  { system, user }: { system: string; user: string },
) {
  const completion = await client.chat.completions.create({
    model: OPENROUTER_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.65,
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty model response");
  const parsed = jsonParseLenient(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model returned invalid JSON");
  }
  return parsed as Record<string, unknown>;
}

export async function generateRating(
  client: OpenAI,
  symbol: string,
  quoteSnapshot: Record<string, unknown>,
) {
  const system = `You are a financial education assistant for TickerRank. Given live quote data, produce a single-stock "rating" for retail viewers. This is not personalized advice.
Return ONLY a JSON object with these exact keys: "rating", "label", "score", "reason1", "reason2".
- rating: letter-style grade like A+, A, A-, B+, B, B-, C+, C, C-, D, F
- label: exactly one of "Bullish", "Bearish", "Neutral"
- score: integer from 0 to 100
- reason1, reason2: one concise sentence each (no numbering in text), grounded in the quote data when possible`;
  const user = `Ticker: ${symbol}
Quote snapshot (JSON):
${JSON.stringify(quoteSnapshot, null, 2)}`;
  const data = await callChatJson(client, { system, user });
  const required = ["rating", "label", "score", "reason1", "reason2"] as const;
  for (const k of required) {
    if (data[k] === undefined || data[k] === null) {
      throw new Error(`Missing key in rating JSON: ${k}`);
    }
  }
  const label = String(data.label);
  if (!["Bullish", "Bearish", "Neutral"].includes(label)) {
    throw new Error(`Invalid label: ${label}`);
  }
  const score = Number(data.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`Invalid score: ${String(data.score)}`);
  }
  return {
    rating: String(data.rating),
    label,
    score: Math.round(score),
    reason1: String(data.reason1),
    reason2: String(data.reason2),
  };
}

export async function generateVideoScript(
  client: OpenAI,
  symbol: string,
  quoteSnapshot: Record<string, unknown>,
  rating: Awaited<ReturnType<typeof generateRating>>,
) {
  const system = `You write punchy English scripts for TikTok / YouTube Shorts (vertical video, on-camera or voiceover).
Return ONLY a JSON object with keys: "hook_text_on_screen", "core_narration", "cta".

Structure (total target ~60 seconds spoken at a moderate pace):
- Hook (0–3s): surprising on-screen line about the stock's TickerRank-style rating.
- Core (3–25s): spoken narration covering the two key reasons (from reason1 and reason2) clearly.
- Takeaway (25–30s): one quick conclusion tying to the label.
- CTA (30–35s): must be exactly the provided cta string (copy verbatim).

Fields:
- hook_text_on_screen: short text meant to appear as on-screen text (no hashtags).
- core_narration: single string including core + takeaway (everything after hook until CTA), natural spoken English.
- cta: exactly the required phrase (no changes).`;
  const user = `Symbol: ${symbol}
Quote snapshot:
${JSON.stringify(quoteSnapshot, null, 2)}

Rating JSON:
${JSON.stringify(rating, null, 2)}

Required cta string (must be copied exactly into the "cta" field):
${CTA_TEXT}`;
  const data = await callChatJson(client, { system, user });
  if (!data.hook_text_on_screen || !data.core_narration) {
    throw new Error("Missing hook_text_on_screen or core_narration");
  }
  return {
    hook_text_on_screen: String(data.hook_text_on_screen).trim(),
    core_narration: String(data.core_narration).trim(),
    cta: CTA_TEXT,
  };
}

export type DailyContentItem =
  | {
      symbol: string;
      quote: Record<string, unknown>;
      quoteSource?: "yahoo" | "finnhub";
      rating: Awaited<ReturnType<typeof generateRating>>;
      videoScript: Awaited<ReturnType<typeof generateVideoScript>>;
    }
  | {
      symbol: string;
      quote?: Record<string, unknown>;
      rating?: Awaited<ReturnType<typeof generateRating>>;
      error: "quote_failed" | "rating_failed" | "video_script_failed";
      message: string;
    };

export type DailyContentPayload = {
  generatedAt: string;
  finishedAt: string;
  model: string;
  tickersRequested: readonly string[];
  items: DailyContentItem[];
};

export type PipelineError = {
  symbol: string;
  step: "quote" | "rating" | "video_script";
  message: string;
};

export async function runDailyContentPipeline(): Promise<{
  payload: DailyContentPayload;
  fullPipelineCount: number;
  errors: PipelineError[];
}> {
  const started = new Date().toISOString();
  const items: DailyContentItem[] = [];
  const errors: PipelineError[] = [];
  const finnhub = process.env.FINNHUB_API_KEY?.trim();

  const client = createOpenRouterClient();

  for (const symbol of TICKERS) {
    let quoteSnapshot: Record<string, unknown>;
    let quoteSource: "yahoo" | "finnhub";
    try {
      const { quote, source } = await fetchQuoteWithFinnhubFallback(
        symbol,
        finnhub,
      );
      quoteSnapshot = quote;
      quoteSource = source;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ symbol, step: "quote", message });
      items.push({ symbol, error: "quote_failed", message });
      continue;
    }

    let rating: Awaited<ReturnType<typeof generateRating>>;
    try {
      rating = await generateRating(client, symbol, quoteSnapshot);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ symbol, step: "rating", message });
      items.push({
        symbol,
        quote: quoteSnapshot,
        error: "rating_failed",
        message,
      });
      continue;
    }

    let videoScript: Awaited<ReturnType<typeof generateVideoScript>>;
    try {
      videoScript = await generateVideoScript(
        client,
        symbol,
        quoteSnapshot,
        rating,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ symbol, step: "video_script", message });
      items.push({
        symbol,
        quote: quoteSnapshot,
        rating,
        error: "video_script_failed",
        message,
      });
      continue;
    }

    items.push({
      symbol,
      quote: quoteSnapshot,
      quoteSource,
      rating,
      videoScript,
    });
  }

  const payload: DailyContentPayload = {
    generatedAt: started,
    finishedAt: new Date().toISOString(),
    model: OPENROUTER_MODEL,
    tickersRequested: TICKERS,
    items,
  };

  const fullPipelineCount = items.filter(
    (i) => "videoScript" in i && i.videoScript != null,
  ).length;

  return { payload, fullPipelineCount, errors };
}
