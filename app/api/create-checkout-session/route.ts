import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/** Use NEXT_PUBLIC_STRIPE_PRICE_ID from .env.local. Fallback is a placeholder — replace with a Price ID from your Stripe Dashboard (test or live). */
const FALLBACK_STRIPE_PRICE_ID = "price_1TRouFPJhMQJFTIoyoF5hFdp";

function resolveOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function resolveStripePriceId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim();
  if (fromEnv) return fromEnv;
  return FALLBACK_STRIPE_PRICE_ID;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "Failed to create checkout session";
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error("[create-checkout-session] Invalid JSON body", parseErr);
      body = {};
    }
    const userId =
      body &&
      typeof body === "object" &&
      "userId" in body &&
      typeof (body as { userId?: unknown }).userId === "string"
        ? (body as { userId: string }).userId.trim()
        : "";
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required in the request body" },
        { status: 400 },
      );
    }

    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) {
      console.error(
        "[create-checkout-session] STRIPE_SECRET_KEY is missing or empty",
      );
      return NextResponse.json(
        {
          error:
            "Server misconfiguration: STRIPE_SECRET_KEY is not set. Add it to .env.local.",
        },
        { status: 500 },
      );
    }

    const priceId = resolveStripePriceId();

    const stripe = new Stripe(secret);
    const origin = resolveOrigin(request);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-failed?reason=card_declined`,
    });

    if (!session.url) {
      console.error(
        "[create-checkout-session] Stripe returned a session without a url",
        session.id,
      );
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout-session] caught exception", err);
    if (err instanceof Error) {
      console.error("[create-checkout-session] stack", err.stack);
    }
    const status =
      typeof err === "object" &&
      err !== null &&
      "statusCode" in err &&
      typeof (err as { statusCode: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    return NextResponse.json(
      { error: errorMessage(err) },
      { status: safeStatus },
    );
  }
}
