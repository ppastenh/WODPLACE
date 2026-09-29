import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Plus, UserCog, ShieldCheck, Pause, Play, Trash2, Mail, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COACH_PERMISSIONS, mergeWithDefaults, type Permissions } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/_admin/more/coaches")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Coaches — Dlovebox" },
      { name: "description", content: "Gestión de coaches y permisos del box." },
      { property: "og:title", content: "Coaches — Dlovebox" },
      { property: "og:description", content: "Coaches y permisos del box." },
    ],
  }),
  component: CoachesPage,
});

type Coach = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  status: string;
  user_id: string | null;
  permissions: Permissions;
};

// box_settings key holding the last permission set an admin actually saved
// for some coach (JSON-serialized in `value`, which is a plain text column
// — see PermissionsDialog's save and AddCoach's `lastPermissions` query
// below). Falls back to the catalog's own defaults (via mergeWithDefaults)
// until the box's first edit.
const LAST_COACH_PERMISSIONS_KEY = "last_coach_permissions";

function CoachesPage() {
  const { boxId } = useBox();
  const coaches = useQuery({
    queryKey: ["coaches", boxId],
    queryFn: async () => {
      const { data, error } = await supabase.from("coaches").select("*").eq("box_id", boxId).order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Coach[];
    },
  });

  return (
    <AdminShell title="Coaches" showBack>
      <p className="mb-3 px-1 text-[11px] text-muted-foreground">
        Agrega coaches, invítalos a la app y define exactamente qué puede hacer cada uno.
      </p>
      <div className="mb-3"><AddCoach /></div>
      <div className="space-y-2">
        {coaches.data?.length === 0 && (
          <div className="rounded-3xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">Aún no hay coaches</p>
          </div>
        )}
        {coaches.data?.map((c) => <CoachCard key={c.id} coach={c} />)}
      </div>
    </AdminShell>
  );
}

