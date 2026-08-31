import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived admin session token issued by the PIN flow and sent back as
 * `Authorization: Bearer <token>`. Stateless: `<userId>.<expiryMs>.<sig>`
 * where sig = HMAC-SHA256(`<userId>.<expiryMs>`, secret). No sessions table.
 *
 * The signing secret reuses the existing ADMIN_ACCESS_CODE env var (its only
 * remaining purpose now that the shared code prompt is gone).
 */

const TTL_MS = 30 * 60 * 1000; // 30 minutes

function secret(): string {
  const s = process.env.ADMIN_ACCESS_CODE;
  if (!s) {
    throw new Error(
      "ADMIN_ACCESS_CODE is not configured (used as the admin session signing secret)",
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signAdminToken(userId: string): string {
  const payload = `${encodeURIComponent(userId)}.${Date.now() + TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(
  token: string | undefined | null,
): { userId: string } | null {
  if (!token) return null;

  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const providedSig = token.slice(lastDot + 1);

  const expectedSig = sign(payload);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const firstDot = payload.indexOf(".");
  if (firstDot <= 0) return null;
  const rawUser = payload.slice(0, firstDot);
  const exp = Number(payload.slice(firstDot + 1));
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  try {
    return { userId: decodeURIComponent(rawUser) };
  } catch {
    return null;
  }
}
