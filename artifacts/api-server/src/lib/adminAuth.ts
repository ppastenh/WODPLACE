import type { NextFunction, Request, Response } from "express";

import { verifyAdminToken } from "./adminToken";

/**
 * Extracts and verifies the admin session token from the `Authorization:
 * Bearer <token>` header. Returns the decoded session (`{ userId }`) or null.
 * Replaces the old single shared ADMIN_ACCESS_CODE header check: the client
 * now obtains a short-lived token from the per-account PIN flow (`/admin/pin/*`).
 */
export function getAdminSession(req: Request): { userId: string } | null {
  const header = req.header("authorization") ?? "";
  const token = /^bearer /i.test(header) ? header.slice(7).trim() : "";
  return verifyAdminToken(token);
}

/** True when the request carries a valid admin session token. */
export function isAdminRequest(req: Request): boolean {
  return getAdminSession(req) !== null;
}

/** Express guard that 401s unless the request carries a valid admin session. */
export function requireAdminSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!getAdminSession(req)) {
    res.status(401).json({ error: "Invalid or expired admin session" });
    return;
  }

  next();
}
