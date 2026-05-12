import { validateInternalApiRequest } from "@/lib/automation/internal-api-secret";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://tickerrank.com";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildWelcomeEmailHtml(opts: {
  displayName: string;
  dashboardUrl: string;
  logoUrl: string;
}): string {
  const greetingName =
    opts.displayName.trim().length > 0 ? escapeHtml(opts.displayName.trim()) : "there";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Welcome to TickerRank Pro</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1120;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B1120;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <tr>
            <td style="padding:32px 28px 24px;text-align:center;">
              <img src="${opts.logoUrl}" alt="TickerRank" width="48" height="48" style="display:inline-block;border-radius:10px;" />
              <h1 style="margin:20px 0 0;font-size:22px;line-height:1.25;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">
                Welcome to TickerRank Pro!
              </h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:#94a3b8;">
                Hi ${greetingName}, thanks for subscribing. Your Pro membership is active—you’re ready to dive in.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">
                What you unlock
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 10px;">
                <tr>
                  <td style="padding:14px 16px;background-color:rgba(59,130,246,0.12);border-radius:12px;border:1px solid rgba(59,130,246,0.25);">
                    <span style="font-size:15px;font-weight:600;color:#e2e8f0;">Unlimited ratings</span>
                    <span style="display:block;margin-top:4px;font-size:14px;line-height:1.45;color:#94a3b8;">Rate any US ticker without caps.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;background-color:rgba(59,130,246,0.12);border-radius:12px;border:1px solid rgba(59,130,246,0.25);">
                    <span style="font-size:15px;font-weight:600;color:#e2e8f0;">Full AI insights</span>
                    <span style="display:block;margin-top:4px;font-size:14px;line-height:1.45;color:#94a3b8;">Deeper analysis on every scorecard.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;background-color:rgba(59,130,246,0.12);border-radius:12px;border:1px solid rgba(59,130,246,0.25);">
                    <span style="font-size:15px;font-weight:600;color:#e2e8f0;">News sentiment</span>
                    <span style="display:block;margin-top:4px;font-size:14px;line-height:1.45;color:#94a3b8;">See how headlines lean on your holdings.</span>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#3B82F6;">
                    <a href="${opts.dashboardUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
                      Open your dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b;text-align:center;">
                Questions? Reply to this email or write to
                <a href="mailto:support@tickerrank.com" style="color:#60a5fa;text-decoration:none;">support@tickerrank.com</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:11px;color:#475569;text-align:center;">
          You’re receiving this because you subscribed to TickerRank Pro.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const denied = validateInternalApiRequest(request);
  if (denied) return denied;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[send-welcome-email] RESEND_API_KEY is missing");
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email =
    body &&
    typeof body === "object" &&
    "email" in body &&
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";

  const name =
    body &&
    typeof body === "object" &&
    "name" in body &&
    typeof (body as { name?: unknown }).name === "string"
      ? (body as { name: string }).name
      : "";

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ??
    "TickerRank <noreply@tickerrank.com>";

  const origin = resolveSiteOrigin();
  const dashboardUrl = `${origin}/dashboard`;
  const logoUrl = `${origin}/icon.svg`;

  const html = buildWelcomeEmailHtml({
    displayName: name,
    dashboardUrl,
    logoUrl,
  });

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: "Welcome to TickerRank Pro!",
      html,
    });

    if (error) {
      console.error("[send-welcome-email] Resend error", error);
      return NextResponse.json(
        { error: typeof error.message === "string" ? error.message : "Send failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[send-welcome-email] exception", err);
    const message =
      err instanceof Error ? err.message : "Failed to send welcome email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
