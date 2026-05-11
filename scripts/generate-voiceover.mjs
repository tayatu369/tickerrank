/**
 * Generate local MP3 voiceovers from ratings cached in Vercel KV or TCP Redis.
 * Run from repo root: node scripts/generate-voiceover.mjs
 *
 * Loads .env.local first via dynamic imports, then resolves REST KV vs REDIS_URL (TCP).
 */

/** Update this list weekly based on market volatility for better video engagement. */
const POPULAR_SYMBOLS = ["TSLA", "PLTR", "MARA", "AAPL", "GME"];

const MODEL_ID = "eleven_multilingual_v2";
const VOICES_BY_NAME = Object.freeze({
  Adam: "pNInz6obpgDQGcFmaJgB",
  Rachel: "21m00Tcm4TlvDq8ikWAM",
});
const MP3_OUTPUT_FORMAT = "mp3_44100_64";
const BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";

function trimEnv(name) {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

/** Same rules as lib/kv-safe.ts `resolveRestUrlToken`. */
function resolveRestUrlToken() {
  const kvUrl = trimEnv("KV_REST_API_URL");
  const kvToken = trimEnv("KV_REST_API_TOKEN");
  if (kvUrl && kvToken) return { url: kvUrl, token: kvToken };

  const upUrl = trimEnv("UPSTASH_REDIS_REST_URL");
  const upToken = trimEnv("UPSTASH_REDIS_REST_TOKEN");
  if (upUrl && upToken) return { url: upUrl, token: upToken };

  const redisUrl = trimEnv("REDIS_URL");
  if (redisUrl.startsWith("https://")) {
    const token =
      trimEnv("KV_REST_API_TOKEN") ||
      trimEnv("UPSTASH_REDIS_REST_TOKEN") ||
      trimEnv("REDIS_TOKEN");
    if (token) return { url: redisUrl, token };
  }

  return null;
}

/** REST when URL+token exist; TCP when REDIS_URL is redis(s):// (Enterprise / traditional). */
function resolveKvBackendConfig() {
  const rest = resolveRestUrlToken();
  if (rest) return { kind: "rest", ...rest };

  const redisUrl = trimEnv("REDIS_URL");
  if (/^rediss?:\/\//i.test(redisUrl)) {
    return { kind: "tcp", redisUrl };
  }

  return null;
}

/** Lazy TCP client + JSON deserialize, matching lib/kv-safe.ts `createTcpKvBackend`. */
function createTcpRatingStore(redisUrl) {
  let client = null;

  async function ensure() {
    if (client?.isOpen) return client;
    const { createClient } = await import("redis");
    const c = createClient({ url: redisUrl });
    await c.connect();
    client = c;
    return c;
  }

  function deserialize(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return {
    async get(key) {
      const c = await ensure();
      const raw = await c.get(key);
      if (raw == null) return null;
      return deserialize(raw);
    },
  };
}

async function createRatingStore() {
  const cfg = resolveKvBackendConfig();
  if (!cfg) return null;

  if (cfg.kind === "rest") {
    const { createClient } = await import("@vercel/kv");
    const kv = createClient({ url: cfg.url, token: cfg.token });
    return { get: (key) => kv.get(key) };
  }

  const tcp = createTcpRatingStore(cfg.redisUrl);
  return { get: (key) => tcp.get(key) };
}

function utcDateKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolveVoiceId() {
  const fromEnvId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (fromEnvId) return fromEnvId;
  const name = (process.env.ELEVENLABS_VOICE ?? "Adam").trim();
  const key = Object.keys(VOICES_BY_NAME).find(
    (n) => n.toLowerCase() === name.toLowerCase(),
  );
  if (!key) return VOICES_BY_NAME.Adam;
  return VOICES_BY_NAME[key];
}

/**
 * KV payload uses `conclusion` + `reasons[]`; also accept `label`, `reason1`, `reason2`.
 */
function buildCoreNarration(symbol, cached) {
  if (!cached || typeof cached !== "object") return null;
  const rating = cached.rating != null ? String(cached.rating).trim() : "";
  if (!rating) return null;

  const labelRaw =
    cached.label != null
      ? String(cached.label).trim()
      : cached.conclusion != null
        ? String(cached.conclusion).trim()
        : "";
  const reasons = Array.isArray(cached.reasons) ? cached.reasons : [];
  const reason1 =
    cached.reason1 != null
      ? String(cached.reason1).trim()
      : reasons[0] != null
        ? String(reasons[0]).trim()
        : "";
  const reason2 =
    cached.reason2 != null
      ? String(cached.reason2).trim()
      : reasons[1] != null
        ? String(reasons[1]).trim()
        : "";

  const label = labelRaw || "unspecified";
  return `${symbol} is rated ${rating}, labeled ${label}. Key reasons: ${reason1}. ${reason2}`;
}

async function textToSpeechMp3(apiKey, voiceId, text) {
  const url = new URL(`${BASE_URL}/${encodeURIComponent(voiceId)}`);
  url.searchParams.set("output_format", MP3_OUTPUT_FORMAT);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    const ct = res.headers.get("content-type") ?? "";
    try {
      if (ct.includes("application/json")) {
        detail = JSON.stringify(await res.json());
      } else {
        const t = await res.text();
        if (t) detail = t.slice(0, 500);
      }
    } catch {
      // keep detail
    }
    throw new Error(`ElevenLabs ${res.status}: ${detail}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const { config } = await import("dotenv");
  const path = await import("node:path");
  const url = await import("node:url");
  const fs = await import("node:fs/promises");

  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  config({ path: path.resolve(__dirname, "../.env.local") });

  const redisUrlEarly = trimEnv("REDIS_URL");
  const isTraditionalRedisTcp =
    redisUrlEarly.length > 0 && !redisUrlEarly.startsWith("https://");

  const store = await createRatingStore();
  if (!store) {
    if (isTraditionalRedisTcp) {
      console.error(
        'REDIS_URL is set but is not usable as redis:// or rediss:// (expected Redis Enterprise TCP URL). Did you paste an https URL?',
      );
    } else {
      console.error(
        "Missing storage config: use KV_REST_API_URL + KV_REST_API_TOKEN / Upstash REST, or REDIS_URL as redis(s):// for TCP Redis.",
      );
    }
    process.exitCode = 1;
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY is not set (check .env.local).");
    process.exitCode = 1;
    return;
  }

  const voiceId = resolveVoiceId();
  const cacheDate = utcDateKey();
  const outDir = path.resolve(__dirname, "output", "audio");
  await fs.mkdir(outDir, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const symbol of POPULAR_SYMBOLS) {
    const key = `rating:${symbol}:${cacheDate}`;
    let cached;
    try {
      cached = await store.get(key);
    } catch (err) {
      console.error(`Cache get failed for ${symbol} (${key}):`, err);
      failed += 1;
      continue;
    }

    if (cached == null) {
      console.log(`No cached rating for ${symbol}, skipping`);
      skipped += 1;
      continue;
    }

    const coreNarration = buildCoreNarration(symbol, cached);
    if (!coreNarration) {
      console.log(`No usable rating payload for ${symbol}, skipping`);
      skipped += 1;
      continue;
    }

    try {
      const mp3 = await textToSpeechMp3(apiKey, voiceId, coreNarration);
      const filePath = path.resolve(outDir, `${symbol}.mp3`);
      await fs.writeFile(filePath, mp3);
      generated += 1;
      console.log(`Wrote ${filePath}`);
    } catch (err) {
      console.error(`ElevenLabs failed for ${symbol}:`, err);
      failed += 1;
    }
  }

  console.log(
    `\nDone. Generated: ${generated}, skipped: ${skipped}, failed: ${failed}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
