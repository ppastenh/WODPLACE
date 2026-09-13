import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, ShieldCheck, Check, X, Users, UserCircle2, UserPlus, Ban, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit-log";
import { Route as SuperAdminRoute } from "@/routes/super-admin";

export const Route = createFileRoute("/super-admin/boxes")({
  head: () => ({ meta: [{ title: "Boxes — Super Admin" }] }),
  component: BoxesPage,
});

type PendingBox = {
  id: string;
  name: string;
  location: string | null;
  owner_user_id: string | null;
  ownerEmail: string | null;
};
type ActiveBox = {
  id: string;
  name: string;
  status: "activo" | "suspendido";
  ownerEmail: string | null;
};
type BoxCreationAuth = {
  email: string;
  authorizedAt: string;
  usedAt: string | null;
  revokedAt: string | null;
};

async function fetchPending(): Promise<PendingBox[]> {
  const { data, error } = await supabase
    .from("boxes")
    .select("id, name, location, owner_user_id")
    .eq("status", "pendiente")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];

  const ownerIds = [...new Set(rows.map((r) => r.owner_user_id).filter((v): v is string => !!v))];
  let emailById = new Map<string, string | null>();
  if (ownerIds.length) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", ownerIds);
    if (pErr) throw pErr;
    emailById = new Map((profs ?? []).map((p) => [p.id, p.email]));
  }

  return rows.map((r) => ({
    ...r,
    ownerEmail: r.owner_user_id ? (emailById.get(r.owner_user_id) ?? null) : null,
  }));
}

async function fetchActive(): Promise<ActiveBox[]> {
  const { data, error } = await supabase
    .from("boxes")
    .select("id, name, status, owner_user_id")
    .in("status", ["activo", "suspendido"])
    .order("name", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];

  const ownerIds = [...new Set(rows.map((r) => r.owner_user_id).filter((v): v is string => !!v))];
  let emailById = new Map<string, string | null>();
  if (ownerIds.length) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", ownerIds);
    if (pErr) throw pErr;
    emailById = new Map((profs ?? []).map((p) => [p.id, p.email]));
  }

  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    status: b.status as ActiveBox["status"],
    ownerEmail: b.owner_user_id ? (emailById.get(b.owner_user_id) ?? null) : null,
  }));
}

async function fetchAuthorizations(): Promise<BoxCreationAuth[]> {
  const { data, error } = await supabase
    .from("box_creation_authorizations")
    .select("email, authorized_at, used_at, revoked_at")
    .order("authorized_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    email: r.email,
    authorizedAt: r.authorized_at,
    usedAt: r.used_at,
    revokedAt: r.revoked_at,
  }));
}

/** Crea user_roles(role='box_admin', box_id, user_id) si todavía no existe. */
async function ensureBoxAdminRole(boxId: string, userId: string) {
  const { data: existing, error: selErr } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "box_admin")
    .eq("box_id", boxId)
    .limit(1);
  if (selErr) throw selErr;
  if ((existing?.length ?? 0) > 0) return;

  const { error: insErr } = await supabase
    .from("user_roles")
    .insert({ role: "box_admin", box_id: boxId, user_id: userId });
  if (insErr) throw insErr;
}

