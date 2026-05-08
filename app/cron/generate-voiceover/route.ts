import { validateCronRequest } from "@/lib/automation/cron-secret";
import {
  DAILY_CONTENT_KV_KEY,
  type DailyContentPayload,
} from "@/lib/automation/daily-content-pipeline";
import { publicOriginFromRequest } from "@/lib/automation/public-origin";
import { runVoiceoverPipeline } from "@/lib/automation/voiceover-pipeline";
import { kvGetSafe } from "@/lib/kv-safe";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = validateCronRequest(request);
  if (denied) return denied;

  try {
    const raw = await kvGetSafe(DAILY_CONTENT_KV_KEY);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        {
          ok: false,
          error: "No daily content in KV; run /cron/generate-content first.",
        },
        { status: 503 },
      );
    }

    const payload = raw as DailyContentPayload;
    const origin = publicOriginFromRequest(request);
    const {
      successCount,
      skippedCount,
      failedCount,
      manifest,
      kvManifestWritten,
    } = await runVoiceoverPipeline({ payload, publicOrigin: origin });

    return NextResponse.json({
      ok: true,
      successCount,
      skippedCount,
      failedCount,
      kvManifestWritten,
      manifest,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ELEVENLABS_API_KEY")) {
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
    console.error("[cron/generate-voiceover]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
