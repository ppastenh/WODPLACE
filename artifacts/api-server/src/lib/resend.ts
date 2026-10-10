import { logger } from "./logger";

const FROM = "WODPLACE <no-responder@wodplace.cl>";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Calls Resend's HTTP API directly with RESEND_API_KEY. Replaces the old
 * @replit/connectors-sdk path (ownerNotifications.ts) — that SDK resolves
 * its identity token by exec'ing the `replit` CLI binary or reading
 * REPL_IDENTITY/WEB_REPL_RENEWAL, all three of which are Replit-only and
 * absent on Render, so it always failed there (caught and logged, never
 * surfaced — the email just silently never sent).
 *
 * Never logs `to` or `html` — callers that build content from a secret
 * (an invite code) must keep it that way; this only logs Resend's own
 * failure status/body on error.
 */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY is not set; skipping email send");
    return { ok: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error({ status: res.status, body }, "Resend rejected an email");
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    logger.error({ err: error }, "Failed to send email via Resend");
    return { ok: false };
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
