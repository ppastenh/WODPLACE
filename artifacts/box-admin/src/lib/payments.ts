import { supabase } from "@/integrations/supabase/client";

/**
 * Next due date after a payment: extends from the CURRENT due date when it's
 * still in the future (paying early doesn't lose paid-for time), otherwise
 * resets from the payment date (a lapsed/first-time member starts fresh).
 */
export function computeNextPaymentAt(
  currentNextPaymentAt: string | null,
  fromDate: Date,
  durationDays: number,
): string {
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const current = currentNextPaymentAt ? new Date(`${currentNextPaymentAt}T00:00:00`) : null;
  const base = current && current.getTime() > from.getTime() ? current : from;
  const result = new Date(base);
  result.setDate(result.getDate() + durationDays);
  return result.toISOString().slice(0, 10);
}

/**
 * Registers a payment and, when it's marked "pagado" with a plan attached,
 * advances that member's box_members.next_payment_at — the single write
 * path both Finanzas' "Registrar pago" dialog and a member's "Renovar"
 * button go through, so the renewal math only lives in one place.
 *
 * A "pendiente" payment (not yet paid) never touches next_payment_at —
 * only a confirmed payment renews the period.
 */
export async function registerPayment(params: {
  boxId: string;
  userId: string;
  planId: string | null;
  amount: number;
  method: string;
  status: "pagado" | "pendiente";
}): Promise<void> {
  const isPaid = params.status === "pagado";
  const paidAt = isPaid ? new Date() : null;
  let nextPaymentAt: string | null = null;

  if (isPaid && params.planId) {
    const [{ data: plan }, { data: member }, { data: lastPayment }] = await Promise.all([
      supabase.from("plans").select("duration_days").eq("id", params.planId).single(),
      supabase
        .from("box_members")
        .select("next_payment_at")
        .eq("box_id", params.boxId)
        .eq("user_id", params.userId)
        .single(),
      supabase
        .from("payments")
        .select("plan_id")
        .eq("box_id", params.boxId)
        .eq("user_id", params.userId)
        .eq("status", "pagado")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (plan) {
      // A payment for a DIFFERENT plan than the member's last paid one is a
      // plan change, not a renewal — reset from today rather than extending
      // the existing due date, same rule as members.tsx's "Cambiar plan"
      // (see its setPlan mutation). Extending here would stack whatever was
      // left on the old plan's cycle on top of the new plan's full duration.
      const isPlanChange = lastPayment != null && lastPayment.plan_id !== params.planId;
      const baseNextPaymentAt = isPlanChange ? null : (member?.next_payment_at ?? null);
      nextPaymentAt = computeNextPaymentAt(baseNextPaymentAt, paidAt!, plan.duration_days);
    }
  }

  const { error } = await supabase.from("payments").insert({
    box_id: params.boxId,
    user_id: params.userId,
    plan_id: params.planId,
    amount: params.amount,
    method: params.method,
    status: params.status,
    paid_at: paidAt ? paidAt.toISOString() : null,
    next_payment_at: nextPaymentAt,
  });
  if (error) throw error;

  if (nextPaymentAt) {
    const { error: memberError } = await supabase
      .from("box_members")
      .update({ next_payment_at: nextPaymentAt })
      .eq("box_id", params.boxId)
      .eq("user_id", params.userId);
    if (memberError) throw memberError;
  }
}
