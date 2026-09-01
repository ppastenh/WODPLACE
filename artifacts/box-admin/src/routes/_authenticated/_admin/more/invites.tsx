import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Trash2, Mail, Clock, Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/_admin/more/invites")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Invitaciones — Dlovebox" },
      { name: "description", content: "Genera enlaces de invitación para nuevos administradores." },
      { property: "og:title", content: "Invitaciones — Dlovebox" },
      { property: "og:description", content: "Invita administradores al panel." },
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

function genCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function InvitesPage() {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState<string>("7");
  const [role, setRole] = useState<"box_admin" | "coach">("box_admin");

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
      const code = genCode();
      const expires_at =
        days && Number(days) > 0
          ? new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString()
          : null;
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("admin_invites").insert({
        box_id: boxId,
        code,
        role,
        // "" = sin restricción de email (cualquiera con el código lo puede canjear)
        email: email.trim(),
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
    await navigator.clipboard.writeText(buildLink(code));
    toast.success("Enlace copiado");
  }

  return (
    <AdminShell title="Invitaciones" showBack>
      <div className="rounded-3xl border bg-card p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Nueva invitación</p>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de acceso</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["box_admin", "coach"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`h-10 rounded-full border text-xs font-semibold transition-colors ${
                    role === r ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {r === "box_admin" ? "Administrador" : "Coach"}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              El coach entra con los permisos que definas en la sección Coaches.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-email" className="text-xs">Email (opcional)</Label>
            <Input
              id="inv-email"
              type="email"
              placeholder="admin@box.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Si lo especificas, solo esa dirección podrá canjear el código.
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
            disabled={create.isPending}
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
