import { mp3StorageKey } from "@/lib/automation/voiceover-pipeline";
import { kvGetSafe } from "@/lib/kv-safe";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validateSymbol(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  if (!/^[A-Z]{1,10}$/.test(s)) return null;
  return s;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await context.params;
  const symbol = validateSymbol(raw);
  if (!symbol) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const b64 = await kvGetSafe<string>(mp3StorageKey(symbol));
  if (!b64 || typeof b64 !== "string") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buf = Buffer.from(b64, "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
