import { ReplitConnectors } from "@replit/connectors-sdk";

import { logger } from "./logger";

export interface ContractAcceptanceEmailPayload {
  memberName: string;
  memberEmail: string;
  acceptedAt: Date;
}

/**
 * Emails the gym owner as soon as a member accepts the contracts, so they
 * find out even if they never open the hidden admin panel.
 *
 * Requires the OWNER_EMAIL environment variable (the address that should
 * receive the notification) and the Resend connection to be attached to
 * this project. Failures are logged and swallowed -- a notification issue
 * must never block recording the acceptance itself.
 */
export async function sendContractAcceptanceEmail(
  payload: ContractAcceptanceEmailPayload,
): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    logger.warn(
      "OWNER_EMAIL is not set; skipping contract acceptance email notification",
    );
    return;
  }

  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify({
        from: "WODPLACE <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `${payload.memberName} accepted the WODPLACE contracts`,
        html: `<p><strong>${escapeHtml(payload.memberName)}</strong> (${escapeHtml(
          payload.memberEmail,
        )}) just accepted the gym contracts.</p><p>Accepted at: ${payload.acceptedAt.toLocaleString()}</p>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error(
        { status: response.status, body },
        "Resend rejected the contract acceptance notification email",
      );
      return;
    }

    logger.info(
      { ownerEmail },
      "Sent contract acceptance notification email to owner",
    );
  } catch (error) {
    logger.error(
      { err: error },
      "Failed to send contract acceptance notification email",
    );
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
