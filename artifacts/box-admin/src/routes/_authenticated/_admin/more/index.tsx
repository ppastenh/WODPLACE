import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { UserCog, Layers, Settings, LifeBuoy, Bell, FolderOpen, LogOut, ChevronRight, Ticket, Flame } from "lucide-react";
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

const items: Array<{ to: string; label: string; icon: LucideIcon; hint?: string }> = [
  { to: "/more/wod", label: "WOD del día", icon: Flame },
  { to: "/more/invites", label: "Invitar Staff", icon: Ticket },
  { to: "/more/coaches", label: "Coaches", icon: UserCog },
  { to: "/more/plans", label: "Planes", icon: Layers },
  { to: "/more/reports", label: "Soporte", icon: LifeBuoy },
  { to: "/more/notifications", label: "Notificaciones", icon: Bell },
  { to: "/more/files", label: "Archivos", icon: FolderOpen },
  { to: "/more/settings", label: "Configuración", icon: Settings },
];

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
  const visibleItems = items.filter((it) => it.to !== "/more/notifications" || canPostAsBox);

  return (
    <AdminShell title="Más">
      <div className="rounded-3xl border bg-card divide-y divide-border/60">
        {visibleItems.map((it) => {
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

      <button onClick={signOut}
        className="mt-4 flex w-full items-center gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-destructive active:bg-destructive/20">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/20"><LogOut className="h-5 w-5" /></div>
        <span className="flex-1 text-left text-sm font-bold">Cerrar sesión</span>
      </button>

      <p className="mt-6 text-center text-[10px] text-muted-foreground">Dlovebox · Admin Panel</p>
    </AdminShell>
  );
}
