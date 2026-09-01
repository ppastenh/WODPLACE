import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS. Used only for the admin
 * dashboard auto-login flow (`auth.admin.generateLink`). Never expose the
 * service role key to any client; it lives in api-server env / Replit
 * Secrets only.
 *
 * Lazily constructed so importing this module doesn't throw at boot when the
 * env vars aren't set (e.g. running the rest of the API without the dash
 * auto-login configured).
 */

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// New Supabase API keys are opaque strings, not bearer JWTs. supabase-js still
// sets `Authorization: Bearer <key>` by default; strip it and rely on `apikey`.
function createSupabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    }
    if (
      isNewSupabaseApiKey(key) &&
      headers.get("Authorization") === `Bearer ${key}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

let cached: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceRoleKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ].join(", ");
    throw new Error(
      `Missing Supabase env var(s): ${missing}. Required for the admin dashboard auto-login link.`,
    );
  }

  cached = createClient(url, serviceRoleKey, {
    global: { fetch: createSupabaseFetch(serviceRoleKey) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Origin box-admin is served from — the magic link redirects here after verify. */
export function getDashboardUrl(): string {
  const raw = process.env["DASHBOARD_URL"];
  if (!raw) {
    throw new Error(
      "Missing DASHBOARD_URL env var. Set it to the box-admin origin (e.g. http://192.168.1.87:5002).",
    );
  }
  return raw.replace(/\/+$/, "");
}
