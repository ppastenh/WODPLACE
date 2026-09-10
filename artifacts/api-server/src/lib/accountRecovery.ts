import { ReplitConnectors } from "@replit/connectors-sdk";

import { logger } from "./logger";

/**
 * Emails a wodplace athlete a one-time account-recovery code.
 *
 * Requires `RECOVERY_EMAIL_FROM` (a verified Resend sender, e.g.
 * `WODPLACE <noreply@your-domain.com>`) and the Resend connection attached
 * to this project. When `RECOVERY_EMAIL_FROM` is unset the code is logged
 * instead of sent, so the flow is still testable in dev — the caller's
 * response is identical either way.
 *
 * Returns nothing meaningful: the `/account-recovery/request` endpoint
 * always answers the same regardless of delivery outcome, so it can't be
 * used to probe which emails are registered.
 */
export async function sendRecoveryCodeEmail(params: {
  to: string;
  code: string;
  name: string;
}): Promise<void> {
  const from = process.env.RECOVERY_EMAIL_FROM;
  if (!from) {
    logger.warn(
      { to: params.to, code: params.code },
      "RECOVERY_EMAIL_FROM is not set; logging the recovery code instead of emailing it",
    );
    return;
  }

  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: "Tu código para recuperar tu cuenta de WODPLACE",
        html:
          `<p>Hola ${escapeHtml(params.name)},</p>` +
          `<p>Tu código para recuperar el acceso a tu cuenta de WODPLACE es:</p>` +
          `<p style="font-size:28px;font-weight:bold;letter-spacing:4px">${escapeHtml(params.code)}</p>` +
          `<p>Vence en 10 minutos. Si no pediste esto, ignorá este correo.</p>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error(
        { status: response.status, body },
        "Resend rejected the account-recovery code email",
      );
      return;
    }

    logger.info({ to: params.to }, "Sent account-recovery code email");
  } catch (error) {
    logger.error({ err: error }, "Failed to send account-recovery code email");
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
