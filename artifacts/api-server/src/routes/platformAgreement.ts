import crypto from "node:crypto";

import {
  boxCreationAuthorizationsTable,
  db,
  platformAgreementAcceptanceHistoryTable,
  platformAgreementAcceptancesTable,
  platformAgreementDocumentTable,
  platformAgreementDocumentVersionsTable,
  wodplaceUsersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { resolveAdminRoles, type AdminRole } from "../lib/adminRole";
import { resolveBoxIdForWodplaceUserId } from "../lib/boxContext";
import { ensurePlatformAgreementDocument } from "../lib/contractDocuments";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { assertOwnsAccount, resolveSupabaseUser } from "../lib/supabaseAuth";
import { isSuperAdminAuthorized } from "../lib/aal2Enforcement";

const PLATFORM_AGREEMENT_BUCKET = "wodplace-uploads";

const router: IRouter = Router();

interface BoxSummary {
  id: string;
  name: string;
  status: string;
  /** true once owner_name/location/contact_phone are all set — see the
   *  "Datos del Box" screen (POST /platform-agreement/box-details). Social
   *  links are optional and don't factor in here. */
  detailsComplete: boolean;
  /** true once, right when status flips to 'activo' and the one-time
   *  welcome popup hasn't been shown yet (see POST .../box-welcome-shown,
   *  which flips this back to false for good). */
  showWelcome: boolean;
  // Current values, included so "Datos del Box" can prefill instead of
  // starting blank every time this account revisits it (e.g. to add social
  // links later, after already filling the required fields once).
  ownerName: string | null;
  location: string | null;
  contactPhone: string | null;
  whatsapp: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
}

interface PlatformAgreementStatus {
  roles: AdminRole[];
  accepted: boolean;
  acceptedAt: string | null;
  document: { slug: string; title: string; objectPath: string | null; currentVersionId: string | null } | null;
  /** true si esta cuenta ya aceptó alguna vez una versión ANTERIOR del
   *  Acuerdo (archivada en platform_agreement_acceptance_history) -- deja
   *  que la pantalla diga "hay una versión nueva" en vez de sonar a
   *  primera vez. */
  previouslyAccepted: boolean;
  /** null for a super_admin-only account (no box of their own to manage
   *  here) — otherwise this box_admin's box. */
  box: BoxSummary | null;
  /**
   * Only meaningful when `roles` is empty — whether this email is
   * pre-authorized to use "Crear mi Box" (box_creation_authorizations, see
   * checkBoxCreationAuthorization below). Drives whether that nav item
   * shows up at all (lib/navigation.ts's getAdminNavItem); always false
   * once an account already has any admin role, since the item wouldn't be
   * shown to them anyway.
   */
  boxCreationAuthorized: boolean;
}

async function loadBoxSummary(boxId: string): Promise<BoxSummary | null> {
  const rows = await db.execute<{
    id: string;
    name: string;
    status: string;
    owner_name: string | null;
    location: string | null;
    contact_phone: string | null;
    whatsapp: string | null;
    instagram_url: string | null;
    facebook_url: string | null;
    tiktok_url: string | null;
    welcome_shown_at: string | null;
  }>(sql`
    SELECT id, name, status, owner_name, location, contact_phone,
           whatsapp, instagram_url, facebook_url, tiktok_url, welcome_shown_at
    FROM public.boxes
    WHERE id = ${boxId}
  `);
  const row = rows.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    detailsComplete: !!(row.owner_name && row.location && row.contact_phone),
    showWelcome: row.status === "activo" && !row.welcome_shown_at,
    ownerName: row.owner_name,
    location: row.location,
    contactPhone: row.contact_phone,
    whatsapp: row.whatsapp,
    instagramUrl: row.instagram_url,
    facebookUrl: row.facebook_url,
    tiktokUrl: row.tiktok_url,
  };
}

/**
 * Resolves everything the app needs to decide what to show in place of the
 * "Administrador" nav item for `userId`: every real admin role this account
 * holds (via the email bridge — see lib/adminRole.ts; an account can hold
 * both box_admin and super_admin, e.g. the platform owner in her own box)
 * and whether the platform agreement is satisfied. super_admin is exempt
 * outright — they're the other party to the agreement (WODPLACE itself),
 * not someone who accepts it.
 */
