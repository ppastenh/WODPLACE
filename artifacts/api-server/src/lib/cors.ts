import type { CorsOptions } from "cors";

// Used only when ALLOWED_ORIGINS isn't set AND we're not in production --
// keeps local dev (box-admin/super-admin's vite dev servers, plus the LAN
// IP wodplace's Expo web preview might use) working without requiring every
// developer to set an env var. Production (Render) must always set
// ALLOWED_ORIGINS explicitly -- see .env.example.
const DEV_FALLBACK_ORIGINS = [
  "http://localhost:5002",
  "http://localhost:5003",
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
];

function parseAllowedOrigins(): (string | RegExp)[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw && raw.trim()) {
    return raw.split(",").map((o) => o.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV === "production") {
    // Fail loud rather than silently wide-open in prod -- matches how
    // every other required env var in this app behaves (see
    // supabaseAdmin.ts, index.ts's PORT check).
    throw new Error("ALLOWED_ORIGINS must be set in production (comma-separated list of allowed origins).");
  }
  return DEV_FALLBACK_ORIGINS;
}

const allowedOrigins = parseAllowedOrigins();

function isAllowed(origin: string): boolean {
  return allowedOrigins.some((o) => (typeof o === "string" ? o === origin : o.test(origin)));
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // No Origin header at all -- native app requests (wodplace's own
    // fetch calls aren't subject to CORS, which is a browser-only
    // mechanism), curl, server-to-server. Always allowed; nothing to
    // compare against.
    if (!origin) {
      callback(null, true);
      return;
    }
    if (isAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
};
