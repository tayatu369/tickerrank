import { kvSetSafe } from "@/lib/kv-safe";
import {
  type DailyContentPayload,
  type DailyContentItem,
} from "@/lib/automation/daily-content-pipeline";

export const DAILY_AUDIO_MANIFEST_KEY = "daily-audio:latest" as const;

export function mp3StorageKey(symbol: string): string {
  return `daily-audio:mp3:${symbol.toUpperCase()}`;
}

const MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_VOICE_NAME = "Adam";

/** Preset ElevenLabs voice names → API voice_id */
const VOICES_BY_NAME = Object.freeze({
  Adam: "pNInz6obpgDQGcFmaJgB",
  Rachel: "21m00Tcm4TlvDq8ikWAM",
});

/** ~64 kbps keeps KV payloads under common 1MB REST limits for ~60s audio. */
const MP3_OUTPUT_FORMAT = "mp3_44100_64";

const BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export function resolveVoiceIdFromEnv(): string {
  const fromEnvId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (fromEnvId) return fromEnvId;
  const name = (process.env.ELEVENLABS_VOICE ?? DEFAULT_VOICE_NAME).trim();
  const key = Object.keys(VOICES_BY_NAME).find(
    (n) => n.toLowerCase() === name.toLowerCase(),
  );
  if (!key) return VOICES_BY_NAME[DEFAULT_VOICE_NAME];
  return VOICES_BY_NAME[key as keyof typeof VOICES_BY_NAME];
}

export async function textToSpeechMp3(apiKey: string, voiceId: string, text: string) {
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
        const errJson: unknown = await res.json();
        detail = JSON.stringify(errJson);
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

export type DailyAudioManifest = {
  generatedAt: string;
  modelId: string;
  voiceId: string;
  voicePreset: string;
  mp3OutputFormat: string;
  bySymbol: Record<
    string,
    | { url: string; bytes: number }
    | { skipped: true; reason: string }
    | { error: string }
  >;
};

function isCompleteDailyItem(
  item: DailyContentItem,
): item is DailyContentItem & {
  videoScript: {
    hook_text_on_screen: string;
    core_narration: string;
    cta: string;
  };
} {
  return (
    !("error" in item) &&
    item.videoScript != null &&
    typeof item.videoScript.core_narration === "string" &&
    item.videoScript.core_narration.trim() !== ""
  );
}

/**
 * Synthesizes MP3s, stores base64 under `daily-audio:mp3:{SYMBOL}`,
 * and writes manifest to `daily-audio:latest`.
 */
export async function runVoiceoverPipeline(options: {
  payload: DailyContentPayload;
  publicOrigin: string;
}): Promise<{
  successCount: number;
  skippedCount: number;
  failedCount: number;
  manifest: DailyAudioManifest;
  kvManifestWritten: boolean;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }

  const voiceId = resolveVoiceIdFromEnv();
  const manifest: DailyAudioManifest = {
    generatedAt: "",
    modelId: MODEL_ID,
    voiceId,
    voicePreset: process.env.ELEVENLABS_VOICE?.trim() ?? DEFAULT_VOICE_NAME,
    mp3OutputFormat: MP3_OUTPUT_FORMAT,
    bySymbol: {},
  };

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const base = options.publicOrigin.replace(/\/$/, "");

  for (const item of options.payload.items) {
    const symbol = item.symbol;
    if (!isCompleteDailyItem(item)) {
      manifest.bySymbol[symbol] = {
        skipped: true,
        reason: "no core_narration or incomplete daily item",
      };
      skippedCount += 1;
      continue;
    }

    const text = item.videoScript.core_narration.trim();

    try {
      const mp3 = await textToSpeechMp3(apiKey, voiceId, text);
      if (mp3.length > 900_000) {
        throw new Error("MP3 too large for KV; shorten script or lower bitrate");
      }
      const b64 = mp3.toString("base64");
      const kvAudioOk = await kvSetSafe(mp3StorageKey(symbol), b64);
      if (!kvAudioOk) {
        throw new Error("KV refused to store audio (not configured?)");
      }
      const url = `${base}/api/public/daily-audio/${encodeURIComponent(symbol)}`;
      manifest.bySymbol[symbol] = { url, bytes: mp3.length };
      successCount += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      manifest.bySymbol[symbol] = { error: message };
      failedCount += 1;
    }
  }

  manifest.generatedAt = new Date().toISOString();
  const kvManifestWritten = await kvSetSafe(
    DAILY_AUDIO_MANIFEST_KEY,
    manifest,
  );

  return {
    successCount,
    skippedCount,
    failedCount,
    manifest,
    kvManifestWritten,
  };
}
