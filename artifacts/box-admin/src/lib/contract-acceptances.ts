import { supabase } from "@/integrations/supabase/client";

/**
 * "Aceptaciones de contratos" (F3 de la reubicación del área de administración).
 *
 * La LISTA usa la función de la base `box_contract_acceptances_list(box)`: devuelve SOLO quién aceptó, qué documento y
 * versión, y cuándo (y si ya se marcó visto). El contacto de emergencia y los datos del apoderado de un menor NO
 * pasan por aquí: están en la ficha del miembro. La función verifica por dentro que quien llama sea administrador
 * del box, dueño o super admin (con aal2 si el interruptor está encendido) y devuelve 0 filas si no.
 * "Marcar como vistas" actualiza `seen_by_owner_at` del box (la base solo se lo permite a esos mismos roles).
 */

export type AcceptedDocument = {
  slug: string;
  title: string;
  versionDate: string | null;
  superseded: boolean;
  readAt: string | null;
};

export type AcceptanceItem = {
  userId: string;
  name: string;
  acceptedAt: string;
  seen: boolean;
  documents: AcceptedDocument[];
};

type ListRow = {
  user_id: string;
  member_name: string | null;
  accepted_at: string;
  seen: boolean;
  document_slug: string | null;
  document_title: string | null;
  version_date: string | null;
  version_superseded: boolean | null;
  read_at: string | null;
};

export async function fetchAcceptances(boxId: string): Promise<AcceptanceItem[]> {
  const { data, error } = await supabase.rpc("box_contract_acceptances_list", { _box_id: boxId });
  if (error) throw error;
  const byUser = new Map<string, AcceptanceItem>();
  for (const r of (data ?? []) as unknown as ListRow[]) {
    let it = byUser.get(r.user_id);
    if (!it) {
      it = { userId: r.user_id, name: r.member_name ?? "Alumno sin ficha", acceptedAt: r.accepted_at, seen: r.seen, documents: [] };
      byUser.set(r.user_id, it);
    }
    if (r.document_slug) {
      it.documents.push({
        slug: r.document_slug,
        title: r.document_title ?? r.document_slug,
        versionDate: r.version_date,
        superseded: !!r.version_superseded,
        readAt: r.read_at,
      });
    }
  }
  return [...byUser.values()];
}

/** Cuántas aceptaciones del box están sin ver (contador del menú). */
export async function countUnseenAcceptances(boxId: string): Promise<number> {
  const { count, error } = await supabase
    .from("contract_acceptances")
    .select("user_id", { count: "exact", head: true })
    .eq("box_id", boxId)
    .is("seen_by_owner_at", null);
  if (error) throw error;
  return count ?? 0;
}

/** "Marcar como vistas": todas las pendientes de ESTE box. */
export async function markAcceptancesSeen(boxId: string): Promise<void> {
  const { error } = await supabase
    .from("contract_acceptances")
    .update({ seen_by_owner_at: new Date().toISOString() })
    .eq("box_id", boxId)
    .is("seen_by_owner_at", null);
  if (error) throw error;
}
