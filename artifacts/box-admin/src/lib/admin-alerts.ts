import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Admin-only operational alerts for the notification bell — distinct from
// `announcements.ts`, which is member-facing content the admin authors (see
// more/notifications.tsx). Nothing here has its own "read" tracking: each
// count is derived live from the same tables the real screens use, so it
// clears itself once the admin acts (approves, resolves, registers a
// payment...). The one exception is contract acceptances, which already had
// a `seen_by_owner_at` column built for exactly this purpose.

const nameOf = (row: { name?: string | null } | { name?: string | null }[] | null) =>
  (Array.isArray(row) ? row[0]?.name : row?.name) ?? "—";

export type PendingRequest = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  createdAt: string;
};

export async function fetchPendingRequests(boxId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from("member_requests")
    .select("id, created_at, user_id, wodplace_users(name, email)")
    .eq("box_id", boxId)
    .eq("status", "pendiente")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    createdAt: r.created_at,
    name: nameOf(r.wodplace_users),
    email: (Array.isArray(r.wodplace_users) ? r.wodplace_users[0]?.email : r.wodplace_users?.email) ?? null,
  }));
}

export async function approveRequest(boxId: string, r: { id: string; userId: string }) {
  const { error: insErr } = await supabase
    .from("box_members")
    .upsert({ box_id: boxId, user_id: r.userId, status: "activo" }, { onConflict: "box_id,user_id" });
  if (insErr) throw insErr;
  const { error } = await supabase.from("member_requests").update({ status: "aprobado" }).eq("id", r.id);
  if (error) throw error;
}

export async function rejectRequest(id: string) {
  const { error } = await supabase.from("member_requests").update({ status: "rechazado" }).eq("id", id);
  if (error) throw error;
}

export type PendingReport = {
  id: string;
  postId: string;
  reporterName: string;
  reason: string;
  createdAt: string;
};

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  inappropriate: "Contenido inapropiado",
  other: "Otro motivo",
};

export function reportReasonLabel(reason: string) {
  return REASON_LABEL[reason] ?? reason;
}

// social_reports has no box_id (the community feed is a single shared space
// today) — this is every pending report, not just this box's.
export async function fetchPendingReports(): Promise<PendingReport[]> {
  const { data, error } = await supabase
    .from("social_reports")
    .select("id, post_id, reporter_name, reason, created_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    postId: r.post_id,
    reporterName: r.reporter_name,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

export async function resolveReport(id: string) {
  const { error } = await supabase
    .from("social_reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export type MemberAlert = { userId: string; name: string; date: string | null };

export async function fetchOverdueMembers(boxId: string): Promise<MemberAlert[]> {
  const { data, error } = await supabase
    .from("box_members")
    .select("user_id, next_payment_at, wodplace_users!inner(name)")
    .eq("box_id", boxId)
    .eq("status", "vencido")
    .order("next_payment_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ userId: r.user_id, name: nameOf(r.wodplace_users), date: r.next_payment_at }));
}

export async function fetchUpcomingRenewals(boxId: string, days = 7): Promise<MemberAlert[]> {
  const today = format(new Date(), "yyyy-MM-dd");
  const until = format(new Date(Date.now() + days * 864e5), "yyyy-MM-dd");
  const { data, error } = await supabase
    .from("box_members")
    .select("user_id, next_payment_at, wodplace_users!inner(name)")
    .eq("box_id", boxId)
    .gte("next_payment_at", today)
    .lte("next_payment_at", until)
    .order("next_payment_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ userId: r.user_id, name: nameOf(r.wodplace_users), date: r.next_payment_at }));
}

export type UnconfirmedPayment = { id: string; userId: string; name: string; amount: number; createdAt: string };

export async function fetchUnconfirmedPayments(boxId: string): Promise<UnconfirmedPayment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("id, user_id, amount, created_at, wodplace_users(name)")
    .eq("box_id", boxId)
    .eq("status", "pendiente")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    amount: Number(r.amount ?? 0),
    createdAt: r.created_at,
    name: nameOf(r.wodplace_users),
  }));
}

export type UnseenContract = { userId: string; name: string; acceptedAt: string };

// Also single-box (no box_id column, see contract_acceptances' own comment).
export async function fetchUnseenContracts(): Promise<UnseenContract[]> {
  const { data, error } = await supabase
    .from("contract_acceptances")
    .select("user_id, accepted_at, wodplace_users(name)")
    .is("seen_by_owner_at", null)
    .order("accepted_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ userId: r.user_id, acceptedAt: r.accepted_at, name: nameOf(r.wodplace_users) }));
}

export async function markContractSeen(userId: string) {
  const { error } = await supabase
    .from("contract_acceptances")
    .update({ seen_by_owner_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

// New rows in box_members, whichever way they were added (invite code or an
// admin adding them by hand from Miembros) — the table doesn't distinguish
// the two today.
export async function fetchNewMembers(boxId: string, days = 7): Promise<MemberAlert[]> {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data, error } = await supabase
    .from("box_members")
    .select("user_id, created_at, wodplace_users!inner(name)")
    .eq("box_id", boxId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ userId: r.user_id, name: nameOf(r.wodplace_users), date: r.created_at }));
}
