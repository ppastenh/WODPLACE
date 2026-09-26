import { supabase } from "@/integrations/supabase/client";

/**
 * Same period math as api-server's POST /bookings and GET
 * /box-memberships/my-plans: period = [next_payment_at - duration_days,
 * next_payment_at). Used here so the admin-side booking flows (BookClassSheet,
 * class-detail's AddParticipant) — which write class_bookings directly via
 * Supabase and never go through that endpoint — can warn before silently
 * bypassing the same limit the athlete's own app enforces.
 *
 * Returns null when no limit applies (no plan/period data yet, or the plan's
 * classes_per_period is null = unlimited) — same convention as those two
 * endpoints returning classesRemaining: null in those cases.
 */
export async function checkPlanLimit(params: {
  boxId: string;
  userId: string;
}): Promise<{ used: number; cap: number } | null> {
  const { data: member } = await supabase
    .from("box_members")
    .select("plan_id, next_payment_at")
    .eq("box_id", params.boxId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (!member?.plan_id || !member.next_payment_at) return null;

  const { data: plan } = await supabase
    .from("plans")
    .select("classes_per_period, duration_days")
    .eq("id", member.plan_id)
    .maybeSingle();

  if (!plan || plan.classes_per_period == null || plan.duration_days == null) return null;

  const periodEnd = new Date(`${member.next_payment_at}T00:00:00`);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - plan.duration_days);

  // No FK between class_bookings.session_id and class_sessions.id (see
  // wodplace_admin_panel_port.sql), so PostgREST can't embed one from the
  // other — resolve it as two plain queries instead, same pattern
  // BookClassSheet already uses to correlate the two tables.
  const { data: bookings } = await supabase
    .from("class_bookings")
    .select("session_id")
    .eq("user_id", params.userId)
    .eq("status", "inscrito");
  const sessionIds = (bookings ?? []).map((b) => b.session_id);
  if (sessionIds.length === 0) return { used: 0, cap: plan.classes_per_period };

  const { count } = await supabase
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .in("id", sessionIds)
    .gte("session_date", periodStart.toISOString().slice(0, 10))
    .lt("session_date", member.next_payment_at);

  return { used: count ?? 0, cap: plan.classes_per_period };
}
