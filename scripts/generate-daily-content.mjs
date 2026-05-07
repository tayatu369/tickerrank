import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

/**
 * Daily automation: fetch quotes, generate AI ratings & short-form video scripts.
 * Run: node scripts/generate-daily-content.mjs
 * LLM calls go through OpenRouter (OpenAI-compatible API). Store your OpenRouter
 * secret in OPENAI_API_KEY (same env var name as before).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from 'path';
import OpenAI from "openai";
import YahooFinance from "yahoo-finance2";

const TICKERS = ["TSLA", "AAPL", "NVDA", "MSFT", "AMZN"];
const OUTPUT_DIR = join(__dirname, "output");
const OUTPUT_FILE = join(OUTPUT_DIR, "daily-content.json");
const CTA_TEXT = "Check your stock rating at tickerrank.com. NFA.";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "google/gemini-2.0-flash-001";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

function pickQuoteFields(quote) {
  if (!quote || typeof quote !== "object") return null;
  const keys = [
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
  ];
  const out = {};
  for (const k of keys) {
    if (quote[k] !== undefined) out[k] = quote[k];
  }
  return out;
}

async function callChatJson(client, { system, user }) {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.65,
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty model response");
  return JSON.parse(text);
}

async function generateRating(client, symbol, quoteSnapshot) {
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
  const required = ["rating", "label", "score", "reason1", "reason2"];
  for (const k of required) {
    if (data[k] === undefined || data[k] === null)
      throw new Error(`Missing key in rating JSON: ${k}`);
  }
  const labelOk = ["Bullish", "Bearish", "Neutral"].includes(data.label);
  if (!labelOk) throw new Error(`Invalid label: ${data.label}`);
  const score = Number(data.score);
  if (!Number.isFinite(score) || score < 0 || score > 100)
    throw new Error(`Invalid score: ${data.score}`);
  return {
    rating: String(data.rating),
    label: data.label,
    score: Math.round(score),
    reason1: String(data.reason1),
    reason2: String(data.reason2),
  };
}

async function generateVideoScript(client, symbol, quoteSnapshot, rating) {
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
  if (!data.hook_text_on_screen || !data.core_narration)
    throw new Error("Missing hook_text_on_screen or core_narration");
  return {
    hook_text_on_screen: String(data.hook_text_on_screen).trim(),
    core_narration: String(data.core_narration).trim(),
    cta: CTA_TEXT,
  };
}

async function main() {
  console.log("TickerRank daily content generator");
  console.log(`Tickers: ${TICKERS.join(", ")}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": "https://tickerrank.com",
      "X-Title": "TickerRank",
    },
  });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const items = [];
  const started = new Date().toISOString();

  for (const symbol of TICKERS) {
    console.log(`\n[${symbol}] Starting...`);
    let quoteRaw = null;
    try {
      console.log(`[${symbol}] Fetching Yahoo Finance quote...`);
      quoteRaw = await yahooFinance.quote(symbol);
      console.log(`[${symbol}] Quote OK.`);
    } catch (err) {
      console.error(`[${symbol}] Quote failed:`, err?.message ?? err);
      items.push({
        symbol,
        error: "quote_failed",
        message: String(err?.message ?? err),
      });
      continue;
    }

    const quote = pickQuoteFields(quoteRaw);

    let rating = null;
    try {
      console.log(`[${symbol}] Generating rating with ${MODEL}...`);
      rating = await generateRating(client, symbol, quote);
      console.log(
        `[${symbol}] Rating: ${rating.rating} (${rating.label}) score ${rating.score}`,
      );
    } catch (err) {
      console.error(`[${symbol}] Rating failed:`, err?.message ?? err);
      items.push({
        symbol,
        quote,
        error: "rating_failed",
        message: String(err?.message ?? err),
      });
      continue;
    }

    let videoScript = null;
    try {
      console.log(`[${symbol}] Generating video script...`);
      videoScript = await generateVideoScript(client, symbol, quote, rating);
      console.log(`[${symbol}] Video script OK.`);
    } catch (err) {
      console.error(`[${symbol}] Video script failed:`, err?.message ?? err);
      items.push({
        symbol,
        quote,
        rating,
        error: "video_script_failed",
        message: String(err?.message ?? err),
      });
      continue;
    }

    items.push({
      symbol,
      quote,
      rating,
      videoScript,
    });
    console.log(`[${symbol}] Done.`);
  }

  const payload = {
    generatedAt: started,
    finishedAt: new Date().toISOString(),
    model: MODEL,
    tickersRequested: TICKERS,
    items,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`\nWrote ${OUTPUT_FILE}`);
  console.log(
    `Completed ${items.filter((i) => i.rating && i.videoScript).length}/${TICKERS.length} full pipelines.`,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});
