import type { NextFunction, Request, Response } from "express";

/**
 * WODPLACE has no multi-user auth system. The owner-only admin dashboard
 * (contract PDF management, acceptance notifications) is gated by a single
 * shared access code stored in the ADMIN_ACCESS_CODE secret, sent by the
 * client as the `x-admin-code` header. The dashboard's entry point in the
 * app is now a visible nav item, not a hidden gesture — access control still
 * rests entirely on this shared code.
 */
export function requireAdminCode(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.ADMIN_ACCESS_CODE;
  const provided = req.header("x-admin-code");

  if (!expected) {
    req.log.error("ADMIN_ACCESS_CODE is not configured");
    res.status(500).json({ error: "Admin access is not configured" });
    return;
  }

  if (!provided || provided !== expected) {
    res.status(401).json({ error: "Invalid admin code" });
    return;
  }

  next();
}
