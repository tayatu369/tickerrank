import OpenAI from "openai";

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

export type PortfolioHoldingInput = {
  symbol: string;
  companyName: string;
  rating: string;
  score: number;
  conclusion: string;
  reasons: string[];
  metrics: {
    Growth: number;
    FinancialHealth: number;
    Momentum: number;
    Value: number;
    Sentiment: number;
  };
};

export type PortfolioAnalysisResult = {
  strengths: string[];
  weaknesses: string[];
  riskLevel: "Low" | "Medium" | "High";
  riskExplanation: string;
};

const OPENROUTER_MODEL = "openai/gpt-4o-mini";

const SYSTEM_PROMPT = `You are a concise portfolio analyst. Given structured per-stock AI rating data for a user's basket, produce a short portfolio-level view.

Respond with ONLY one JSON object (no markdown) with exactly these keys:
- "strengths": string array, 2–3 items, each one short clause (e.g. "TSLA shows strong Momentum vs. peers")
- "weaknesses": string array, 2–3 items, each one short clause (e.g. "Heavy concentration in technology names")
- "riskLevel": exactly one of "Low", "Medium", "High" (portfolio-wide, not per stock)
- "riskExplanation": one or two sentences justifying the risk level

Base conclusions only on the provided numbers and text. This is educational, not personalized investment advice.`;

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

function coerceAnalysis(parsed: unknown): PortfolioAnalysisResult | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const strengthsRaw = o.strengths;
  const weaknessesRaw = o.weaknesses;
  const riskLevelRaw = o.riskLevel;
  const riskExplanation =
    typeof o.riskExplanation === "string" ? o.riskExplanation.trim() : "";

  const strings = (x: unknown, max: number): string[] => {
    if (!Array.isArray(x)) return [];
    return x
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean)
      .slice(0, max);
  };

  const strengths = strings(strengthsRaw, 3);
  const weaknesses = strings(weaknessesRaw, 3);
  const rl =
    typeof riskLevelRaw === "string" ? riskLevelRaw.trim() : "";
  const riskLevel =
    rl === "Low" || rl === "Medium" || rl === "High" ? rl : null;

  if (
    strengths.length < 1 ||
    weaknesses.length < 1 ||
    !riskLevel ||
    !riskExplanation
  ) {
    return null;
  }

  return {
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    riskLevel,
    riskExplanation,
  };
}

export async function generatePortfolioAnalysis(
  holdings: PortfolioHoldingInput[],
): Promise<PortfolioAnalysisResult> {
  const apiKey = requireOpenRouterCompatibleApiKey();
  const openai = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_APP_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "TickerRank",
    },
    timeout: 45_000,
  });

  const userContent = `Portfolio holdings (equal-weighted basket; scores 0–100):\n${JSON.stringify(
    holdings.map((h) => ({
      symbol: h.symbol,
      companyName: h.companyName,
      rating: h.rating,
      score: h.score,
      conclusion: h.conclusion,
      reasons: h.reasons.slice(0, 5),
      metrics: h.metrics,
    })),
    null,
    2,
  )}`;

  const completion = await openai.chat.completions.create(
    {
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 900,
    },
    { timeout: 45_000 },
  );

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    try {
      parsed = JSON.parse(extractJsonObject(stripJsonFence(raw)));
    } catch {
      throw new Error("AI response was not valid JSON");
    }
  }

  const coerced = coerceAnalysis(parsed);
  if (!coerced) {
    throw new Error("AI response did not match expected portfolio schema");
  }

  return coerced;
}
