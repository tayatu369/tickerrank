import { auth } from "@clerk/nextjs/server";
import { kvSetSafe } from "@/lib/kv-safe";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const ideaRaw = rec.idea;
  if (typeof ideaRaw !== "string" || ideaRaw.trim() === "") {
    return NextResponse.json({ error: "Your idea is required." }, { status: 400 });
  }

  const reason =
    typeof rec.reason === "string" ? rec.reason.trim() : "";
  const email =
    typeof rec.email === "string" ? rec.email.trim() : "";

  const submittedAt = new Date().toISOString();
  const key = `feedback:${Date.now()}`;
  const ok = await kvSetSafe(key, {
    idea: ideaRaw.trim(),
    reason,
    email,
    submittedAt,
  });

  if (!ok) {
    return NextResponse.json(
      {
        error:
          "We could not save your request right now. Please try again later.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
