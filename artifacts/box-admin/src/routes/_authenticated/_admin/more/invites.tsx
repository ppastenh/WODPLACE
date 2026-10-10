import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { apiFetch } from "@/lib/apiClient";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { copyToClipboard } from "@/lib/clipboard";
import type { NewInviteCodeResult } from "@workspace/api-zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Trash2, Mail, Clock, Check, ArrowRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/_admin/more/invites")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Invitar Staff — Dlovebox" },
      { name: "description", content: "Genera enlaces de invitación para nuevos administradores y coaches." },
      { property: "og:title", content: "Invitar Staff — Dlovebox" },
      { property: "og:description", content: "Otorga rol de administrador o coach a alguien de tu box." },
    ],
  }),
  component: InvitesPage,
});

type Invite = {
  id: string;
  code: string;
  email: string | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
  role: string;
};

function InvitesPage() {
  const qc = useQueryClient();
  const { boxId, isAdmin } = useBox();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState<string>("7");
  // La opción "Administrador" queda oculta mientras no exista la marca de
  // dueño (Fase B) — invitar a un administrador por ahora solo lo puede
  // hacer un super_admin directamente, no desde esta pantalla. El rol
  // siempre es "coach" acá.
  const role: "coach" = "coach";

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["admin_invites", boxId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_invites")
        .select("id, code, email, expires_at, used_at, created_at, role")
        .eq("box_id", boxId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        throw new Error("El email es obligatorio: la invitación solo la puede canjear esa dirección.");
      }
      const { code } = await apiFetch<NewInviteCodeResult>(
        `/invites/new-code?boxId=${encodeURIComponent(boxId)}`,
      );
      const expires_at =
        days && Number(days) > 0
          ? new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString()
          : null;
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("admin_invites").insert({
        box_id: boxId,
        code,
        role,
        email: trimmedEmail,
        expires_at,
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
      return code;
    },
    onSuccess: () => {
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin_invites"] });
      toast.success("Invitación creada");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_invites").delete().eq("box_id", boxId).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_invites"] });
      toast.success("Invitación eliminada");
    },
  });

  function buildLink(code: string) {
    return `${window.location.origin}/auth?invite=${code}`;
  }

  async function copyLink(code: string) {
    const ok = await copyToClipboard(buildLink(code));
    if (ok) toast.success("Enlace copiado");
    else toast.error("No se pudo copiar el enlace");
  }

  if (!isAdmin) {
    return (
      <AdminShell title="Invitar Staff" showBack>
        <div className="rounded-3xl border bg-card p-8 text-center">
          <p className="text-sm font-semibold">No tienes permiso para invitar staff</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Solo un administrador de este box puede crear invitaciones. Pídele a tu administrador
            que te invite, o que te dé el acceso.
          </p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Invitar Staff" showBack>
      <div className="rounded-3xl border bg-card p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Nueva invitación</p>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de acceso</Label>
            <div className="flex h-10 items-center justify-center rounded-full border border-primary bg-primary/15 text-xs font-semibold text-primary">
              Coach
            </div>
            <p className="text-[10px] text-muted-foreground">
              Invitar administradores está desactivado por ahora — solo el super admin puede
              hacerlo.
            </p>
            <Link
              to="/more/coaches"
              className="flex items-center gap-1 text-[10px] font-semibold text-primary"
            >
              El coach entra con los permisos que definas en Coaches <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-email" className="text-xs">Email</Label>
            <Input
              id="inv-email"
              type="email"
              required
              placeholder={role === "coach" ? "coach@box.cl" : "admin@box.cl"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Solo esa dirección podrá canjear el código.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-days" className="text-xs">Vence en (días)</Label>
            <Input
              id="inv-days"
              type="number"
              min={0}
              placeholder="7"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">0 = sin expiración.</p>
          </div>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || !email.trim()}
            className="h-11 w-full rounded-full font-semibold"
          >
            {create.isPending ? "Creando..." : "Generar invitación"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 px-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Invitaciones ({invites.length})
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : invites.length === 0 ? (
          <div className="rounded-3xl border bg-card p-6 text-center text-sm text-muted-foreground">
            Aún no hay invitaciones.
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map((inv) => {
              const expired =
                !inv.used_at && inv.expires_at && new Date(inv.expires_at) < new Date();
              const status = inv.used_at ? "used" : expired ? "expired" : "active";
              return (
                <div key={inv.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-secondary px-2 py-0.5 font-mono text-sm font-bold tracking-wider">
                          {inv.code}
                        </code>
                        <StatusChip status={status} />
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                          {inv.role === "coach" ? "Coach" : "Administrador"}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                        {inv.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" /> {inv.email}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {inv.used_at
                            ? `Usada ${new Date(inv.used_at).toLocaleDateString()}`
                            : inv.expires_at
                            ? `Vence ${new Date(inv.expires_at).toLocaleDateString()}`
                            : "Sin expiración"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => copyLink(inv.code)}
                        disabled={status !== "active"}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground active:bg-secondary/70 disabled:opacity-40"
                        aria-label="Copiar enlace"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove.mutate(inv.id)}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/15 text-destructive active:bg-destructive/25"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function StatusChip({ status }: { status: "active" | "used" | "expired" }) {
  const map = {
    active: { label: "Activa", cls: "bg-primary/20 text-primary" },
    used: { label: "Usada", cls: "bg-muted text-muted-foreground" },
    expired: { label: "Vencida", cls: "bg-destructive/15 text-destructive" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map.cls}`}>
      {status === "used" && <Check className="h-3 w-3" />}
      {map.label}
    </span>
  );
}
