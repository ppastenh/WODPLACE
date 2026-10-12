import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoxProvider, type BoxOption } from "@/lib/box-context";
import { claimPendingInviteOnce } from "@/lib/pendingInvite";

const STAFF_ROLES = new Set(["super_admin", "box_admin", "coach"]);

type RoleRow = { role: string; box_id: string | null };

type AdminContext = {
  isStaff: boolean;
  isSuperAdmin: boolean;
  boxes: BoxOption[];
  /** Raw role rows — lets downstream code tell a real admin from a coach,
   *  per the currently active box (BoxProvider derives `isAdmin` from this). */
  roles: RoleRow[];
  /** This signed-in account's own Supabase Auth id — BoxProvider compares
   *  it against each box's owner_user_id to derive `isOwner` (Fase B/B1:
   *  contracts are owner/super_admin-only, not just box_admin). */
  userId: string;
};

async function resolveAdminContext(userId: string): Promise<AdminContext> {
  const { data: roleRows, error } = await supabase
    .from("user_roles")
    .select("role, box_id")
    .eq("user_id", userId);

  if (error || !roleRows) return { isStaff: false, isSuperAdmin: false, boxes: [], roles: [], userId };

  const isSuperAdmin = roleRows.some((r) => r.role === "super_admin");
  const isStaff = roleRows.some((r) => STAFF_ROLES.has(r.role));
  if (!isStaff) return { isStaff: false, isSuperAdmin: false, boxes: [], roles: [], userId };

  let query = supabase.from("boxes").select("id, name, photo_url, owner_user_id").order("name");
  if (!isSuperAdmin) {
    const boxIds = [...new Set(roleRows.map((r) => r.box_id).filter((id): id is string => !!id))];
    if (boxIds.length === 0) return { isStaff: true, isSuperAdmin: false, boxes: [], roles: roleRows, userId };
    query = query.in("id", boxIds);
  }
  const { data: boxes } = await query;
  return { isStaff: true, isSuperAdmin, boxes: boxes ?? [], roles: roleRows, userId };
}

export const Route = createFileRoute("/_authenticated/_admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    // Defensive, not load-bearing: _authenticated's own beforeLoad (the
    // parent route) already awaits this same shared promise before
    // returning, so by the time this runs it's normally already
    // settled. Awaiting it again here is a cheap no-op in that case —
    // it only matters if that ordering guarantee ever doesn't hold, so
    // this role query is never the thing that reads stale data. Bounded
    // to at most 15s (apiClient.ts's default fetch timeout), so this
    // beforeLoad — and the pendingComponent shown while it runs — can
    // never hang indefinitely either.
    await claimPendingInviteOnce();
    return resolveAdminContext(user.id);
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { isStaff, isSuperAdmin, boxes, roles, userId } = Route.useRouteContext();
  if (!isStaff) return <NoAccess />;
  if (boxes.length === 0) return <NoBox />;
  return (
    <BoxProvider boxes={boxes} isSuperAdmin={isSuperAdmin} roles={roles} userId={userId}>
      <Outlet />
    </BoxProvider>
  );
}

async function onSignOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth";
}

function Shell({
  title,
  message,
  showClaimLink,
}: {
  title: string;
  message: string;
  showClaimLink?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/15 text-destructive">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-xl font-bold">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{message}</p>
      {showClaimLink && (
        <Link to="/claim-invite" className="mt-4 text-xs font-semibold text-primary underline">
          Tengo un código de invitación
        </Link>
      )}
      <Button variant="outline" onClick={onSignOut} className="mt-6 rounded-full">
        <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
      </Button>
      <Link to="/auth" className="mt-4 text-xs text-muted-foreground underline">
        Volver al inicio de sesión
      </Link>
    </div>
  );
}

function NoAccess() {
  return (
    <Shell
      title="Acceso restringido"
      message="Tu cuenta no tiene permisos de administrador. Contacta al administrador del box para solicitar acceso."
      showClaimLink
    />
  );
}

function NoBox() {
  return (
    <Shell
      title="Sin box asignado"
      message="Tu cuenta tiene rol de staff pero no está asociada a ningún box. Contacta a un super administrador."
    />
  );
}
