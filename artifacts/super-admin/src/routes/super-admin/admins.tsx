import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldPlus, ShieldMinus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Route as SuperAdminRoute } from "@/routes/super-admin";
import { logAudit } from "@/lib/audit-log";

export const Route = createFileRoute("/super-admin/admins")({
  head: () => ({ meta: [{ title: "Super Admins — Super Admin" }] }),
  component: SuperAdminsPage,
});

type SuperAdminAccount = { userId: string; email: string; roleId: string };

async function fetchSuperAdmins(): Promise<SuperAdminAccount[]> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("id, user_id")
    .eq("role", "super_admin");
  if (error) throw error;
  const rows = roles ?? [];
  if (rows.length === 0) return [];

  const { data: profs, error: profErr } = await supabase
    .from("profiles")
    .select("id, email")
    .in(
      "id",
      rows.map((r) => r.user_id),
    );
  if (profErr) throw profErr;
  const emailById = new Map((profs ?? []).map((p) => [p.id, p.email]));

  return rows.map((r) => ({
    userId: r.user_id,
    email: emailById.get(r.user_id) ?? "(sin perfil)",
    roleId: r.id,
  }));
}

function SuperAdminsPage() {
  const { email: myEmail } = SuperAdminRoute.useRouteContext();
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["super-admins"],
    queryFn: fetchSuperAdmins,
  });
  const [grantEmail, setGrantEmail] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState<SuperAdminAccount | null>(null);

  const grant = useMutation({
    mutationFn: async (rawEmail: string) => {
      const clean = rawEmail.trim();
      if (!clean) throw new Error("Ingresá un email.");

      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", clean)
        .limit(2);
      if (error) throw error;
      if (!profs || profs.length === 0)
        throw new Error(`No hay ninguna cuenta con el email "${clean}".`);
      if (profs.length > 1) throw new Error("Hay más de una cuenta con ese email.");

      const target = profs[0];
      const { data: existing, error: selErr } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", target.id)
        .eq("role", "super_admin")
        .limit(1);
      if (selErr) throw selErr;
      if ((existing?.length ?? 0) > 0) throw new Error("Esa cuenta ya es Super Admin.");

      const { error: insErr } = await supabase.from("user_roles").insert({
        role: "super_admin",
        user_id: target.id,
        box_id: null,
      });
      if (insErr) throw insErr;
      return { email: target.email ?? clean, userId: target.id };
    },
    onSuccess: ({ email, userId }) => {
      toast.success(`${email} ahora es Super Admin`);
      void logAudit(myEmail, "role.grant_super_admin", "user_role", userId, { grantedTo: email });
      setGrantEmail("");
      qc.invalidateQueries({ queryKey: ["super-admins"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo otorgar el rol"),
  });

  const revoke = useMutation({
    mutationFn: async (account: SuperAdminAccount) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", account.roleId);
      if (error) throw error;
    },
    onSuccess: (_d, account) => {
      toast(`Se revocó Super Admin a ${account.email}`);
      void logAudit(myEmail, "role.revoke_super_admin", "user_role", account.userId, {
        revokedFrom: account.email,
      });
      setConfirmRevoke(null);
      qc.invalidateQueries({ queryKey: ["super-admins"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo revocar el rol"),
  });

  const admins = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Gestión de Super Admins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El rol más poderoso de la plataforma — otorgalo con cuidado. No podés revocarte a vos
          misma.
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar: {String(error)}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Otorgar Super Admin</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            grant.mutate(grantEmail);
          }}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="Email de la cuenta"
              type="email"
              className="rounded-full pl-9"
            />
          </div>
          <Button
            type="submit"
            disabled={grant.isPending || !grantEmail.trim()}
            className="rounded-full"
          >
            <ShieldPlus className="h-4 w-4" /> Otorgar
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Cuentas con Super Admin</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          admins.map((a) => {
            const isSelf = a.email.toLowerCase() === myEmail.toLowerCase();
            return (
              <div
                key={a.roleId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <span className="text-sm">
                  {a.email}{" "}
                  {isSelf ? <span className="text-xs text-muted-foreground">(vos)</span> : null}
                </span>
                <Button
                  onClick={() => setConfirmRevoke(a)}
                  disabled={isSelf}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                >
                  <ShieldMinus className="h-3.5 w-3.5" /> Revocar
                </Button>
              </div>
            );
          })
        )}
      </section>

      {confirmRevoke ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">¿Revocar Super Admin?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{confirmRevoke.email}</span> perderá
              acceso a este panel de inmediato.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setConfirmRevoke(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(confirmRevoke)}
              >
                Sí, revocar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
