import { clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return null;
  return new Stripe(secret);
}

async function resolveClerkUserIdForSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const meta = subscription.metadata ?? {};
  const fromSub = meta.clerk_user_id ?? meta.clerkUserId;
  if (fromSub) return fromSub;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !("metadata" in customer)) return null;
  const cm = customer.metadata ?? {};
  return cm.clerk_user_id ?? cm.clerkUserId ?? null;
}

/** Base URL for calling same-deployment API routes (VERCEL_URL has no scheme). */
function resolveInternalApiOrigin(): string {
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return "https://tickerrank.com";
}

async function sendWelcomeEmailSafe(email: string, name: string): Promise<void> {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) {
    console.error(
      "[stripe-webhook] INTERNAL_API_SECRET is not set; skipping welcome email",
    );
    return;
  }

  const origin = resolveInternalApiOrigin();
  const url = `${origin}/api/send-welcome-email`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ email, name }),
    });

    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
      console.error(
        "[stripe-webhook] Welcome email request failed",
        res.status,
        detail.slice(0, 500),
      );
    }
  } catch (err) {
    console.error("[stripe-webhook] Welcome email fetch error", err);
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  if (!stripe) {
    console.error("[stripe-webhook] STRIPE_SECRET_KEY is not configured");
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed", err);
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  try {
    const client = await clerkClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (!userId) {
          console.error(
            "[stripe-webhook] checkout.session.completed missing client_reference_id",
            session.id,
          );
          return NextResponse.json(
            { error: "Missing client_reference_id on session" },
            { status: 400 },
          );
        }
        await client.users.updateUser(userId, {
          publicMetadata: { subscription: "pro" },
        });

        const email = session.customer_details?.email?.trim();
        const name = session.customer_details?.name?.trim() ?? "";
        if (email) {
          await sendWelcomeEmailSafe(email, name);
        } else {
          console.warn(
            "[stripe-webhook] checkout.session.completed: no customer_details.email; skipping welcome email",
            session.id,
          );
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveClerkUserIdForSubscription(stripe, subscription);
        if (!userId) {
          console.error(
            "[stripe-webhook] customer.subscription.deleted: could not resolve Clerk user id",
            subscription.id,
          );
          return NextResponse.json(
            { error: "Could not resolve user for subscription" },
            { status: 400 },
          );
        }
        await client.users.updateUser(userId, {
          publicMetadata: { subscription: "free" },
        });
        break;
      }
      default:
        break;
    }

    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("[stripe-webhook] Handler error", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