async function loadStatus(userId: string, callerAal: string | null): Promise<PlatformAgreementStatus> {
  const [appUser] = await db
    .select({ email: wodplaceUsersTable.email })
    .from(wodplaceUsersTable)
    .where(eq(wodplaceUsersTable.id, userId));

  const roles = appUser ? await resolveAdminRoles(appUser.email) : [];
  if (roles.length === 0) {
    const boxCreationAuthorized = appUser
      ? (await checkBoxCreationAuthorization(appUser.email)) === "authorized"
      : false;
    return {
      roles: [],
      accepted: false,
      acceptedAt: null,
      document: null,
      previouslyAccepted: false,
      box: null,
      boxCreationAuthorized,
    };
  }

  // A pure coach (no box_admin/super_admin) never accepts the platform
  // agreement at all — it's between WODPLACE and the box's OWNER, not staff
  // the owner hires. Checked before any of the box_admin/super_admin-only
  // data below is fetched, since none of it applies to a coach.
  if (roles.includes("coach") && !roles.includes("box_admin") && !roles.includes("super_admin")) {
    return {
      roles,
      accepted: true,
      acceptedAt: null,
      document: null,
      previouslyAccepted: false,
      box: null,
      boxCreationAuthorized: false,
    };
  }

  const boxId = await resolveBoxIdForWodplaceUserId(userId);
  const box = roles.includes("box_admin") ? await loadBoxSummary(boxId) : null;
  await ensurePlatformAgreementDocument();
  const [doc] = await db
    .select({
      title: platformAgreementDocumentTable.title,
      objectPath: platformAgreementDocumentTable.objectPath,
      currentVersionId: platformAgreementDocumentTable.currentVersionId,
    })
    .from(platformAgreementDocumentTable);
  const document = doc ? { slug: "platform-agreement", ...doc } : null;

  const [historyRow] = await db
    .select({ id: platformAgreementAcceptanceHistoryTable.id })
    .from(platformAgreementAcceptanceHistoryTable)
    .where(eq(platformAgreementAcceptanceHistoryTable.userId, userId))
    .limit(1);
  const previouslyAccepted = !!historyRow;

  if (roles.includes("super_admin") && (await isSuperAdminAuthorized(callerAal))) {
    return { roles, accepted: true, acceptedAt: null, document, previouslyAccepted, box, boxCreationAuthorized: false };
  }

  const [acceptance] = await db
    .select()
    .from(platformAgreementAcceptancesTable)
    .where(eq(platformAgreementAcceptancesTable.userId, userId));

  return {
    roles,
    accepted: !!acceptance,
    acceptedAt: acceptance?.acceptedAt?.toISOString() ?? null,
    document,
    previouslyAccepted,
    box,
    boxCreationAuthorized: false,
  };
}

/**
 * GET /platform-agreement?userId=...
 *
 * Drives the "Administrador" nav item: no roles -> hide it entirely,
 * box_admin without acceptance -> show "Acuerdo de Plataforma" instead,
 * anything else -> show "Administrador" as normal (offering a panel picker
 * client-side when roles has more than one entry).
 */
router.get("/platform-agreement", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const callerAal = (await resolveSupabaseUser(req))?.aal ?? null;
    res.json(await loadStatus(userId, callerAal));
  } catch (error) {
    req.log.error({ err: error }, "Error loading platform agreement status");
    res.status(500).json({ error: "Failed to load platform agreement status" });
  }
});

/**
 * POST /platform-agreement/accept  { userId, documentVersionId }
 *
 * Re-verifies the role server-side rather than trusting the client — only a
 * box_admin has anything to accept here (super_admin is already exempt; a
 * non-admin has no business calling this at all). `documentVersionId` must
 * match the CURRENT version (2026-10-19) — the client only ever sends the
 * version it actually displayed; if the document was replaced in the
 * meantime this 409s instead of silently recording acceptance of a text
 * nobody actually read.
 */
const AcceptBody = z.object({ userId: z.string().min(1), documentVersionId: z.string().min(1) });