function BoxesPage() {
  const { email } = SuperAdminRoute.useRouteContext();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["boxes"] });
  };

  const pendingQ = useQuery({ queryKey: ["boxes", "pendiente"], queryFn: fetchPending });
  const activeQ = useQuery({ queryKey: ["boxes", "active"], queryFn: fetchActive });
  const authQ = useQuery({ queryKey: ["box-creation-authorizations"], queryFn: fetchAuthorizations });

  const pending = pendingQ.data ?? [];
  const active = activeQ.data ?? [];
  const authorizations = authQ.data ?? [];

  const [authEmail, setAuthEmail] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [grantBoxId, setGrantBoxId] = useState("");
  const [ownerVisibleFor, setOwnerVisibleFor] = useState<Set<string>>(new Set());
  const toggleOwner = (boxId: string) => {
    setOwnerVisibleFor((prev) => {
      const next = new Set(prev);
      if (next.has(boxId)) next.delete(boxId);
      else next.add(boxId);
      return next;
    });
  };

  const authorize = useMutation({
    mutationFn: async (rawEmail: string) => {
      const clean = rawEmail.trim().toLowerCase();
      if (!clean) throw new Error("Ingresá un email.");
      const { error } = await supabase
        .from("box_creation_authorizations")
        .insert({ email: clean, authorized_by: email });
      if (error) throw error;
      return clean;
    },
    onSuccess: (authorizedEmail) => {
      toast.success(`${authorizedEmail} autorizado para crear un box`);
      void logAudit(email, "box_creation.authorize", "box_creation_authorization", authorizedEmail);
      setAuthEmail("");
      qc.invalidateQueries({ queryKey: ["box-creation-authorizations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo autorizar"),
  });

  const revokeAuth = useMutation({
    mutationFn: async (targetEmail: string) => {
      const { error } = await supabase
        .from("box_creation_authorizations")
        .update({ revoked_at: new Date().toISOString() })
        .eq("email", targetEmail);
      if (error) throw error;
    },
    onSuccess: (_d, targetEmail) => {
      toast(`${targetEmail} revocado`);
      void logAudit(email, "box_creation.revoke", "box_creation_authorization", targetEmail);
      qc.invalidateQueries({ queryKey: ["box-creation-authorizations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo revocar"),
  });

  const reauthorize = useMutation({
    mutationFn: async (targetEmail: string) => {
      const { error } = await supabase
        .from("box_creation_authorizations")
        .update({ revoked_at: null })
        .eq("email", targetEmail);
      if (error) throw error;
    },
    onSuccess: (_d, targetEmail) => {
      toast.success(`${targetEmail} reautorizado`);
      void logAudit(email, "box_creation.reauthorize", "box_creation_authorization", targetEmail);
      qc.invalidateQueries({ queryKey: ["box-creation-authorizations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo reautorizar"),
  });

  const approve = useMutation({
    mutationFn: async (b: PendingBox) => {
      if (!b.owner_user_id) {
        throw new Error("Este box no tiene una cuenta dueña asignada; no se puede aprobar.");
      }
      // El rol primero: si falla, no dejamos el box en 'activo' sin box_admin.
      await ensureBoxAdminRole(b.id, b.owner_user_id);
      const { error } = await supabase.from("boxes").update({ status: "activo" }).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: (_d, b) => {
      toast.success(`${b.name} aprobado`);
      void logAudit(email, "box.approve", "box", b.id, { name: b.name, ownerEmail: b.ownerEmail });
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo aprobar"),
  });

  const reject = useMutation({
    mutationFn: async (b: PendingBox) => {
      const { error } = await supabase.from("boxes").update({ status: "rechazado" }).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: (_d, b) => {
      toast(`${b.name} rechazado`);
      void logAudit(email, "box.reject", "box", b.id, { name: b.name });
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo rechazar"),
  });

  const grant = useMutation({
    mutationFn: async ({ email: rawEmail, boxId }: { email: string; boxId: string }) => {
      const clean = rawEmail.trim();
      if (!clean) throw new Error("Ingresá un email.");
      if (!boxId) throw new Error("Elegí un box.");

      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", clean)
        .limit(2);
      if (error) throw error;
      if (!profs || profs.length === 0)
        throw new Error(`No hay ninguna cuenta con el email "${clean}".`);
      if (profs.length > 1) throw new Error("Hay más de una cuenta con ese email.");

      await ensureBoxAdminRole(boxId, profs[0].id);
      return { email: profs[0].email ?? clean, boxId };
    },
    onSuccess: ({ email: grantedTo, boxId }) => {
      toast.success(`Rol de Admin de Box otorgado a ${grantedTo}`);
      void logAudit(email, "role.grant_box_admin", "user_role", boxId, { grantedTo });
      setUserQuery("");
      setGrantBoxId("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo otorgar el rol"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Boxes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aprobación de altas, permisos de administración y alumnos por box.
        </p>
      </div>

      {(pendingQ.isError || activeQ.isError) && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudieron cargar los boxes: {String((pendingQ.error ?? activeQ.error) as Error)}
        </div>
      )}

      {/* Autorizar creación de box */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Autorizar creación de box</h2>
        <p className="text-xs text-muted-foreground">
          "Crear mi Box" en la app solo funciona para emails que autorices acá primero — nadie
          más puede mandarte una solicitud sin este paso.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            authorize.mutate(authEmail);
          }}
          className="flex gap-2"
        >
          <Input
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="Email a autorizar"
            type="email"
            className="rounded-full"
          />
          <Button
            type="submit"
            disabled={authorize.isPending || !authEmail.trim()}
            className="shrink-0 rounded-full"
          >
            <UserPlus className="h-4 w-4" /> Autorizar
          </Button>
        </form>

        {authQ.isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : authorizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no autorizaste ningún email.</p>
        ) : (
          <div className="space-y-2">
            {authorizations.map((a) => {
              const status = a.revokedAt ? "revoked" : a.usedAt ? "used" : "authorized";
              return (
                <div
                  key={a.email}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.email}</p>
                    <Badge
                      variant="secondary"
                      className={
                        status === "authorized"
                          ? "mt-1 rounded-full bg-success/15 text-success hover:bg-success/15"
                          : status === "used"
                            ? "mt-1 rounded-full bg-secondary text-muted-foreground hover:bg-secondary"
                            : "mt-1 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/15"
                      }
                    >
                      {status === "authorized" ? "Autorizado" : status === "used" ? "Usado" : "Revocado"}
                    </Badge>
                  </div>
                  {status === "authorized" ? (
                    <Button
                      onClick={() => revokeAuth.mutate(a.email)}
                      disabled={revokeAuth.isPending}
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-full"
                    >
                      <Ban className="h-4 w-4" /> Revocar
                    </Button>
                  ) : status === "revoked" ? (
                    <Button
                      onClick={() => reauthorize.mutate(a.email)}
                      disabled={reauthorize.isPending}
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-full"
                    >
                      <RotateCcw className="h-4 w-4" /> Reautorizar
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Boxes por aprobar */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Boxes por aprobar</h2>
        {pendingQ.isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No hay boxes pendientes.
          </div>
        ) : (
          pending.map((b) => {
            const busy = approve.isPending || reject.isPending;
            return (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="font-semibold">{b.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {b.ownerEmail ?? (b.owner_user_id ? "dueño sin perfil" : "sin dueño asignado")}
                  {b.location ? ` · ${b.location}` : ""}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => approve.mutate(b)}
                    disabled={busy || !b.owner_user_id}
                    className="rounded-full"
                  >
                    <Check className="h-4 w-4" /> Aprobar
                  </Button>
                  <Button
                    onClick={() => reject.mutate(b)}
                    disabled={busy}
                    variant="outline"
                    className="rounded-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" /> Rechazar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Otorgar permiso */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Otorgar permiso de Admin de Box</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            grant.mutate({ email: userQuery, boxId: grantBoxId });
          }}
          className="space-y-3 rounded-2xl border border-border bg-card p-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Email de la cuenta"
              type="email"
              className="rounded-full pl-9"
            />
          </div>
          <select
            value={grantBoxId}
            onChange={(e) => setGrantBoxId(e.target.value)}
            className="w-full rounded-full border border-input bg-background px-4 py-2 text-sm"
          >
            <option value="">Elegí un box…</option>
            {active.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            disabled={grant.isPending || !userQuery.trim() || !grantBoxId}
            className="w-full rounded-full"
          >
            <ShieldCheck className="h-4 w-4" /> Dar rol de Admin de Box
          </Button>
        </form>
      </section>

      {/* Boxes activos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Boxes activos</h2>
        {activeQ.isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : active.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No hay boxes activos.
          </div>
        ) : (
          active.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{b.name}</div>
                <Badge
                  variant="secondary"
                  className={
                    b.status === "activo"
                      ? "rounded-full bg-success/15 text-success hover:bg-success/15"
                      : "rounded-full bg-warning/15 text-warning hover:bg-warning/15"
                  }
                >
                  {b.status === "activo" ? "Activo" : "Suspendido"}
                </Badge>
              </div>
              {ownerVisibleFor.has(b.id) ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Dueño: {b.ownerEmail ?? "sin dueño asignado"}
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  to="/super-admin/boxes/$boxId"
                  params={{ boxId: b.id }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <Users className="h-4 w-4" /> Ver alumnos
                </Link>
                <Button
                  onClick={() => toggleOwner(b.id)}
                  variant="outline"
                  className="rounded-full"
                >
                  <UserCircle2 className="h-4 w-4" />
                  {ownerVisibleFor.has(b.id) ? "Ocultar dueño" : "Ver dueño"}
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
