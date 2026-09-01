import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoxProvider, type BoxOption } from "@/lib/box-context";

const STAFF_ROLES = new Set(["super_admin", "box_admin", "coach"]);

type AdminContext = {
  isStaff: boolean;
  isSuperAdmin: boolean;
  boxes: BoxOption[];
};

async function resolveAdminContext(userId: string): Promise<AdminContext> {
  const { data: roleRows, error } = await supabase
    .from("user_roles")
    .select("role, box_id")
    .eq("user_id", userId);

  if (error || !roleRows) return { isStaff: false, isSuperAdmin: false, boxes: [] };

  const isSuperAdmin = roleRows.some((r) => r.role === "super_admin");
  const isStaff = roleRows.some((r) => STAFF_ROLES.has(r.role));
  if (!isStaff) return { isStaff: false, isSuperAdmin: false, boxes: [] };

  let query = supabase.from("boxes").select("id, name").order("name");
  if (!isSuperAdmin) {
    const boxIds = [...new Set(roleRows.map((r) => r.box_id).filter((id): id is string => !!id))];
    if (boxIds.length === 0) return { isStaff: true, isSuperAdmin: false, boxes: [] };
    query = query.in("id", boxIds);
  }
  const { data: boxes } = await query;
  return { isStaff: true, isSuperAdmin, boxes: boxes ?? [] };
}

export const Route = createFileRoute("/_authenticated/_admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    return resolveAdminContext(user.id);
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { isStaff, isSuperAdmin, boxes } = Route.useRouteContext();
  if (!isStaff) return <NoAccess />;
  if (boxes.length === 0) return <NoBox />;
  return (
    <BoxProvider boxes={boxes} isSuperAdmin={isSuperAdmin}>
      <Outlet />
    </BoxProvider>
  );
}

async function onSignOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth";
}

function Shell({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/15 text-destructive">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-xl font-bold">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{message}</p>
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
