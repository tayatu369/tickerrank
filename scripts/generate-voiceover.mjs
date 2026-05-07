import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

/**
 * Generate MP3 voiceovers from daily-content.json core_narration fields.
 * Run: node scripts/generate-voiceover.mjs
 * Requires: ELEVENLABS_API_KEY
 * Optional: ELEVENLABS_VOICE=Adam|Rachel (default Adam), or ELEVENLABS_VOICE_ID for a raw voice id.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from 'path';

const CONTENT_FILE = join(__dirname, "output", "daily-content.json");
const AUDIO_DIR = join(__dirname, "output", "audio");
const MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_VOICE_NAME = "Adam";

/** Preset ElevenLabs voice names → API voice_id (ElevenLabs requires ids, not display names). */
const VOICES_BY_NAME = Object.freeze({
  Adam: "pNInz6obpgDQGcFmaJgB",
  Rachel: "21m00Tcm4TlvDq8ikWAM",
});

const BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";

function resolveVoiceId() {
  const fromEnvId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (fromEnvId) {
    console.log(`Using voice from ELEVENLABS_VOICE_ID.`);
    return fromEnvId;
  }
  const name = (
    process.env.ELEVENLABS_VOICE ?? DEFAULT_VOICE_NAME
  ).trim();
  const key = Object.keys(VOICES_BY_NAME).find(
    (n) => n.toLowerCase() === name.toLowerCase(),
  );
  if (!key) {
    console.warn(
      `Unknown ELEVENLABS_VOICE "${name}". Falling back to ${DEFAULT_VOICE_NAME}.`,
    );
    return VOICES_BY_NAME[DEFAULT_VOICE_NAME];
  }
  console.log(`Using preset voice "${key}" (${MODEL_ID}).`);
  return VOICES_BY_NAME[key];
}

async function textToSpeechMp3({ apiKey, voiceId, text }) {
  const url = new URL(`${BASE_URL}/${encodeURIComponent(voiceId)}`);
  url.searchParams.set("output_format", "mp3_44100_128");

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
        const errJson = await res.json();
        detail = JSON.stringify(errJson);
      } else {
        const t = await res.text();
        if (t) detail = t.slice(0, 500);
      }
    } catch {
      // keep detail as statusText
    }
    throw new Error(`ElevenLabs ${res.status}: ${detail}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "Missing ELEVENLABS_API_KEY. Set it in your environment and retry.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("TickerRank voiceover generator");
  console.log(`Input: ${CONTENT_FILE}`);
  console.log(`Output dir: ${AUDIO_DIR}`);

  let raw;
  try {
    raw = await readFile(CONTENT_FILE, "utf8");
  } catch (err) {
    console.error("Failed to read daily-content.json:", err?.message ?? err);
    process.exitCode = 1;
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error("Invalid JSON in daily-content.json:", err?.message ?? err);
    process.exitCode = 1;
    return;
  }

  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    console.warn("No items[] in daily-content.json; nothing to do.");
    return;
  }

  await mkdir(AUDIO_DIR, { recursive: true });

  const voiceId = resolveVoiceId();

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const symbol = item?.symbol;
    if (!symbol || typeof symbol !== "string") {
      console.warn("Skipping row without symbol.");
      skipped += 1;
      continue;
    }

    const text = item?.videoScript?.core_narration;
    if (!text || typeof text !== "string" || !text.trim()) {
      console.log(
        `[${symbol}] Skipping — no core_narration (generate daily content first or fix entry).`,
      );
      skipped += 1;
      continue;
    }

    const outPath = join(AUDIO_DIR, `${symbol}.mp3`);

    try {
      console.log(`[${symbol}] Synthesizing speech (${text.trim().length} chars)...`);
      const mp3 = await textToSpeechMp3({
        apiKey,
        voiceId,
        text: text.trim(),
      });
      await writeFile(outPath, mp3);
      console.log(`[${symbol}] Wrote ${outPath} (${mp3.length} bytes).`);
      ok += 1;
    } catch (err) {
      console.error(`[${symbol}] Failed:`, err?.message ?? err);
      failed += 1;
    }
  }

  console.log(
    `\nDone. success=${ok} skipped=${skipped} failed=${failed} (total rows=${items.length}).`,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});
