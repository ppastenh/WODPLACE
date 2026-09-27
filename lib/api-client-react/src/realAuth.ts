/**
 * Fase 2 of the mock-auth -> real Supabase Auth migration — hand-written,
 * same infrastructure as accountRecovery.ts/platformAgreement.ts. Only
 * covers NEW accounts; mock accounts keep using the local AsyncStorage
 * flow untouched (see AuthContext.tsx).
 */
import { customFetch } from "./custom-fetch";

export type AuthMode = "real" | "mock" | "none";

/**
 * Which login path an email should use: `login()` calls this first to
 * decide between a real `signInWithPassword` and the untouched local mock
 * flow. Also replaces the old fully-local checkEmailExists() — this one
 * sees accounts created on a different device too.
 */
export async function getAuthMode(email: string): Promise<AuthMode> {
  const { mode } = await customFetch<{ mode: AuthMode }>(
    `/api/auth/mode?email=${encodeURIComponent(email)}`,
  );
  return mode;
}

export type RealAccountProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  rank: string | null;
  phrase: string | null;
  birthdate: string | null;
  phone: string | null;
};

/**
 * Creates a real Supabase Auth account (pre-confirmed server-side, see the
 * endpoint's own doc comment for why) plus its wodplace_users bridge row.
 * Does NOT sign the caller in — that's a normal `supabase.auth
 * .signInWithPassword()` right after this resolves, using the same
 * credentials, which succeeds immediately since the account is already
 * confirmed.
 */
export async function registerRealAccount(input: {
  email: string;
  password: string;
  name: string;
  birthdate?: string | null;
  phone?: string | null;
}): Promise<RealAccountProfile> {
  return customFetch<RealAccountProfile>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/**
 * The signed-in athlete's own profile, resolved server-side from the
 * verified JWT (never a client-supplied id) — requires setAuthTokenGetter()
 * to have a live Supabase session to attach.
 */
export async function getMe(): Promise<RealAccountProfile> {
  return customFetch<RealAccountProfile>("/api/users/me");
}
