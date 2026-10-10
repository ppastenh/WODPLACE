import { ApiError, apiFetch } from "@/lib/apiClient";
import type { ClaimInviteResult } from "@workspace/api-zod";

// A code arriving via /auth?invite=XXXX (or typed into the manual "Tengo
// un código" form) outlives the signup/signin round trip in here, since
// the actual grant only happens once a session exists — see
// artifacts/api-server/src/routes/invites.ts.
const STORAGE_KEY = "wodplace_pending_invite_code";

export function storePendingInviteCode(code: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode / blocked storage — the manual "Tengo un código" entry
    // point still works without this.
  }
}

export function readPendingInviteCode(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInviteCode() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage isn't available.
  }
}

/**
 * Call right after a session exists (post signUp/signIn) if a code was
 * stashed earlier. Never throws — a failed claim must not block normal
 * login, it just means the account stays as-is and the caller can show
 * the message.
 *
 * Only a definitive rejection (400 — invalid/expired/mismatched code)
 * clears the stored code. A 429 (rate limited) or any other transient
 * failure (5xx, network) leaves it in place so the NEXT login retries
 * it instead of silently losing a code that might still be good.
 */
export async function claimPendingInvite(): Promise<{ claimed: boolean; message?: string }> {
  const code = readPendingInviteCode();
  if (!code) return { claimed: false };
  try {
    await apiFetch<ClaimInviteResult>("/invites/claim", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    clearPendingInviteCode();
    return { claimed: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      clearPendingInviteCode();
    }
    return { claimed: false, message: err instanceof Error ? err.message : "Error" };
  }
}
