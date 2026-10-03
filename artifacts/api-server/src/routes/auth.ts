import { db, wodplaceUsersTable } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { requireSupabaseUser } from "../lib/supabaseAuth";

const router: IRouter = Router();

function makeWodplaceUserId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

const RegisterBody = z.object({
  email: z.string().email(),
  // Aligned to Supabase Auth's own minimum, replacing the mock flow's <4
  // check (see recover-account.tsx, which still guards a device-local
  // password change and is a separate, still-mock-only concern for now).
  password: z.string().min(6),
  name: z.string().min(1),
  birthdate: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

/**
 * POST /auth/register
 *
 * Fase 2 of the real-auth migration: creates a REAL Supabase Auth account
 * for a new athlete (replaces the AsyncStorage-only mock register()).
 * Deliberately creates the account server-side via the admin API
 * (email_confirm: true) rather than having the client call
 * `supabase.auth.signUp()` directly — that would make onboarding friction
 * depend on this Supabase project's email-confirmation setting (a
 * dashboard toggle this deploy doesn't control). Creating it pre-confirmed
 * here keeps registration exactly as frictionless as the mock flow it
 * replaces, regardless of that setting, and needs no Supabase dashboard
 * change to work. The client signs in right after this returns (a normal
 * `signInWithPassword`, which succeeds immediately since the account is
 * already confirmed) to get its real session/JWT.
 *
 * wodplace_users.id is NOT the Supabase Auth id — see the auth_user_id
 * bridge column's own doc comment (schema + Fase 1 migration) for why:
 * every other table's FK stays keyed on this locally-shaped id forever,
 * only the bridge column ties it to the real account.
 */
router.post("/auth/register", async (req: Request, res: Response) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  const { email, password, name, birthdate, phone } = parsed.data;
  const cleanEmail = email.trim().toLowerCase();

  try {
    // Proactive duplicate check — covers BOTH an existing real account and
    // an existing mock-era one (migrating those is Fase 3, not this
    // endpoint's job); either way this is the same friendly message the
    // mock flow already showed for a taken email, never the raw unique
    // constraint violation.
    const [existing] = await db
      .select({ id: wodplaceUsersTable.id })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.email, cleanEmail));
    if (existing) {
      res.status(409).json({ error: "Ya existe una cuenta con ese email." });
      return;
    }

    const admin = getSupabaseAdmin();
    let authUserId: string;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
    });

    if (created?.user) {
      authUserId = created.user.id;
    } else if (createErr?.status === 422 || createErr?.code === "email_exists") {
      // The proactive check above found no wodplace_users row for this
      // email, yet Supabase Auth already has one — a previous registration
      // that created the auth account but died before this endpoint's next
      // step (the wodplace_users insert below). Self-heal by signing in
      // with the password just submitted: if it matches, this really is
      // the same person retrying, so finish creating their bridge row
      // instead of leaving them stuck on a "ya existe" error they can't
      // resolve themselves.
      const { data: signedIn, error: signInErr } = await admin.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInErr || !signedIn.user) {
        res.status(409).json({ error: "Ya existe una cuenta con ese email." });
        return;
      }
      authUserId = signedIn.user.id;
    } else {
      req.log.error({ err: createErr }, "Error creating Supabase Auth user");
      res.status(500).json({ error: "No se pudo crear la cuenta." });
      return;
    }

    // Idempotent: a retry of the self-heal path above could land here twice
    // for the same auth user.
    const [row] = await db
      .insert(wodplaceUsersTable)
      .values({
        id: makeWodplaceUserId(),
        name: name.trim(),
        email: cleanEmail,
        birthdate: birthdate || null,
        phone: phone || null,
        rank: "beginner",
        authUserId,
      })
      // Matches the partial unique index (auth_user_id is unique only
      // where not null — see the Fase 1 migration) — ON CONFLICT's target
      // must include the same predicate for Postgres to infer it.
      .onConflictDoNothing({
        target: wodplaceUsersTable.authUserId,
        where: isNotNull(wodplaceUsersTable.authUserId),
      })
      .returning();

    const finalRow =
      row ??
      (
        await db
          .select()
          .from(wodplaceUsersTable)
          .where(eq(wodplaceUsersTable.authUserId, authUserId))
      )[0];

    res.json({
      id: finalRow.id,
      name: finalRow.name,
      email: finalRow.email,
      avatarUrl: finalRow.avatarUrl,
      rank: finalRow.rank,
      phrase: finalRow.phrase,
      birthdate: finalRow.birthdate,
      phone: finalRow.phone,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error registering real account");
    res.status(500).json({ error: "No se pudo crear la cuenta." });
  }
});

