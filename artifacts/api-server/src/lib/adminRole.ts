import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Bridges a wodplace_users email to the real admin roles Supabase Auth
 * knows about. wodplace's athlete accounts live in a separate identity
 * space (a locally-generated mock id, no Supabase Auth session at all) —
 * email is the only thing the two sides share, so every lookup here goes
 * through `profiles`/`user_roles` by (lowercased) email, never by id.
 */

export type AdminRole = "box_admin" | "super_admin";

type AdminRoleRow = {
  email: string;
  role: AdminRole;
};

/**
 * Raw (email, role) rows for every admin role tied to this email. One email
 * can carry more than one row — e.g. the platform owner also listed as the
 * current (only) box's box_admin — callers decide how to collapse that.
 */
async function findAdminRoleRows(email: string): Promise<AdminRoleRow[]> {
  const result = await db.execute<AdminRoleRow>(sql`
    SELECT p.email, ur.role
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE lower(p.email) = lower(${email})
      AND p.email IS NOT NULL
      AND ur.role IN ('box_admin', 'super_admin')
  `);
  return result.rows;
}

/**
 * Every distinct admin role this email holds (e.g. both box_admin and
 * super_admin — the real case for the platform owner, who is also her own
 * box's box_admin). Empty array means no admin role at all. Order is not
 * significant; callers needing precedence use resolveAdminRoleForEmail.
 */
export async function resolveAdminRoles(email: string): Promise<AdminRole[]> {
  const rows = await findAdminRoleRows(email);
  return Array.from(new Set(rows.map((r) => r.role)));
}

/**
 * The highest-privilege admin role for this email, or null if it has none.
 * super_admin wins whenever an account holds both roles — she IS the other
 * party to the platform agreement (WODPLACE itself), not someone who
 * accepts it. Use resolveAdminRoles instead where an account's *other*
 * roles also matter (e.g. choosing between the box and super-admin panels).
 */
export async function resolveAdminRoleForEmail(
  email: string,
): Promise<AdminRole | null> {
  const roles = await resolveAdminRoles(email);
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("box_admin")) return "box_admin";
  return null;
}

/**
 * Distinct real Supabase Auth email(s) this wodplace email resolves to,
 * regardless of which role(s) it carries. Used by the dashboard auto-login
 * link, which needs an unambiguous single email to mint a magic link for —
 * a role is irrelevant there, only "is there exactly one real account".
 */
export async function findDistinctAdminEmails(email: string): Promise<string[]> {
  const rows = await findAdminRoleRows(email);
  return Array.from(new Set(rows.map((r) => r.email)));
}
