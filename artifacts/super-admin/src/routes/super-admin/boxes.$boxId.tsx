import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/super-admin/boxes/$boxId")({
  head: () => ({ meta: [{ title: "Alumnos del box — Super Admin" }] }),
  component: BoxMembersPage,
});

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
    </div>
  );
}
