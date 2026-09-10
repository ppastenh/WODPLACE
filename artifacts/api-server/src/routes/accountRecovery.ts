import { randomInt } from "node:crypto";

import { accountRecoveryCodesTable, db, wodplaceUsersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { sendRecoveryCodeEmail } from "../lib/accountRecovery";
import { hashPin, verifyPin } from "../lib/pinHash";

const router: IRouter = Router();

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * POST /account-recovery/request  { email }
 *
 * wodplace has no real auth — a phone that lost its local id (reinstall /
 * cleared data) can't log back in even with the right password. This emails
 * a one-time 6-digit code to the address on file; /verify then returns the
 * existing wodplace_users.id to re-adopt.
 *
 * Always answers `{ sent: true }` regardless of whether the email is
 * registered or the mail actually went out, so it can't be used to probe
 * which emails have accounts.
 */
const RequestBody = z.object({ email: z.string().email() });

router.post("/account-recovery/request", async (req: Request, res: Response) => {
  const parsed = RequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email inválido" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();

  try {
    const [user] = await db
      .select({ id: wodplaceUsersTable.id, name: wodplaceUsersTable.name })
      .from(wodplaceUsersTable)
      .where(sql`lower(${wodplaceUsersTable.email}) = ${email}`);

    if (user) {
      const [existing] = await db
        .select()
        .from(accountRecoveryCodesTable)
        .where(eq(accountRecoveryCodesTable.userId, user.id));

      const recentlySent =
        existing && Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS;

      if (!recentlySent) {
        const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
        const codeHash = hashPin(code);
        const expiresAt = new Date(Date.now() + CODE_TTL_MS);
        await db
          .insert(accountRecoveryCodesTable)
          .values({ userId: user.id, codeHash, expiresAt, attempts: 0, lockedUntil: null })
          .onConflictDoUpdate({
            target: accountRecoveryCodesTable.userId,
            set: { codeHash, expiresAt, attempts: 0, lockedUntil: null, createdAt: new Date() },
          });
        await sendRecoveryCodeEmail({ to: email, code, name: user.name });
      }
    }

    res.json({ sent: true });
  } catch (error) {
    req.log.error({ err: error }, "Error requesting account recovery code");
    res.status(500).json({ error: "No se pudo procesar la solicitud" });
  }
});

/**
 * POST /account-recovery/verify  { email, code }
 *
 * On the right code: deletes the row (single use) and returns the account's
 * server-side profile so the phone can rebuild its local user pointing at
 * the real id.
 */
const VerifyBody = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

router.post("/account-recovery/verify", async (req: Request, res: Response) => {
  const parsed = VerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Código inválido" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const { code } = parsed.data;

  try {
    const [user] = await db
      .select({
        id: wodplaceUsersTable.id,
        name: wodplaceUsersTable.name,
        email: wodplaceUsersTable.email,
        avatarUrl: wodplaceUsersTable.avatarUrl,
        rank: wodplaceUsersTable.rank,
        phrase: wodplaceUsersTable.phrase,
      })
      .from(wodplaceUsersTable)
      .where(sql`lower(${wodplaceUsersTable.email}) = ${email}`);

    const [row] = user
      ? await db
          .select()
          .from(accountRecoveryCodesTable)
          .where(eq(accountRecoveryCodesTable.userId, user.id))
      : [];

    if (!user || !row) {
      res.status(401).json({ error: "Código incorrecto o vencido" });
      return;
    }

    if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
      res.status(423).json({
        error: "Demasiados intentos. Probá de nuevo más tarde.",
        lockedUntil: row.lockedUntil.toISOString(),
      });
      return;
    }

    if (row.expiresAt.getTime() < Date.now()) {
      await db
        .delete(accountRecoveryCodesTable)
        .where(eq(accountRecoveryCodesTable.userId, user.id));
      res.status(401).json({ error: "El código venció. Pedí uno nuevo." });
      return;
    }

    if (!verifyPin(code, row.codeHash)) {
      const attempts = row.attempts + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await db
        .update(accountRecoveryCodesTable)
        .set({
          attempts,
          lockedUntil: locked ? new Date(Date.now() + LOCK_MS) : null,
        })
        .where(eq(accountRecoveryCodesTable.userId, user.id));
      res.status(401).json({
        error: "Código incorrecto",
        remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts),
        ...(locked ? { lockedUntil: new Date(Date.now() + LOCK_MS).toISOString() } : {}),
      });
      return;
    }

    // Correct — single use.
    await db
      .delete(accountRecoveryCodesTable)
      .where(eq(accountRecoveryCodesTable.userId, user.id));

    res.json({
      userId: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      rank: user.rank,
      phrase: user.phrase,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error verifying account recovery code");
    res.status(500).json({ error: "No se pudo verificar el código" });
  }
});

export default router;
