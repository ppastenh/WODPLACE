import crypto from "node:crypto";

import {
  GetNewMemberInviteCodeQueryParams,
  GetNewMemberInviteCodeResponse,
  ResendMemberInviteResponse,
  SendMemberInviteEmailResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { requireSupabaseUser } from "../lib/supabaseAuth";
import { escapeHtml, sendEmail } from "../lib/resend";

const router: IRouter = Router();

// Mismo generador de código que /invites/new-code (staff) -- 14
// caracteres, alfabeto sin ambigüedad, al azar criptográfico.
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

// In-memory, per-instance -- mismo patrón que /invites/new-code (staff),
// solo evita que una sesión genere códigos sin límite.
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

/**
 * GET /member-invites/new-code?boxId=...
 *
 * Hands back a fresh crypto-random code for box-admin's "Invitar alumno
 * por correo" screen to use when it inserts the member_invites row
 * itself (a direct, RLS-gated client insert — same pattern as staff's
 * /invites/new-code). The real authorization for creating the row is the
 * RLS policy on that insert; this is a belt-and-suspenders guard so a
 * non-admin can't even mint codes.
 */
router.get("/member-invites/new-code", requireSupabaseUser, async (req: Request, res: Response) => {
  const parsed = GetNewMemberInviteCodeQueryParams.safeParse(req.query);
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
    res.status(403).json({ error: "No tienes permiso para invitar alumnos en este box." });
    return;
  }

  res.json(GetNewMemberInviteCodeResponse.parse({ code: generateCode() }));
});

// In-memory, per-instance, keyed by box — mismo patrón que /invites/:id/send.
const SEND_WINDOW_MS = 60 * 60 * 1000;
const SEND_MAX_PER_WINDOW = 10;
const sendHits = new Map<string, number[]>();

function isSendRateLimited(boxId: string): boolean {
  const now = Date.now();
  const hits = (sendHits.get(boxId) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
  hits.push(now);
  sendHits.set(boxId, hits);
  return hits.length > SEND_MAX_PER_WINDOW;
}

type MemberInviteRow = {
  id: string;
  box_id: string;
  email: string;
  code: string | null;
  status: string;
  full_name: string | null;
  expires_at: string | null;
};

async function loadInvite(id: string): Promise<MemberInviteRow | null> {
  const rows = await db.execute<MemberInviteRow>(sql`
    select id, box_id, email, code, status, full_name, expires_at::text as expires_at from member_invites where id = ${id}
  `);
  return rows.rows[0] ?? null;
}

// Mismo criterio que todayDateKey() (lib/dateUtils.ts): la fecha se
// expresa SIEMPRE en hora de Chile, nunca en la del servidor.
function formatChileDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function buildInviteEmailHtml(boxName: string, code: string, expiresAt: string | null): string {
  const boxNameSafe = escapeHtml(boxName);
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">Te invitaron a ${boxNameSafe} en WODPLACE</h2>
      <p><strong>${boxNameSafe}</strong> te invitó a unirte como alumno.</p>
      <ol style="padding-left: 20px;">
        <li>Abre la app WODPLACE y crea tu cuenta (o inicia sesión si ya tienes una).</li>
        <li>Ve a "Unirse a un box" e ingresa el código de abajo.</li>
        <li>Tu plan queda asignado apenas lo ingreses. Luego acepta los contratos del box para poder reservar clases.</li>
      </ol>
      <p style="font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px; background:#F6F1E8; color:#1a1a1a; padding: 10px; border-radius: 8px; text-align: center;">${escapeHtml(code)}</p>
      ${expiresAt ? `<p style="font-size: 12px; color: #888;">Este código vence el ${escapeHtml(formatChileDate(expiresAt))}.</p>` : ""}
      <p style="font-size: 12px; color: #888; margin-top: 8px;">Si no esperabas esta invitación, ignora este correo.</p>
    </div>
  `;
}

async function emailInvite(invite: MemberInviteRow): Promise<boolean> {
  const boxRows = await db.execute<{ name: string }>(sql`select name from boxes where id = ${invite.box_id}`);
  const boxName = boxRows.rows[0]?.name ?? "WODPLACE";
  const { ok } = await sendEmail({
    to: invite.email,
    subject: `Tienes una invitación para unirte a ${boxName}`,
    html: buildInviteEmailHtml(boxName, invite.code!, invite.expires_at),
    replyTo: "info@wodplace.cl",
  });
  return ok;
}

/** Shared guard for /send and /resend. Writes the 400/401/403/404/429
 *  response itself; callers just check for `null` and return. */
async function authorizeInviteAction(req: Request, res: Response): Promise<MemberInviteRow | null> {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Falta el id de la invitación." });
    return null;
  }
  const invite = await loadInvite(id);
  if (!invite) {
    res.status(404).json({ error: "Invitación no encontrada." });
    return null;
  }
  const userId = req.supabaseUser!.id;
  if (!(await isBoxAdminOrSuperAdmin(userId, invite.box_id))) {
    res.status(403).json({ error: "No tienes permiso para esta invitación." });
    return null;
  }
  if (invite.status !== "pendiente") {
    res.status(400).json({ error: "Esta invitación ya no está pendiente." });
    return null;
  }
  if (isSendRateLimited(invite.box_id)) {
    res.status(429).json({ error: "Demasiados correos enviados. Espera un poco." });
    return null;
  }
  return invite;
}

/**
 * POST /member-invites/:id/send
 *
 * Mails the CURRENT code of a just-created invite — the client-side
 * insert into member_invites never emails anyone by itself.
 */
router.post("/member-invites/:id/send", requireSupabaseUser, async (req: Request, res: Response) => {
  const invite = await authorizeInviteAction(req, res);
  if (!invite) return;

  const emailSent = await emailInvite(invite).catch(() => false);
  res.json(SendMemberInviteEmailResponse.parse({ emailSent }));
});

/**
 * POST /member-invites/:id/resend
 *
 * Regenerates the code (the old one stops working immediately), renews
 * the expiry (30 days from now), and re-emails it.
 */
router.post("/member-invites/:id/resend", requireSupabaseUser, async (req: Request, res: Response) => {
  const invite = await authorizeInviteAction(req, res);
  if (!invite) return;

  const newCode = generateCode();
  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.execute(sql`
    update member_invites set code = ${newCode}, expires_at = ${newExpiresAt} where id = ${invite.id}
  `);

  const emailSent = await emailInvite({ ...invite, code: newCode, expires_at: newExpiresAt }).catch(() => false);
  res.json(ResendMemberInviteResponse.parse({ emailSent }));
});

export default router;