router.post("/platform-agreement/accept", async (req: Request, res: Response) => {
  const parsed = AcceptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const { userId, documentVersionId } = parsed.data;
    const callerAal = (await resolveSupabaseUser(req))?.aal ?? null;
    const [appUser] = await db
      .select({ email: wodplaceUsersTable.email })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.id, userId));

    const roles = appUser ? await resolveAdminRoles(appUser.email) : [];
    if (roles.length === 0) {
      res.status(403).json({ error: "This account has no admin role to accept an agreement for" });
      return;
    }

    if (roles.includes("super_admin") && (await isSuperAdminAuthorized(callerAal))) {
      res.json(await loadStatus(userId, callerAal));
      return;
    }

    await ensurePlatformAgreementDocument();
    const [doc] = await db
      .select({ currentVersionId: platformAgreementDocumentTable.currentVersionId })
      .from(platformAgreementDocumentTable);
    if (!doc?.currentVersionId || doc.currentVersionId !== documentVersionId) {
      res.status(409).json({
        code: "AGREEMENT_VERSION_STALE",
        error: "Esta versión del Acuerdo de Plataforma ya no está vigente. Recarga la pantalla y revisa el texto actual antes de aceptar.",
      });
      return;
    }

    const [version] = await db
      .select({ sha256: platformAgreementDocumentVersionsTable.sha256 })
      .from(platformAgreementDocumentVersionsTable)
      .where(eq(platformAgreementDocumentVersionsTable.id, documentVersionId));

    const boxId = await resolveBoxIdForWodplaceUserId(userId);
    await db
      .insert(platformAgreementAcceptancesTable)
      .values({
        userId,
        boxId,
        acceptedAt: new Date(),
        documentVersionId,
        textSha256: version?.sha256 ?? null,
      })
      .onConflictDoUpdate({
        target: platformAgreementAcceptancesTable.userId,
        set: { acceptedAt: new Date(), boxId, documentVersionId, textSha256: version?.sha256 ?? null },
      });

    res.json(await loadStatus(userId, callerAal));
  } catch (error) {
    req.log.error({ err: error }, "Error accepting platform agreement");
    res.status(500).json({ error: "Failed to accept platform agreement" });
  }
});

/**
 * POST /platform-agreement/document
 *   { objectPath, fileName, mimeType, isMinorCorrection, changeReason }
 *
 * Reemplaza la versión vigente del Acuerdo de Plataforma. Solo super_admin,
 * y SIEMPRE con aal2 -- a propósito, independiente de
 * app_settings.require_aal2_for_super_admin (ese interruptor es para la
 * EXENCIÓN de aceptar el Acuerdo; esta ruta modifica el texto legal que
 * todos los dueños de box aceptan, así que exige el factor real sin
 * excepción, nunca isSuperAdminAuthorized()).
 *
 * El hash SHA-256 se calcula AQUÍ, descargando el archivo que el cliente ya
 * subió a Storage con `objectPath` -- nunca un valor mandado por el
 * navegador. `replace_platform_agreement_document` (Postgres, SECURITY
 * DEFINER, EXECUTE solo para service_role) bloquea la fila del documento
 * (FOR UPDATE) mientras corre, así dos reemplazos a la vez quedan en fila
 * en vez de pisarse el número de versión.
 */
const ReplaceDocumentBody = z.object({
  userId: z.string().min(1),
  objectPath: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  isMinorCorrection: z.boolean(),
  changeReason: z.string().min(1).max(500),
});

router.post("/platform-agreement/document", async (req: Request, res: Response) => {
  const parsed = ReplaceDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;

  try {
    const supabaseUser = await resolveSupabaseUser(req);
    const callerAal = supabaseUser?.aal ?? null;
    const [appUser] = await db
      .select({ email: wodplaceUsersTable.email })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.id, parsed.data.userId));
    const roles = appUser ? await resolveAdminRoles(appUser.email) : [];

    if (!roles.includes("super_admin")) {
      res.status(403).json({ error: "Solo super_admin puede reemplazar el Acuerdo de Plataforma." });
      return;
    }
    if (callerAal !== "aal2") {
      res.status(403).json({
        error: "Esta acción exige el segundo factor verificado (aal2), sin excepción.",
      });
      return;
    }

    const { objectPath, fileName, mimeType, isMinorCorrection, changeReason } = parsed.data;

    const download = await getSupabaseAdmin().storage
      .from(PLATFORM_AGREEMENT_BUCKET)
      .download(objectPath);
    if (download.error || !download.data) {
      res.status(400).json({ error: "No se pudo leer el archivo recién subido para calcular su huella." });
      return;
    }
    const bytes = Buffer.from(await download.data.arrayBuffer());
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

    const execResult = await db.execute<{ id: string }>(sql`
      select replace_platform_agreement_document(
        ${objectPath}, ${fileName}, ${mimeType}, ${sha256},
        ${isMinorCorrection}, ${changeReason}, ${appUser!.email}
      ) as id
    `);
    const newVersionId = execResult.rows[0]?.id;

    res.json({ versionId: newVersionId, sha256 });
  } catch (error) {
    req.log.error({ err: error }, "Error replacing platform agreement document");
    res.status(500).json({ error: "Failed to replace platform agreement document" });
  }
});

type BoxCreationAuthStatus = "authorized" | "not_authorized" | "revoked" | "already_used";

