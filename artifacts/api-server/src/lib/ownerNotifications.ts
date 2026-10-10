import { logger } from "./logger";
import { escapeHtml, sendEmail } from "./resend";

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
 * receive the notification). Failures are logged and swallowed -- a
 * notification issue must never block recording the acceptance itself.
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

  const { ok } = await sendEmail({
    to: ownerEmail,
    subject: `${payload.memberName} accepted the WODPLACE contracts`,
    html: `<p><strong>${escapeHtml(payload.memberName)}</strong> (${escapeHtml(
      payload.memberEmail,
    )}) just accepted the gym contracts.</p><p>Accepted at: ${payload.acceptedAt.toLocaleString()}</p>`,
  });

  if (ok) {
    logger.info(
      { ownerEmail },
      "Sent contract acceptance notification email to owner",
    );
  }
}
