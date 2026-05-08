import { validateCronRequest } from "@/lib/automation/cron-secret";
import {
  DAILY_CONTENT_KV_KEY,
  runDailyContentPipeline,
} from "@/lib/automation/daily-content-pipeline";
import { kvSetSafe } from "@/lib/kv-safe";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = validateCronRequest(request);
  if (denied) return denied;

  try {
    const { payload, fullPipelineCount, errors } =
      await runDailyContentPipeline();
    const kvWritten = await kvSetSafe(DAILY_CONTENT_KV_KEY, payload);

    return NextResponse.json({
      ok: true,
      tickersRequested: payload.tickersRequested.length,
      fullPipelineCount,
      partialOrFailedCount: payload.items.length - fullPipelineCount,
      errorCount: errors.length,
      errors,
      kvWritten,
      model: payload.model,
      generatedAt: payload.generatedAt,
      finishedAt: payload.finishedAt,
    });
  } catch (err) {
    console.error("[cron/generate-content]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