const CompleteProfileBody = z.object({
  name: z.string().min(1),
  birthdate: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

/**
 * POST /auth/complete-profile
 *
 * Fase 5 (Google real login): finishes onboarding for a Supabase Auth
 * identity that already exists (created by Google OAuth, not by
 * /auth/register) but has no wodplace_users row yet — same bridge-row
 * shape /auth/register creates, just without also minting the auth
 * account itself. The client calls this only after GET /users/me 404s for
 * the freshly-established Google session, exactly once per new athlete.
 * Protected by requireSupabaseUser: the id being bridged is always the
 * caller's OWN verified identity, never a client-supplied one.
 */
router.post("/auth/complete-profile", requireSupabaseUser, async (req: Request, res: Response) => {
  const parsed = CompleteProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  const supabaseUser = req.supabaseUser!;
  if (!supabaseUser.email) {
    res.status(400).json({ error: "This account has no email on file." });
    return;
  }
  const { name, birthdate, phone } = parsed.data;
  const cleanEmail = supabaseUser.email.trim().toLowerCase();

  try {
    const [existingByAuthId] = await db
      .select()
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.authUserId, supabaseUser.id));
    if (existingByAuthId) {
      // Already completed (a retry, e.g. a double-tap) — idempotent, just
      // return the existing profile instead of erroring.
      res.json({
        id: existingByAuthId.id,
        name: existingByAuthId.name,
        email: existingByAuthId.email,
        avatarUrl: existingByAuthId.avatarUrl,
        rank: existingByAuthId.rank,
        phrase: existingByAuthId.phrase,
        birthdate: existingByAuthId.birthdate,
        phone: existingByAuthId.phone,
      });
      return;
    }

    // Same duplicate-email guard as /auth/register — covers the edge case
    // where this Google email already has an unrelated (mock-era or real)
    // wodplace_users row under a different identity.
    const [existingByEmail] = await db
      .select({ id: wodplaceUsersTable.id })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.email, cleanEmail));
    if (existingByEmail) {
      res.status(409).json({ error: "Ya existe una cuenta con ese email." });
      return;
    }

    const [row] = await db
      .insert(wodplaceUsersTable)
      .values({
        id: makeWodplaceUserId(),
        name: name.trim(),
        email: cleanEmail,
        birthdate: birthdate || null,
        phone: phone || null,
        rank: "beginner",
        authUserId: supabaseUser.id,
      })
      .onConflictDoNothing({
        target: wodplaceUsersTable.authUserId,
        where: isNotNull(wodplaceUsersTable.authUserId),
      })
      .returning();

    const finalRow =
      row ??
      (
        await db
          .select()
          .from(wodplaceUsersTable)
          .where(eq(wodplaceUsersTable.authUserId, supabaseUser.id))
      )[0];

    res.json({
      id: finalRow.id,
      name: finalRow.name,
      email: finalRow.email,
      avatarUrl: finalRow.avatarUrl,
      rank: finalRow.rank,
      phrase: finalRow.phrase,
      birthdate: finalRow.birthdate,
      phone: finalRow.phone,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error completing Google profile");
    res.status(500).json({ error: "No se pudo completar el perfil." });
  }
});

/**
 * GET /auth/mode?email=...
 *
 * Tells the client which login path to use for an email: a real Supabase
 * Auth account (`login()` should call `signInWithPassword`), a mock-era
 * one (`login()` uses the local AsyncStorage flow, unchanged), or none at
 * all. Also replaces the old fully-local `checkEmailExists()` — this one
 * actually sees accounts created on a different device, which the mock
 * flow never could (the whole reason the old account-recovery system
 * existed, before real auth made it obsolete — see Fase 6's removal).
 */
router.get("/auth/mode", async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();

  try {
    const [row] = await db
      .select({ authUserId: wodplaceUsersTable.authUserId })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.email, email));

    const mode = !row ? "none" : row.authUserId ? "real" : "mock";
    res.json({ mode });
  } catch (error) {
    req.log.error({ err: error }, "Error resolving auth mode");
    res.status(500).json({ error: "Failed to resolve auth mode" });
  }
});

/**
 * GET /auth/whoami
 *
 * Proof-of-concept for Fase 1 of the real-auth migration — proves the full
 * pipeline end-to-end (wodplace's Supabase client -> JWT -> requireSupabaseUser
 * -> real identity, cross-checked against wodplace_users.auth_user_id) works,
 * without any existing endpoint depending on it yet. Not used by the app.
 */
router.get("/auth/whoami", requireSupabaseUser, async (req: Request, res: Response) => {
  const supabaseUser = req.supabaseUser!;
  try {
    const [wodplaceUser] = await db
      .select({ id: wodplaceUsersTable.id, name: wodplaceUsersTable.name, email: wodplaceUsersTable.email })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.authUserId, supabaseUser.id));

    res.json({
      supabaseUserId: supabaseUser.id,
      supabaseEmail: supabaseUser.email,
      wodplaceUser: wodplaceUser ?? null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error resolving whoami");
    res.status(500).json({ error: "Failed to resolve identity" });
  }
});

export default router;
