import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { UserCog, Layers, Settings, LifeBuoy, Bell, FolderOpen, LogOut, ChevronRight, Ticket, Flame, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBox } from "@/lib/box-context";

export const Route = createFileRoute("/_authenticated/_admin/more/")({
  head: () => ({
    meta: [
      { title: "Más — Dlovebox" },
      { name: "description", content: "Coaches, planes, configuración, reportes y más." },
      { property: "og:title", content: "Más — Dlovebox" },
      { property: "og:description", content: "Opciones adicionales del panel." },
    ],
  }),
  component: MorePage,
});

// Agrupado solo para presentación — el orden y los grupos no cambian qué ve
// cada rol, eso sigue decidido abajo en visibleItems exactamente como antes.
const items: Array<{ to: string; label: string; icon: LucideIcon; group: string }> = [
  { to: "/more/notifications", label: "Avisos", icon: Bell, group: "Comunidad" },
  { to: "/more/wod", label: "WOD del día", icon: Flame, group: "Comunidad" },
  { to: "/more/coaches", label: "Coaches", icon: UserCog, group: "Equipo" },
  { to: "/more/invites", label: "Invitar Staff", icon: Ticket, group: "Equipo" },
  { to: "/more/reports", label: "Ayuda y soporte", icon: LifeBuoy, group: "Ayuda y soporte" },
  { to: "/more/settings", label: "Configuración", icon: Settings, group: "Configuración" },
  { to: "/more/plans", label: "Planes", icon: Layers, group: "Configuración" },
  { to: "/more/files", label: "Archivos", icon: FolderOpen, group: "Configuración" },
  { to: "/more/my-profile", label: "Mi perfil", icon: User, group: "Mi cuenta" },
];
const GROUP_ORDER = ["Comunidad", "Equipo", "Ayuda y soporte", "Configuración", "Mi cuenta"];

function MorePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, myPermissions } = useBox();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // "Notificaciones" is where Avisos live — for a coach that's only
  // useful if they can post to Comunidad as the box (see
  // more/notifications.tsx); with nothing enabled there's nowhere for the
  // screen to take them, so it doesn't show at all.
  const canPostAsBox = isAdmin || !!myPermissions?.community_post_as_box;
  const visibleItems = items.filter((it) => {
    if (it.to === "/more/notifications") return canPostAsBox;
    if (it.to === "/more/my-profile") return !isAdmin;
    return true;
  });

  return (
    <AdminShell title="Más">
      {GROUP_ORDER.map((group) => {
        const groupItems = visibleItems.filter((it) => it.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group} className="mb-4">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <div className="rounded-3xl border bg-card divide-y divide-border/60">
              {groupItems.map((it) => {
                const Icon = it.icon;
                return (
                  <Link key={it.to} to={it.to} className="flex items-center gap-3 p-4 active:bg-secondary/60">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary"><Icon className="h-5 w-5" /></div>
                    <span className="flex-1 text-sm font-semibold">{it.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      <button onClick={signOut}
        className="mt-4 flex w-full items-center gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-destructive active:bg-destructive/20">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/20"><LogOut className="h-5 w-5" /></div>
        <span className="flex-1 text-left text-sm font-bold">Cerrar sesión</span>
      </button>

      <p className="mt-6 text-center text-[10px] text-muted-foreground">Dlovebox · Admin Panel</p>
    </AdminShell>
  );
}
