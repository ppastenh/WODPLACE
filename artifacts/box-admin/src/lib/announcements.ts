import { supabase } from "@/integrations/supabase/client";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  send_push: boolean;
  show_banner: boolean;
  banner_days: number;
  expires_at: string | null;
  created_at: string;
};

export async function fetchAnnouncements(boxId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("id,title,body,image_url,send_push,show_banner,banner_days,expires_at,created_at")
    .eq("box_id", boxId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export async function fetchMyReads(boxId: string): Promise<Set<string>> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return new Set();
  const { data, error } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("box_id", boxId)
    .eq("user_id", uid);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.announcement_id));
}

export async function markRead(announcementId: string, boxId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  await supabase.from("announcement_reads").upsert(
    { announcement_id: announcementId, box_id: boxId, user_id: uid },
    { onConflict: "announcement_id,user_id" },
  );
}

export function isExpired(a: Announcement) {
  return !!a.expires_at && new Date(a.expires_at).getTime() < Date.now();
}

export async function signedImageUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from("announcements").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Envía la notificación push local (Web Notifications) a este dispositivo.
 * El envío a todos los dispositivos requiere un servicio de push externo,
 * pendiente de integrar; el aviso siempre queda disponible en la campana.
 */
export async function tryLocalPush(title: string, body?: string | null) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm === "granted") new Notification(title, { body: body ?? undefined });
  } catch {
    /* ignore */
  }
}
