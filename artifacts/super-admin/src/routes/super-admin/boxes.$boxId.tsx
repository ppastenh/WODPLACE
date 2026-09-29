import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, User, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/super-admin/boxes/$boxId")({
  head: () => ({ meta: [{ title: "Alumnos del box — Super Admin" }] }),
  component: BoxMembersPage,
});

// Read-only mirror of box-admin's own catalog (artifacts/box-admin/src/lib/
// permissions.ts) — kept as a small duplicate rather than a shared package
// since this is the only other place that needs the labels, purely for
// display; box-admin's file stays the actual source of truth for defaults/
// enforcement. Keep the two in sync when a permission is added there.
const COACH_PERMISSION_LABELS: Array<{ key: string; label: string }> = [
  { key: "bookings_manage", label: "Gestionar reservas" },
  { key: "members_view", label: "Ver miembros" },
  { key: "community_post_as_box", label: "Publicar en Comunidad a nombre del box" },
  { key: "manual_achievements_manage", label: "Dar medallas de movimiento y competencia" },
  { key: "wod_of_day_publish", label: "Publicar el WOD del día" },
  { key: "athlete_rank_assign", label: "Asignar nivel (rank) del alumno" },
  { key: "classes_create", label: "Crear clases" },
  { key: "classes_edit", label: "Editar clases" },
  { key: "members_edit", label: "Editar miembros" },
  { key: "finances_view", label: "Ver finanzas" },
  { key: "payments_register", label: "Registrar pagos" },
  { key: "files_manage", label: "Gestionar archivos" },
];

type StaffAdmin = { userId: string; email: string };
type StaffCoach = { id: string; name: string; email: string | null; status: string; permissions: Record<string, boolean> };

async function fetchBoxStaff(boxId: string): Promise<{ admins: StaffAdmin[]; coaches: StaffCoach[] }> {
  const [{ data: roleRows, error: roleErr }, { data: coachRows, error: coachErr }] = await Promise.all([
    supabase.from("user_roles").select("user_id").eq("box_id", boxId).eq("role", "box_admin"),
    supabase.from("coaches").select("id, name, email, status, permissions").eq("box_id", boxId).order("name"),
  ]);
  if (roleErr) throw roleErr;
  if (coachErr) throw coachErr;

  const adminIds = (roleRows ?? []).map((r) => r.user_id);
  let emailById = new Map<string, string | null>();
  if (adminIds.length > 0) {
    const { data: profs, error: profErr } = await supabase.from("profiles").select("id, email").in("id", adminIds);
    if (profErr) throw profErr;
    emailById = new Map((profs ?? []).map((p) => [p.id, p.email]));
  }

  return {
    admins: adminIds.map((id) => ({ userId: id, email: emailById.get(id) || "(sin perfil)" })),
    coaches: (coachRows ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      status: c.status,
      permissions: (c.permissions as Record<string, boolean>) ?? {},
    })),
  };
}

function StaffSection({ boxId }: { boxId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["box-staff", boxId],
    queryFn: () => fetchBoxStaff(boxId),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando staff…</p>;
  if (isError) return <p className="text-sm text-destructive">No se pudo cargar el staff de este box.</p>;

  return (
    <div className="space-y-4">
      {(data?.admins.length ?? 0) > 0 && (
        <div className="space-y-2">
          {data!.admins.map((a) => (
            <div key={a.userId} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{a.email}</p>
                <p className="text-xs text-muted-foreground">Administrador — todos los permisos</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {(data?.coaches.length ?? 0) === 0 && (data?.admins.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Este box todavía no tiene staff (administradores ni coaches).
        </div>
      ) : (
        (data?.coaches ?? []).map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <UserCog className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.email ?? "(sin email)"} · {c.status}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {COACH_PERMISSION_LABELS.map((p) => {
                const on = !!c.permissions[p.key];
                return (
                  <span
                    key={p.key}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      on ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground line-through"
                    }`}
                    title={p.label}
                  >
                    {p.label}
                  </span>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

type Member = {
  userId: string;
  status: string;
  joinedAt: string;
  name: string | null;
  email: string | null;
};

async function fetchBoxAndMembers(boxId: string): Promise<{ boxName: string; members: Member[] }> {
  const [{ data: box, error: boxErr }, { data: members, error: membersErr }] = await Promise.all([
    supabase.from("boxes").select("name").eq("id", boxId).single(),
    supabase
      .from("box_members")
      .select("user_id, status, joined_at")
      .eq("box_id", boxId)
      .order("joined_at", { ascending: false }),
  ]);
  if (boxErr) throw boxErr;
  if (membersErr) throw membersErr;

  const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
  let byId = new Map<string, { name: string; email: string }>();
  if (userIds.length) {
    // wodplace_users lives in the same Drizzle-owned identity space as
    // box_members.user_id (both are the app's local mock id) — a direct
    // PostgREST join isn't declared, so this resolves names in a second
    // query, same style as fetchPending() resolving owner emails.
    const { data: users, error } = await supabase
      .from("wodplace_users")
      .select("id, name, email")
      .in("id", userIds);
    if (error) throw error;
    byId = new Map((users ?? []).map((u) => [u.id, { name: u.name, email: u.email }]));
  }

  return {
    boxName: box?.name ?? "Box",
    members: (members ?? []).map((m) => ({
      userId: m.user_id,
      status: m.status,
      joinedAt: m.joined_at,
      name: byId.get(m.user_id)?.name ?? null,
      email: byId.get(m.user_id)?.email ?? null,
    })),
  };
}

function BoxMembersPage() {
  const { boxId } = Route.useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["box-members", boxId],
    queryFn: () => fetchBoxAndMembers(boxId),
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/super-admin/boxes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Boxes
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight">
          Alumnos de {isLoading ? "…" : data?.boxName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading ? "Cargando…" : `${data?.members.length ?? 0} alumno(s)`}
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudieron cargar los alumnos: {String(error)}
        </div>
      )}

      {!isLoading && !isError && (data?.members.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Este box todavía no tiene alumnos.
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.members ?? []).map((m) => (
            <div
              key={m.userId}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.name ?? "(sin nombre)"}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email ?? m.userId}</p>
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                {m.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold tracking-tight">Staff y Permisos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Administradores y coaches de este box, con los permisos que cada coach tiene activados.
        </p>
      </div>
      <StaffSection boxId={boxId} />
    </div>
  );
}
