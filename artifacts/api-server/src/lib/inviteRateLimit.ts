import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Request } from "express";

/**
 * Shared brute-force guard for anything that tries to redeem a one-time
 * invite code against a session (staff's /invites/claim and, since
 * 2026-10-15, the personal member-invite branch of
 * /box-memberships/redeem). Extracted out of routes/invites.ts so both
 * surfaces share the exact same table and counting logic instead of two
 * copies drifting apart.
 */

/**
 * The real client IP, confirmed live against production: Render sits
 * behind Cloudflare, and X-Forwarded-For turned out to be
 * attacker-controllable — Cloudflare appends its own hop but does NOT
 * strip whatever a client already put in that header, so a forged prefix
 * survives all the way through (verified with curl: `X-Forwarded-For:
 * 1.2.3.4, 5.6.7.8` arrived intact, prepended to the real chain).
 * `trust proxy`/`req.ip` are therefore never used for this.
 * `cf-connecting-ip` (mirrored by `true-client-ip`) is different: it's
 * set by Cloudflare's edge from the actual TCP connection, and a
 * client-supplied value for it is rejected outright before the request
 * even reaches Render. Falls back to req.ip only for local dev, where
 * there's no Cloudflare in front at all and the header is simply absent.
 */
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_RE = /^[0-9a-fA-F:]+(:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})?$/;

function isValidIp(value: string): boolean {
  const v4 = value.match(IPV4_RE);
  if (v4) return v4.slice(1).every((part) => Number(part) <= 255);
  return value.includes(":") && IPV6_RE.test(value);
}

export function getRealClientIp(req: Request): string | null {
  const header = req.headers["cf-connecting-ip"] ?? req.headers["true-client-ip"];
  if (typeof header === "string" && header && isValidIp(header)) return header;
  return req.ip ?? null;
}

/** Private/internal address — a private address never becomes a shared
 *  rate-limit bucket. */
function isPrivateIp(ip: string | null): boolean {
  if (!ip) return true;
  const v = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (v === "::1" || v === "127.0.0.1" || v.startsWith("127.")) return true;
  if (v.startsWith("fc") || v.startsWith("fd")) return true;
  const m = v.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

export const MAX_ATTEMPTS = 5;

export async function recordFailedAttempt(userId: string | null, ip: string | null): Promise<void> {
  await db
    .execute(sql`insert into invite_claim_attempts (user_id, ip) values (${userId}, ${ip})`)
    .catch(() => {
      // Never let the audit write itself break the (already-failed) response.
    });
}

/** Counts recent failed attempts for this user and/or (non-private) IP,
 *  pruning rows older than 7 days first. */
export async function countRecentAttempts(userId: string | null, ip: string | null): Promise<number> {
  await db.execute(sql`delete from invite_claim_attempts where created_at < now() - interval '7 days'`);
  const ipForMatch = isPrivateIp(ip) ? null : ip;
  const recent = await db.execute<{ count: string }>(sql`
    select count(*)::text as count from invite_claim_attempts
    where created_at > now() - interval '15 minutes'
      and ((${userId}::uuid is not null and user_id = ${userId}) or (${ipForMatch}::text is not null and ip = ${ipForMatch}))
  `);
  return Number(recent.rows[0]?.count ?? 0);
}
