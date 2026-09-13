import { supabase } from "@/integrations/supabase/client";

/**
 * Appends one row to super_admin_audit_log after a sensitive action taken
 * from this panel. Best-effort: a logging failure must never block or roll
 * back the action itself, so callers fire this and don't await failures —
 * see logAudit's own try/catch below.
 *
 * Caveat (documented on the table too): this is a client-attested log, not
 * server-enforced. RLS only grants INSERT + SELECT (to super_admin), never
 * UPDATE/DELETE, so at least existing rows can't be rewritten — but nothing
 * stops a session from skipping the call outright.
 */
export async function logAudit(
  actorEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await supabase.from("super_admin_audit_log").insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      actor_email: actorEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      // jsonb column — Record<string, unknown> is always valid JSON, the
      // generated Json union just isn't structurally that permissive.
      metadata: (metadata ?? null) as never,
    });
    if (error) console.error("[audit-log] insert failed", error);
  } catch (err) {
    console.error("[audit-log] insert threw", err);
  }
}
