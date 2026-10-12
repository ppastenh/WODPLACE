/**
 * Kill switch for the server-side "pending contract blocks new bookings"
 * check added in Fase B/B1 (see routes/bookings.ts, POST /bookings).
 * Defaults to enforced — set ENFORCE_CONTRACT_ACCEPTANCE=false in Render
 * to turn it off immediately if something goes wrong right after deploy,
 * without a redeploy. Not set in this repo (Render's env vars live in its
 * own dashboard, same as the other 12 — see CLAUDE.md); unset behaves the
 * same as "true".
 */
export function isContractAcceptanceEnforced(): boolean {
  return process.env.ENFORCE_CONTRACT_ACCEPTANCE !== "false";
}
