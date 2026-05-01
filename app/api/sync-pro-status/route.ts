import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Sets the signed-in user's publicMetadata.subscription to "pro".
 * Public metadata cannot be updated from the browser; this route uses Clerk's Backend API.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { subscription: "pro" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sync-pro-status]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update subscription",
      },
      { status: 500 },
    );
  }
}