function CoachCard({ coach }: { coach: Coach }) {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const perms = coach.permissions ?? {};
  const granted = COACH_PERMISSIONS.filter((p) => perms[p.key]).length;
  const paused = coach.status === "pausado";

  const update = useMutation({
    mutationFn: async (patch: { status?: string }) => {
      const { error } = await supabase.from("coaches").update(patch).eq("box_id", boxId).eq("id", coach.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coaches"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coaches").delete().eq("box_id", boxId).eq("id", coach.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Coach eliminado"); qc.invalidateQueries({ queryKey: ["coaches"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-secondary"><UserCog className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{coach.name}</p>
            {paused && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Pausado</span>}
            {coach.user_id && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">Vinculado</span>}
          </div>
          <p className="truncate text-[11px] text-muted-foreground">{coach.specialty || coach.email || "—"}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <PermissionsDialog coach={coach} granted={granted} />
        <HistoryDialog coach={coach} />

        <button
          onClick={() => update.mutate({ status: paused ? "activo" : "pausado" })}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary active:bg-secondary/70"
          aria-label={paused ? "Reanudar" : "Pausar"}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button
          onClick={() => remove.mutate()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive active:bg-destructive/25"
          aria-label="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PermissionsDialog({ coach, granted }: { coach: Coach; granted: number }) {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [open, setOpen] = useState(false);
  const [perms, setPerms] = useState<Permissions>(coach.permissions ?? {});

  const save = useMutation({
    mutationFn: async () => {
      // update_coach_permissions does all three writes (coaches.permissions,
      // box_settings.last_coach_permissions, coach_permission_changes) in
      // ONE transaction — see its own definition (supabase/migrations/
      // 20261001140000_atomic_coach_permissions_update.sql) for why: the
      // old 3-separate-calls version could leave the audit log or the
      // "last used" template out of sync if anything failed partway
      // through. SECURITY INVOKER, so this is gated by the exact same RLS
      // this box_admin already satisfies for each of those 3 writes.
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.rpc("update_coach_permissions", {
        p_coach_id: coach.id,
        p_new_permissions: perms,
        p_changed_by_email: auth.user?.email ?? "—",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permisos actualizados");
      qc.invalidateQueries({ queryKey: ["coaches"] });
      qc.invalidateQueries({ queryKey: ["coach-permission-changes", coach.id] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setPerms(coach.permissions ?? {}); }}>
      <DialogTrigger asChild>
        <button className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-3 text-xs font-semibold active:bg-secondary/70">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Permisos · {granted}/{COACH_PERMISSIONS.length}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle>Permisos de {coach.name}</DialogTitle></DialogHeader>
        <div className="divide-y divide-border/60">
          {COACH_PERMISSIONS.map((p) => (
            <div key={p.key} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.label}</p>
                <p className="text-[11px] text-muted-foreground">{p.hint}</p>
              </div>
              <Switch
                checked={!!perms[p.key]}
                onCheckedChange={(v) => setPerms((s) => ({ ...s, [p.key]: v }))}
              />
            </div>
          ))}
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="h-11 w-full rounded-full font-semibold">
          Guardar permisos
        </Button>
      </DialogContent>
    </Dialog>
  );
}

type PermissionChangeRow = {
  id: string;
  changed_by_email: string;
  changes: Record<string, { from: boolean; to: boolean }>;
  created_at: string;
};

function permLabel(key: string) {
  return COACH_PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}

function HistoryDialog({ coach }: { coach: Coach }) {
  const { boxId } = useBox();
  const [open, setOpen] = useState(false);

  const history = useQuery({
    queryKey: ["coach-permission-changes", coach.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_permission_changes")
        .select("id, changed_by_email, changes, created_at")
        .eq("box_id", boxId)
        .eq("coach_id", coach.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PermissionChangeRow[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label={`Ver historial de permisos de ${coach.name}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary active:bg-secondary/70"
        >
          <History className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle>Historial de permisos · {coach.name}</DialogTitle></DialogHeader>
        {history.isLoading && <p className="text-center text-xs text-muted-foreground">Cargando…</p>}
        {!history.isLoading && (history.data ?? []).length === 0 && (
          <p className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            Sin cambios de permisos registrados todavía.
          </p>
        )}
        <div className="space-y-3">
          {(history.data ?? []).map((h) => (
            <div key={h.id} className="rounded-2xl border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold">{h.changed_by_email}</p>
                <p className="shrink-0 text-[10px] text-muted-foreground">
                  {format(new Date(h.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                </p>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {Object.entries(h.changes).map(([key, c]) => (
                  <li key={key} className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{permLabel(key)}</span>:{" "}
                    {c.from ? "activado" : "desactivado"} → {c.to ? "activado" : "desactivado"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}


type CandidateRow = {
  user_id: string;
  phone: string | null;
  wodplace_users: { name: string; email: string } | null;
};
type Candidate = { user_id: string; name: string; email: string | null; phone: string | null };

function AddCoach() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState<Record<string, string>>({});

  const members = useQuery({
    queryKey: ["members-for-coach", boxId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("box_members")
        .select("user_id, phone, wodplace_users!inner(name, email)")
        .eq("box_id", boxId)
        .order("name", { referencedTable: "wodplace_users" });
      if (error) throw error;
      return ((data ?? []) as unknown as CandidateRow[]).map((r) => ({
        user_id: r.user_id,
        name: r.wodplace_users?.name ?? "—",
        email: r.wodplace_users?.email ?? null,
        phone: r.phone,
      })) satisfies Candidate[];
    },
    enabled: open,
  });

  // Deliberately a DIFFERENT query key from CoachesPage's own `coaches`
  // query below (same table, narrower shape: no id/permissions/status).
  // These two used to share the key ["coaches", boxId] — react-query treats
  // identical keys as one cache entry, so whichever of these two shapes
  // resolved last after the mutation's invalidateQueries({queryKey:
  // ["coaches"]}) silently overwrote the OTHER one's data too. That's what
  // made a freshly-converted coach's card briefly show "Permisos · 0/10"
  // (this query's rows have no `.permissions` at all) until a manual reload
  // re-ran CoachesPage's real query cleanly.
  const existing = useQuery({
    queryKey: ["coaches-emails", boxId],
    queryFn: async () => {
      const { data, error } = await supabase.from("coaches").select("email, name").eq("box_id", boxId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Whatever an admin last saved in PermissionsDialog, for THIS box —
  // merged with the catalog's own defaults (mergeWithDefaults) so a
  // permission added to the catalog after this template was saved still
  // shows up instead of silently defaulting to "off" forever.
  const lastPermissions = useQuery({
    queryKey: ["box_settings", boxId, LAST_COACH_PERMISSIONS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("box_settings")
        .select("value")
        .eq("box_id", boxId)
        .eq("key", LAST_COACH_PERMISSIONS_KEY)
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return null;
      try {
        return JSON.parse(data.value) as Permissions;
      } catch {
        return null;
      }
    },
    enabled: open,
  });

  const mut = useMutation({
    mutationFn: async (m: Candidate) => {
      const { error } = await supabase.from("coaches").insert({
        box_id: boxId,
        name: m.name,
        email: m.email,
        phone: m.phone,
        specialty: specialty[m.user_id] || null,
        permissions: mergeWithDefaults(lastPermissions.data),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alumno convertido en coach");
      qc.invalidateQueries({ queryKey: ["coaches"] });
      setOpen(false);
      setQ("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const taken = new Set(
    (existing.data ?? []).flatMap((c) => [c.email?.toLowerCase(), c.name?.toLowerCase()].filter(Boolean) as string[]),
  );

  const list = (members.data ?? []).filter((m) =>
    m.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 w-full rounded-full font-semibold"><Plus className="mr-2 h-4 w-4" /> Convertir alumno en coach</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle>Convertir alumno en coach</DialogTitle></DialogHeader>
        <div>
          <Label>Buscar alumno</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre del alumno" />
        </div>
        <div className="space-y-2">
          {members.isLoading && <p className="text-xs text-muted-foreground">Cargando alumnos…</p>}
          {!members.isLoading && list.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No hay alumnos que coincidan.</p>
          )}
          {list.map((m) => {
            const already = taken.has(m.name.toLowerCase()) || (!!m.email && taken.has(m.email.toLowerCase()));
            return (
              <div key={m.user_id} className="rounded-2xl border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary">
                    <UserCog className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{m.email || m.phone || "—"}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={already || mut.isPending}
                    onClick={() => mut.mutate(m)}
                    className="h-9 rounded-full px-4 text-xs font-semibold"
                  >
                    {already ? "Ya es coach" : "Convertir"}
                  </Button>
                </div>
                {!already && (
                  <Input
                    className="mt-2 h-9"
                    placeholder="Especialidad (opcional)"
                    value={specialty[m.user_id] ?? ""}
                    onChange={(e) => setSpecialty((s) => ({ ...s, [m.user_id]: e.target.value }))}
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Mail className="mt-0.5 h-3 w-3 shrink-0" />
          Si el alumno tiene email, luego podrás enviarle la invitación para que entre con rol de coach.
        </p>
      </DialogContent>
    </Dialog>
  );
}
