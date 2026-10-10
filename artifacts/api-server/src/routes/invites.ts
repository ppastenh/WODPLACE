import crypto from "node:crypto";

import {
  ClaimInviteBody,
  ClaimInviteResponse,
  GetNewInviteCodeQueryParams,
  GetNewInviteCodeResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { requireSupabaseUser } from "../lib/supabaseAuth";

const router: IRouter = Router();

// In-memory, per-instance — this only guards against pointless spam of
// random codes (the code is worthless without a matching admin_invites
// row, which is separately RLS-gated on insert), so it doesn't need the
// cross-instance rigor invite_claim_attempts has for the real brute-force
// surface on /invites/claim.
const NEW_CODE_WINDOW_MS = 10 * 60 * 1000;
const NEW_CODE_MAX_PER_WINDOW = 20;
const newCodeHits = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const hits = (newCodeHits.get(userId) ?? []).filter((t) => now - t < NEW_CODE_WINDOW_MS);
  hits.push(now);
  newCodeHits.set(userId, hits);
  return hits.length > NEW_CODE_MAX_PER_WINDOW;
}

async function isBoxAdminOrSuperAdmin(userId: string, boxId: string): Promise<boolean> {
  const rows = await db.execute<{ role: string; box_id: string | null }>(sql`
    select role, box_id from user_roles where user_id = ${userId}
  `);
  return rows.rows.some((r) => r.role === "super_admin" || (r.role === "box_admin" && r.box_id === boxId));
}

// Same unambiguous alphabet the old client-side genCode() used — 32
// characters, a power of two, so byte % 32 has zero modulo bias.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 14;

function generateCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * GET /invites/new-code?boxId=...
 *
 * Hands back a fresh crypto-random code for box-admin's "Invitar Staff"
 * screen to use when it inserts the admin_invites row itself (still a
 * direct, RLS-gated client insert; this only replaces the old
 * client-side Math.random()-based genCode()). The real authorization for
 * creating the invite row is the RLS policy on that insert — this check
 * is a belt-and-suspenders guard so a non-admin can't even mint codes.
 */
router.get("/invites/new-code", requireSupabaseUser, async (req: Request, res: Response) => {
  const parsed = GetNewInviteCodeQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Falta boxId." });
    return;
  }
  const userId = req.supabaseUser!.id;

  if (isRateLimited(userId)) {
    res.status(429).json({ error: "Demasiados códigos generados. Espera unos minutos." });
    return;
  }
  if (!(await isBoxAdminOrSuperAdmin(userId, parsed.data.boxId))) {
    res.status(403).json({ error: "No tienes permiso para invitar staff en este box." });
    return;
  }

  res.json(GetNewInviteCodeResponse.parse({ code: generateCode() }));
});

// Keep in sync with the literal "interval '15 minutes'" below — not
// interpolated dynamically, this constant is just the matching threshold.
const MAX_ATTEMPTS = 5;

async function recordFailedAttempt(userId: string, ip: string | null): Promise<void> {
  await db
    .execute(sql`insert into invite_claim_attempts (user_id, ip) values (${userId}, ${ip})`)
    .catch(() => {
      // Never let the audit write itself break the (already-failed) response.
    });
}

/**
 * POST /invites/claim  { code }
 *
 * The one path that turns a staff invite into a real role grant — called
 * right after sign-up OR sign-in (new or pre-existing account) with that
 * session's own token, never automatically at account-creation time (see
 * the now-disarmed DB trigger's own comment). The invite's email is
 * matched against the SESSION's email (never a client-supplied one) AND
 * the code, together, in one query — missing either is indistinguishable
 * from missing both, both in the response and in what gets logged.
 */
router.post("/invites/claim", requireSupabaseUser, async (req: Request, res: Response) => {
  const parsed = ClaimInviteBody.safeParse(req.body);
  const userId = req.supabaseUser!.id;
  const email = req.supabaseUser!.email;
  // With app.set("trust proxy", 1) (app.ts), this is the real client IP
  // from X-Forwarded-For's first hop, not Render's own proxy address.
  const ip = req.ip ?? null;

  if (!parsed.success) {
    res.status(400).json({ error: "Código inválido o vencido." });
    return;
  }
  const { code } = parsed.data;

  try {
    // Opportunistic self-pruning instead of pg_cron (not used anywhere
    // else in this project) — every real claim attempt also sweeps rows
    // older than a week.
    await db.execute(sql`delete from invite_claim_attempts where created_at < now() - interval '7 days'`);

    const recent = await db.execute<{ count: string }>(sql`
      select count(*)::text as count from invite_claim_attempts
      where created_at > now() - interval '15 minutes'
        and (user_id = ${userId} or ip = ${ip})
    `);
    if (Number(recent.rows[0]?.count ?? 0) >= MAX_ATTEMPTS) {
      res.status(429).json({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." });
      return;
    }

    if (!email) {
      await recordFailedAttempt(userId, ip);
      res.status(400).json({ error: "Código inválido o vencido." });
      return;
    }

    const granted = await db.transaction(async (tx) => {
      const inviteRows = await tx.execute<{ id: string; box_id: string; role: string }>(sql`
        select id, box_id, role from admin_invites
        where code = ${code}
          and lower(email) = lower(${email})
          and used_at is null
          and (expires_at is null or expires_at > now())
        for update
      `);
      const invite = inviteRows.rows[0];
      if (!invite) return null;

      await tx.execute(sql`
        update admin_invites set used_at = now(), used_by = ${userId}, status = 'aceptado'
        where id = ${invite.id}
      `);
      await tx.execute(sql`
        insert into user_roles (id, user_id, role, box_id)
        values (gen_random_uuid(), ${userId}, ${invite.role}, ${invite.box_id})
        on conflict (user_id, role, box_id) do nothing
      `);

      if (invite.role === "coach") {
        const linked = await tx.execute(sql`
          update coaches set user_id = ${userId}
          where box_id = ${invite.box_id} and lower(email) = lower(${email}) and user_id is null
          returning id
        `);
        if (linked.rowCount === 0) {
          await tx.execute(sql`
            insert into coaches (box_id, name, email, user_id)
            values (${invite.box_id}, ${email}, ${email}, ${userId})
          `);
        }
      }

      return { role: invite.role as "coach" | "box_admin", boxId: invite.box_id };
    });

    if (!granted) {
      await recordFailedAttempt(userId, ip);
      res.status(400).json({ error: "Código inválido o vencido." });
      return;
    }

    res.json(ClaimInviteResponse.parse(granted));
  } catch (error) {
    req.log.error({ err: error }, "Error claiming staff invite");
    res.status(500).json({ error: "No se pudo procesar la invitación." });
  }
});

export default router;
