/**
 * Single source of truth for coach permission keys — add a new permission
 * by adding ONE entry here (label/hint/group/default), then wire the
 * matching RLS check with `user_has_box_permission(box_id, key)` on
 * whichever table it governs (see supabase/migrations/
 * 20261001110000_coach_permissions_catalog.sql for that function).
 *
 * Postgres can't import TypeScript, so the column default in that same
 * migration is a hand-kept mirror of `defaultPermissions()` below — keep
 * the two in sync when this list changes.
 */
export type PermissionGroup = "clases" | "miembros" | "comunidad" | "medallas" | "finanzas" | "archivos";

export interface PermissionDef {
  key: string;
  label: string;
  hint: string;
  group: PermissionGroup;
  /** Value a brand-new coach starts with — never retroactively applied to
   *  an existing coach's already-saved permissions (see mergeWithDefaults). */
  default: boolean;
}

export const COACH_PERMISSIONS: PermissionDef[] = [
  // On by default for a new coach.
  { key: "bookings_manage", label: "Gestionar reservas", hint: "Agregar o quitar inscritos y lista de espera, en sus propias clases", group: "clases", default: true },
  { key: "members_view", label: "Ver miembros", hint: "Acceso al listado y fichas de atletas", group: "miembros", default: true },
  {
    key: "community_post_as_box",
    label: "Publicar en Comunidad a nombre del box",
    hint: "Puede subir fotos al feed como aviso oficial del box (no como publicación personal)",
    group: "comunidad",
    default: true,
  },
  {
    key: "manual_achievements_manage",
    label: "Dar medallas de movimiento y competencia",
    hint: "Otorgar o revocar las medallas que se asignan a mano, no las automáticas",
    group: "medallas",
    default: true,
  },
  { key: "wod_of_day_publish", label: "Publicar el WOD del día", hint: "Cargar el WOD que ven los atletas cada día", group: "clases", default: true },
  {
    key: "athlete_rank_assign",
    label: "Asignar nivel (rank) del alumno",
    hint: "Cambiar el nivel de un atleta (beginner, rookie, scaled, master, rx, elite)",
    group: "miembros",
    default: true,
  },
  {
    key: "calendar_view_all",
    label: "Ver calendario completo del box",
    hint: "Ver todas las clases de la semana, de cualquier coach (solo lectura, no puede editarlas)",
    group: "clases",
    default: true,
  },
  // Off by default — an admin has to turn each of these on explicitly.
  { key: "classes_create", label: "Crear clases", hint: "Puede programar nuevas clases y WODs", group: "clases", default: false },
  { key: "classes_edit", label: "Editar clases", hint: "Modificar o cancelar clases existentes", group: "clases", default: false },
  { key: "members_edit", label: "Editar miembros", hint: "Modificar datos y estado de los atletas", group: "miembros", default: false },
  { key: "finances_view", label: "Ver finanzas", hint: "Acceso a ingresos y pagos", group: "finanzas", default: false },
  { key: "payments_register", label: "Registrar pagos", hint: "Puede cobrar y registrar pagos", group: "finanzas", default: false },
  { key: "files_manage", label: "Gestionar archivos", hint: "Subir o reemplazar contratos y documentos", group: "archivos", default: false },
];

export type Permissions = Record<string, boolean>;

export function defaultPermissions(): Permissions {
  return Object.fromEntries(COACH_PERMISSIONS.map((p) => [p.key, p.default]));
}

/**
 * Fills in any permission key missing from `saved` with its catalog
 * default — used when seeding a brand-new coach from the box's last-saved
 * template (`last_coach_permissions`), so a permission added to the
 * catalog after that template was saved still shows up instead of quietly
 * defaulting to "off" forever. Never used to rewrite an EXISTING coach's
 * own row — that data is trusted as-is once it exists.
 */
export function mergeWithDefaults(saved: Permissions | null | undefined): Permissions {
  return { ...defaultPermissions(), ...(saved ?? {}) };
}
