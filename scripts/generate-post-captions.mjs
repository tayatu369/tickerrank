/**
 * Build TikTok / YouTube Shorts / X captions from scripts/output/daily-content.json
 * (or a path passed as argv[1] / DAILY_CONTENT_JSON env).
 *
 * Run from repo root: node scripts/generate-post-captions.mjs [path/to/daily-content.json]
 *
 * Each caption includes https://tickerrank.com/rating?symbol=… with UTM fields
 * (utm_source / utm_medium / utm_campaign / utm_content) per channel.
 */

import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_INPUT = path.join(repoRoot, "scripts", "output", "daily-content.json");
const DEFAULT_OUTPUT = path.join(repoRoot, "scripts", "output", "post-captions.json");

const BASE_URL = "https://tickerrank.com/rating";

function trimEnv(name) {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

function extractCampaignDate(payload) {
  const raw = payload?.generatedAt;
  if (typeof raw === "string") {
    const d = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  const y = new Date().getUTCFullYear();
  const m = String(new Date().getUTCMonth() + 1).padStart(2, "0");
  const day = String(new Date().getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {string} symbol
 * @param {{ source: string; medium: string; campaign: string; content?: string }} utm
 */
function buildTrackedRatingUrl(symbol, utm) {
  const u = new URL(BASE_URL);
  u.searchParams.set("symbol", symbol.trim().toUpperCase());
  u.searchParams.set("utm_source", utm.source);
  u.searchParams.set("utm_medium", utm.medium);
  u.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) u.searchParams.set("utm_content", utm.content);
  return u.toString();
}

function labelEmoji(label) {
  const l = String(label ?? "").toLowerCase();
  if (l.includes("bull")) return "📈";
  if (l.includes("bear")) return "📉";
  return "⚖️";
}

function clampText(s, max) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/**
 * @param {string} symbol
 * @param {{ rating: string; label: string; score: number; reason1: string; reason2: string }} rating
 * @param {{ hook_text_on_screen: string; core_narration: string; cta: string }} videoScript
 * @param {string} campaign
 */
function buildCaptionsForSymbol(symbol, rating, videoScript, campaign) {
  const sym = symbol.trim().toUpperCase();
  const label = rating.label;
  const le = labelEmoji(label);
  const shortName = sym;

  const urlTiktok = buildTrackedRatingUrl(sym, {
    source: "tiktok",
    medium: "social_video",
    campaign,
    content: sym,
  });
  const urlYoutube = buildTrackedRatingUrl(sym, {
    source: "youtube",
    medium: "youtube_shorts",
    campaign,
    content: sym,
  });
  const urlX = buildTrackedRatingUrl(sym, {
    source: "x",
    medium: "social_post",
    campaign,
    content: sym,
  });

  const hook = clampText(videoScript.hook_text_on_screen, 220);

  /** TikTok: hook + emoji energy + teaser + tracked link */
  const tiktok = [
    `${le} WAIT — ${shortName}?`,
    ``,
    `✨ "${hook}"`,
    ``,
    `Grade: ${rating.rating} · ${rating.label} · Score ${rating.score}`,
    `Tap through for TickerRank’s machine read 👇👇👇`,
    ``,
    urlTiktok,
    ``,
    `#stocks #${sym.toLowerCase()} #stockmarket #finance #investing #fintok #tickerrank`,
  ].join("\n");

  /** YouTube Shorts description: structured + reasons */
  const youtubeShorts = [
    `${le} ${shortName} — TickerRank grade ${rating.rating} (${rating.label}, score ${rating.score}).`,
    ``,
    `Why we’re highlighting this ticker:`,
    `• ${rating.reason1}`,
    `• ${rating.reason2}`,
    ``,
    `🔗 Open your breakdown on TickerRank (tracked link):`,
    urlYoutube,
    ``,
    `—`,
    `${videoScript.cta}`,
  ].join("\n");

  const reasonTeaser =
    clampText(rating.reason1, 100) ||
    clampText(videoScript.core_narration ?? "", 100);

  /** X / Twitter-style: concise + NFA hint */
  const xBody = clampText(
    `${le} ${sym} → ${rating.rating} (${rating.label}). ${reasonTeaser}`,
    215,
  );
  const x = `${xBody}\n\n${urlX}`;

  return {
    symbol: sym,
    tiktok,
    youtubeShorts,
    x,
    urls: { tiktok: urlTiktok, youtubeShorts: urlYoutube, x: urlX },
  };
}

async function main() {
  const fromEnv = trimEnv("DAILY_CONTENT_JSON");
  const fromArg = process.argv[2]?.trim();
  const inputPath =
    path.isAbsolute(fromArg || "")
      ? fromArg
      : fromEnv
        ? path.isAbsolute(fromEnv)
          ? fromEnv
          : path.resolve(repoRoot, fromEnv)
        : path.resolve(repoRoot, fromArg || DEFAULT_INPUT);

  const jsonText = await readFile(inputPath, "utf8");
  let payload;
  try {
    let stripped = jsonText.trim();
    if (stripped.charCodeAt(0) === 0xfeff) stripped = stripped.slice(1).trim();
    payload = JSON.parse(stripped);
  } catch {
    console.error(`Invalid JSON: ${inputPath}`);
    process.exitCode = 1;
    return;
  }

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
    console.error(
      `Unexpected daily-content shape (expected object with items[]): ${inputPath}`,
    );
    process.exitCode = 1;
    return;
  }

  const campaign = `tr_daily_social_${extractCampaignDate(payload)}`;
  const captions = [];
  let skipped = 0;

  for (const item of payload.items) {
    if (!item?.symbol || typeof item.symbol !== "string") continue;
    if (item.error != null || !item.rating || !item.videoScript) {
      console.warn(`[SKIP] ${item.symbol}: missing rating/videoScript (${item.error ?? "partial"})`);
      skipped += 1;
      continue;
    }

    const { rating, videoScript } = item;
    const need = ["rating", "label", "score", "reason1", "reason2"];
    const missingRating = need.filter(
      (k) => rating[k] === undefined || rating[k] === null,
    );
    if (missingRating.length > 0) {
      console.warn(
        `[SKIP] ${item.symbol}: rating missing: ${missingRating.join(", ")}`,
      );
      skipped += 1;
      continue;
    }
    if (
      !videoScript.hook_text_on_screen ||
      videoScript.core_narration == null
    ) {
      console.warn(`[SKIP] ${item.symbol}: videoScript incomplete`);
      skipped += 1;
      continue;
    }

    captions.push(
      buildCaptionsForSymbol(item.symbol, rating, videoScript, campaign),
    );
  }

  const out = {
    sourceFile: inputPath,
    utmCampaign: campaign,
    generatedFromPayloadAt: payload.generatedAt ?? null,
    count: captions.length,
    skipped,
    captions,
  };

  await mkdir(path.dirname(DEFAULT_OUTPUT), { recursive: true });
  const outPath =
    trimEnv("POST_CAPTIONS_OUTPUT") || DEFAULT_OUTPUT;
  await writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${captions.length} symbol block(s) to ${outPath}` +
      (skipped ? ` (${skipped} skipped)` : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
