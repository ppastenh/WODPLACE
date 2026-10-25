import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { UserCog, Layers, Settings, LifeBuoy, Bell, FolderOpen, LogOut, ChevronRight, Ticket, Flame, User, Flag, FileCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { countPendingReports } from "@/lib/community-reports";
import { countUnseenAcceptances } from "@/lib/contract-acceptances";
import { useBox } from "@/lib/box-context";

export const Route = createFileRoute("/_authenticated/_admin/more/")({
  head: () => ({
    meta: [
      { title: "Más — WODPLACE" },
      { name: "description", content: "Coaches, planes, configuración, reportes y más." },
      { property: "og:title", content: "Más — WODPLACE" },
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
  { to: "/more/reportes-comunidad", label: "Reportes de Comunidad", icon: Flag, group: "Comunidad" },
  { to: "/more/coaches", label: "Coaches", icon: UserCog, group: "Equipo" },
  { to: "/more/invites", label: "Invitar Staff", icon: Ticket, group: "Equipo" },
  { to: "/more/reports", label: "Ayuda y soporte", icon: LifeBuoy, group: "Ayuda y soporte" },
  { to: "/more/settings", label: "Configuración", icon: Settings, group: "Configuración" },
  { to: "/more/plans", label: "Planes", icon: Layers, group: "Configuración" },
  { to: "/more/files", label: "Contratos", icon: FolderOpen, group: "Configuración" },
  { to: "/more/aceptaciones-contratos", label: "Aceptaciones de contratos", icon: FileCheck, group: "Configuración" },
  { to: "/more/my-profile", label: "Mi perfil", icon: User, group: "Mi cuenta" },
];
const GROUP_ORDER = ["Comunidad", "Equipo", "Ayuda y soporte", "Configuración", "Mi cuenta"];

function MorePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { boxId, isAdmin, isOwner, myPermissions } = useBox();
  // Contador de reportes pendientes del box (solo administradores; un coach no hace esta consulta).
  const unseenAcceptances = useQuery({
    queryKey: ["contract-acceptances-count", boxId],
    queryFn: () => countUnseenAcceptances(boxId),
    enabled: isAdmin && !!boxId,
  });
  const pendingReports = useQuery({
    queryKey: ["community-reports-count", boxId],
    queryFn: () => countPendingReports(boxId),
    enabled: isAdmin && !!boxId,
  });

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
    // F1: los reportes de Comunidad son solo de administradores del box (la base también lo exige).
    if (it.to === "/more/reportes-comunidad") return isAdmin;
    // F3: las aceptaciones de contratos las ven dueño, administrador del box y super admin (la base también lo exige).
    if (it.to === "/more/aceptaciones-contratos") return isAdmin;
    // Fase B/B1: contratos son solo del dueño del box (o super_admin) —
    // ni un box_admin que no sea el dueño, ni un coach, los ven.
    if (it.to === "/more/files") return isOwner;
    // S3.A de la auditoría de seguridad (2026-10-14): Planes edita precios —
    // es financiero, solo administrador/dueño/super admin.
    if (it.to === "/more/plans") return isAdmin;
    // Barrido de presentación (2026-10-14): crear/editar un WOD exige el
    // permiso wod_of_day_publish del coach (base de datos, Lote 2).
    if (it.to === "/more/wod") return isAdmin || !!myPermissions?.wod_of_day_publish;
    // Agregar/quitar coaches y editar sus permisos es solo de
    // administrador/dueño/super admin -- la base ya lo exige para
    // cualquier cambio real, esta pantalla no tenía ninguna guardia.
    if (it.to === "/more/coaches") return isAdmin;
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
                    {it.to === "/more/aceptaciones-contratos" && (unseenAcceptances.data ?? 0) > 0 ? (
                      <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">{unseenAcceptances.data}</span>
                    ) : null}
                    {it.to === "/more/reportes-comunidad" && (pendingReports.data ?? 0) > 0 ? (
                      <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">{pendingReports.data}</span>
                    ) : null}
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

      <p className="mt-6 text-center text-[10px] text-muted-foreground">WODPLACE · Panel de administración</p>
    </AdminShell>
  );
}