/**
 * Looks up the pre-authorization gate for "Crear mi Box" (see the route
 * doc comment below) — a super_admin must add this email from their own
 * panel before it's allowed to self-serve a box. Case-insensitive: emails
 * are stored lowercased by the super-admin UI, but this also lower()s both
 * sides defensively, same convention as every other email bridge here.
 */
async function checkBoxCreationAuthorization(email: string): Promise<BoxCreationAuthStatus> {
  const [row] = await db
    .select()
    .from(boxCreationAuthorizationsTable)
    .where(sql`lower(${boxCreationAuthorizationsTable.email}) = lower(${email})`);
  if (!row) return "not_authorized";
  if (row.revokedAt) return "revoked";
  if (row.usedAt) return "already_used";
  return "authorized";
}

/**
 * GET /platform-agreement/box-authorization-status?userId=...
 *
 * The "Crear mi Box" screen calls this on mount to decide whether to show
 * the form or the "you need WODPLACE to authorize you first" message —
 * checking upfront instead of letting them fill out the form and only then
 * finding out from a 403.
 */
router.get("/platform-agreement/box-authorization-status", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const [appUser] = await db
      .select({ email: wodplaceUsersTable.email })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.id, userId));
    if (!appUser?.email) {
      res.json({ authorized: false });
      return;
    }
    const status = await checkBoxCreationAuthorization(appUser.email);
    res.json({ authorized: status === "authorized" });
  } catch (error) {
    req.log.error({ err: error }, "Error checking box creation authorization");
    res.status(500).json({ error: "Failed to check authorization status" });
  }
});

/**
 * POST /platform-agreement/create-box  { userId, boxName }
 *
 * "Crear mi Box" — the self-service bootstrap for a brand-new box_admin.
 * Unlike every other /admin/* route, the caller is NOT an admin yet (that's
 * the whole point), so this takes no admin session; the only proof of
 * identity is `userId` (a wodplace_users.id), same trust level as the rest
 * of wodplace's mock-auth surface.
 *
 * What it does, in order:
 *   0. Refuses unless this email has been pre-authorized by a super_admin
 *      (box_creation_authorizations — see checkBoxCreationAuthorization
 *      above) — this is NOT open self-service; a super_admin has to add
 *      the email first from their own panel.
 *   1. Refuses if this email already carries ANY admin role (box_admin or
 *      super_admin) — one box request per identity.
 *   2. Reuses an existing Supabase Auth account for this email if one
 *      already exists (`profiles` row), otherwise creates one via the Admin
 *      API (`email_confirm: true`, no password set — this account is only
 *      ever accessed through the mobile app's magic-link dash-link flow,
 *      never a direct box-admin browser login, so a password is never
 *      needed for the onboarding loop to work).
 *   3. Inserts the `boxes` row with status='pendiente' and this new/found
 *      account as `owner_user_id` — `name` is the only other field
 *      collected here; location/contact/social/encargado are filled in
 *      later by the "Datos del Box" screen, once this account already has
 *      the box_admin role and can reach it through the normal admin flow.
 *   4. Grants `user_roles` (role: box_admin, box_id: the new box) — this is
 *      what makes "Administrador" (then "Acuerdo de Plataforma") appear for
 *      this account from here on, per loadStatus() above.
 *   5. Marks the authorization row used_at=now(), blocking reuse.
 * Steps 3-5 run in one transaction; the Supabase Auth account (step 2) is
 * an external side effect that can't be rolled back, but leaving an unused
 * auth account behind on a rare failure is harmless.
 */
const CreateBoxBody = z.object({
  userId: z.string().min(1),
  boxName: z.string().trim().min(2).max(120),
});

