import { supabase } from "@/integrations/supabase/client";

/**
 * box-admin talks to Supabase directly for almost everything (RLS-gated).
 * This is the one exception: api-server for the staff-invite code
 * generation + claim endpoints (needs a privileged DB connection for the
 * transaction + rate limiting, see artifacts/api-server/src/routes/invites.ts).
 *
 * Production needs ALLOWED_ORIGINS on api-server (Render) to include
 * this app's origin (admin.wodplace.cl), and this app needs VITE_API_URL
 * set to api-server's origin (Cloudflare env var for this app) — see
 * .env.example.
 */
function resolveApiOrigin(): string {
  const url = import.meta.env.VITE_API_URL || process.env.API_URL;
  if (!url) {
    throw new Error("Missing VITE_API_URL — set it in .env.local (or the Cloudflare env var in production).");
  }
  return url.replace(/\/+$/, "");
}

/** Carries the HTTP status so callers can tell a definitive rejection
 *  (e.g. 400 invalid/expired code) from a transient one (429 rate
 *  limited, 5xx, network failure) that's worth retrying later. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${resolveApiOrigin()}/api${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body && typeof body === "object" && "error" in body && String(body.error)) || `HTTP ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}
