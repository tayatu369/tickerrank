import { auth, clerkClient } from "@clerk/nextjs/server";
import { kvGetSafe } from "@/lib/kv-safe";
import { NextResponse } from "next/server";

function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function countFromKvGet(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const subscription = user.publicMetadata?.subscription;
  const isPro = subscription === "pro";
  if (isPro) {
    return NextResponse.json({ unlimited: true });
  }

  const todayKey = utcDateKey(new Date());
  const usageKey = `usage:${userId}:${todayKey}`;
  const raw = await kvGetSafe(usageKey);
  const count = countFromKvGet(raw);

  return NextResponse.json({ count, limit: 3 });
}