router.post("/platform-agreement/create-box", async (req: Request, res: Response) => {
  const parsed = CreateBoxBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const { userId, boxName } = parsed.data;
    const [appUser] = await db
      .select({ email: wodplaceUsersTable.email })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.id, userId));
    if (!appUser?.email) {
      res.status(404).json({ error: "Unknown account" });
      return;
    }
    const email = appUser.email;

    const authStatus = await checkBoxCreationAuthorization(email);
    if (authStatus !== "authorized") {
      res.status(403).json({ error: "This email has not been authorized to create a box", reason: authStatus });
      return;
    }

    const existingRoles = await resolveAdminRoles(email);
    if (existingRoles.length > 0) {
      res.status(409).json({ error: "This account already has an admin role" });
      return;
    }

    const existingProfile = await db.execute<{ id: string }>(sql`
      SELECT id FROM public.profiles WHERE lower(email) = lower(${email}) LIMIT 1
    `);

    let ownerUserId = existingProfile.rows[0]?.id;
    if (!ownerUserId) {
      const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (error || !data?.user) {
        req.log.error({ err: error, email }, "[create-box] Failed to provision Supabase Auth account");
        res.status(502).json({ error: "Could not create the admin account" });
        return;
      }
      ownerUserId = data.user.id;
    }

    const boxId = await db.transaction(async (tx) => {
      const inserted = await tx.execute<{ id: string }>(sql`
        INSERT INTO public.boxes (name, status, owner_user_id)
        VALUES (${boxName}, 'pendiente', ${ownerUserId})
        RETURNING id
      `);
      const newBoxId = inserted.rows[0]?.id;
      if (!newBoxId) throw new Error("Insert into boxes returned no id");

      await tx.execute(sql`
        INSERT INTO public.user_roles (user_id, role, box_id)
        VALUES (${ownerUserId}, 'box_admin', ${newBoxId})
      `);

      await tx
        .update(boxCreationAuthorizationsTable)
        .set({ usedAt: new Date() })
        .where(sql`lower(${boxCreationAuthorizationsTable.email}) = lower(${email})`);

      return newBoxId;
    });

    req.log.info({ userId, email, boxId }, "[create-box] New pending box + box_admin role created");
    res.json({ boxId });
  } catch (error) {
    req.log.error({ err: error }, "Error creating box");
    res.status(500).json({ error: "Failed to create box" });
  }
});

/**
 * POST /platform-agreement/box-details
 *
 * "Datos del Box" — filled in right after PIN setup, once this account
 * already has the box_admin role (from /create-box or from a super_admin's
 * "Otorgar permiso"). Nombre/Encargado/Ubicación/Contacto are required (this
 * is what flips BoxSummary.detailsComplete to true); social links are
 * optional and can be added later. Does NOT touch `boxes.status` — approval
 * is still a separate, super_admin-only step in Boxes.
 */
const BoxDetailsBody = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(200),
  contactPhone: z.string().trim().min(6).max(30),
  whatsapp: z.string().trim().max(30).optional(),
  instagramUrl: z.string().trim().max(300).optional(),
  facebookUrl: z.string().trim().max(300).optional(),
  tiktokUrl: z.string().trim().max(300).optional(),
});

router.post("/platform-agreement/box-details", async (req: Request, res: Response) => {
  const parsed = BoxDetailsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const { userId, name, ownerName, location, contactPhone, whatsapp, instagramUrl, facebookUrl, tiktokUrl } =
      parsed.data;
    const [appUser] = await db
      .select({ email: wodplaceUsersTable.email })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.id, userId));
    if (!appUser?.email) {
      res.status(404).json({ error: "Unknown account" });
      return;
    }

    const roles = await resolveAdminRoles(appUser.email);
    if (!roles.includes("box_admin")) {
      res.status(403).json({ error: "This account is not a box_admin" });
      return;
    }

    const boxId = await resolveBoxIdForWodplaceUserId(userId);
    await db.execute(sql`
      UPDATE public.boxes
      SET
        name = ${name},
        owner_name = ${ownerName},
        location = ${location},
        contact_phone = ${contactPhone},
        whatsapp = ${whatsapp || null},
        instagram_url = ${instagramUrl || null},
        facebook_url = ${facebookUrl || null},
        tiktok_url = ${tiktokUrl || null},
        updated_at = now()
      WHERE id = ${boxId}
    `);

    res.json(await loadStatus(userId, (await resolveSupabaseUser(req))?.aal ?? null));
  } catch (error) {
    req.log.error({ err: error }, "Error saving box details");
    res.status(500).json({ error: "Failed to save box details" });
  }
});

/**
 * POST /platform-agreement/box-welcome-shown  { userId }
 *
 * Called right when wodplace's Home screen displays the one-time "your box
 * is approved" popup — flips BoxSummary.showWelcome to false for good, a
 * durable server-side flag (not local device storage) so it stays correct
 * across reinstalls or a different device.
 */
const BoxWelcomeShownBody = z.object({ userId: z.string().min(1) });

router.post("/platform-agreement/box-welcome-shown", async (req: Request, res: Response) => {
  const parsed = BoxWelcomeShownBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const { userId } = parsed.data;
    const boxId = await resolveBoxIdForWodplaceUserId(userId);
    await db.execute(sql`
      UPDATE public.boxes SET welcome_shown_at = now() WHERE id = ${boxId}
    `);
    res.json(await loadStatus(userId, (await resolveSupabaseUser(req))?.aal ?? null));
  } catch (error) {
    req.log.error({ err: error }, "Error marking box welcome as shown");
    res.status(500).json({ error: "Failed to mark welcome as shown" });
  }
});

export default router;
