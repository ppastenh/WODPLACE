import { supabase } from "@/integrations/supabase/client";

/**
 * "Reportes de Comunidad" (F1 de la reubicación del área de administración).
 *
 * TODO va directo a Supabase con la sesión de quien mira y SIEMPRE filtrado por el box
 * seleccionado. La protección real está en la base (RLS), no aquí:
 *  - leer social_reports: administrador del box, dueño (con su fila box_admin) o super admin;
 *  - descartar un reporte / eliminar una publicación: la misma condición.
 * Un coach o un alumno recibe lista vacía (lectura) o 0 filas (escritura).
 */

export type CommunityReport = {
  id: string;
  postId: string;
  reporterName: string;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
  imageUrl: string | null;
};

export type ReportedPost = {
  id: string;
  authorName: string;
  body: string;
  imageUris: string[];
  createdAt: string;
  deleted: boolean;
};

/** Todos los reportes de UNA publicación (la publicación se muestra una sola vez). */
export type ReportGroup = {
  postId: string;
  post: ReportedPost | null;
  reports: CommunityReport[];
};

export type ReportStatus = "pendientes" | "resueltos";

const PAGE = 50;
const RESOLVED_DAYS = 30;

function parseImageUris(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

type PostRow = { id: string; author_name: string; body: string | null; image_uris: string | null; created_at: string; deleted_at: string | null };
type ReportRow = {
  id: string;
  post_id: string;
  reporter_name: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
  image_url: string | null;
  social_posts: PostRow | PostRow[] | null;
};

const SELECT =
  "id, post_id, reporter_name, reason, created_at, resolved_at, image_url, social_posts(id, author_name, body, image_uris, created_at, deleted_at)";

export async function fetchReportGroups(boxId: string, status: ReportStatus): Promise<ReportGroup[]> {
  let q = supabase.from("social_reports").select(SELECT).eq("box_id", boxId);
  if (status === "pendientes") {
    q = q.is("resolved_at", null).order("created_at", { ascending: false });
  } else {
    const since = new Date(Date.now() - RESOLVED_DAYS * 864e5).toISOString();
    q = q.not("resolved_at", "is", null).gte("resolved_at", since).order("resolved_at", { ascending: false });
  }
  const { data, error } = await q.limit(PAGE);
  if (error) throw error;

  const groups = new Map<string, ReportGroup>();
  for (const r of (data ?? []) as unknown as ReportRow[]) {
    const p = Array.isArray(r.social_posts) ? r.social_posts[0] : r.social_posts;
    let g = groups.get(r.post_id);
    if (!g) {
      g = {
        postId: r.post_id,
        post: p
          ? {
              id: p.id,
              authorName: p.author_name,
              body: p.body ?? "",
              imageUris: parseImageUris(p.image_uris),
              createdAt: p.created_at,
              deleted: !!p.deleted_at,
            }
          : null,
        reports: [],
      };
      groups.set(r.post_id, g);
    }
    g.reports.push({
      id: r.id,
      postId: r.post_id,
      reporterName: r.reporter_name,
      reason: r.reason,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      imageUrl: r.image_url,
    });
  }
  return [...groups.values()];
}

/** Cuántos reportes pendientes tiene el box (para el contador del menú). */
export async function countPendingReports(boxId: string): Promise<number> {
  const { count, error } = await supabase
    .from("social_reports")
    .select("id", { count: "exact", head: true })
    .eq("box_id", boxId)
    .is("resolved_at", null);
  if (error) throw error;
  return count ?? 0;
}

/** "Descartar": marca resueltos los reportes de esa publicación; la publicación queda. */
export async function dismissPostReports(boxId: string, postId: string): Promise<void> {
  const { error } = await supabase
    .from("social_reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq("box_id", boxId)
    .eq("post_id", postId)
    .is("resolved_at", null);
  if (error) throw error;
}

/**
 * "Eliminar publicación y resolver": borrado lógico de la publicación (deja de verse en el feed) y cierre de
 * todos sus reportes. Si la publicación no se pudo borrar (0 filas = sin permiso), no se cierran los reportes.
 */
export async function deletePostAndResolve(boxId: string, postId: string): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("social_posts")
    .update({ deleted_at: now })
    .eq("box_id", boxId)
    .eq("id", postId)
    .is("deleted_at", null)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    // Ya estaba eliminada, o no tienes permiso: no se inventa un éxito.
    const { data: still } = await supabase.from("social_posts").select("id, deleted_at").eq("box_id", boxId).eq("id", postId);
    if (!still || still.length === 0 || !still[0].deleted_at) throw new Error("No se pudo eliminar la publicación.");
  }
  const { error: e2 } = await supabase
    .from("social_reports")
    .update({ resolved_at: now })
    .eq("box_id", boxId)
    .eq("post_id", postId)
    .is("resolved_at", null);
  if (e2) throw e2;
}
