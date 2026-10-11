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

// Module-level, not sessionStorage: resets on a full page load (a fresh
// confirmation-link visit, a manual refresh) but NOT on client-side
// navigation within the SPA. Keyed by the code itself (not just a
// boolean) and holding the actual in-flight PROMISE, not just a flag —
// so if more than one caller on this same page load asks about the same
// pending code (e.g. _authenticated's beforeLoad and _admin's beforeLoad
// both wanting to know "is a claim settling for this code?"), they all
// await the exact same network call instead of each firing their own.
// A different code (after the previous one resolved/cleared) starts a
// fresh entry — this is NOT a cross-tab lock, each tab has its own
// module scope; cross-tab duplication is handled server-side by
// /invites/claim's idempotency instead.
let inFlight: { code: string; promise: Promise<{ claimed: boolean; message?: string }> } | null = null;

/**
 * Wraps claimPendingInvite() with the shared-in-flight-promise guard
 * above. Returns null when there's nothing to do (no pending code).
 */
export function claimPendingInviteOnce(): Promise<{ claimed: boolean; message?: string } | null> {
  const code = readPendingInviteCode();
  if (!code) return Promise.resolve(null);
  if (inFlight && inFlight.code === code) return inFlight.promise;
  const promise = claimPendingInvite();
  inFlight = { code, promise };
  return promise;
}

const WELCOME_KEY = "wodplace_just_joined_staff";
const CLAIM_ERROR_KEY = "wodplace_invite_claim_error";

/** Set right before redirecting to the dashboard after a successful
 *  claim — the dashboard shows the "¡Bienvenido al staff!" banner once
 *  and clears this via consumeJustJoinedStaff(). */
export function markJustJoinedStaff() {
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
  } catch {
    // No banner if storage is unavailable — not worth failing anything over.
  }
}

export function consumeJustJoinedStaff(): boolean {
  try {
    const value = sessionStorage.getItem(WELCOME_KEY);
    if (value) sessionStorage.removeItem(WELCOME_KEY);
    return !!value;
  } catch {
    return false;
  }
}

/** Set only for a DEFINITIVE claim failure (the code is already cleared
 *  by then) — never for a transient one, which should stay silent and
 *  just retry later. */
export function markInviteClaimError(message: string) {
  try {
    sessionStorage.setItem(CLAIM_ERROR_KEY, message);
  } catch {
    // Nothing shown if storage is unavailable — the account still works.
  }
}

export function consumeInviteClaimError(): string | null {
  try {
    const value = sessionStorage.getItem(CLAIM_ERROR_KEY);
    if (value) sessionStorage.removeItem(CLAIM_ERROR_KEY);
    return value;
  } catch {
    return null;
  }
}
