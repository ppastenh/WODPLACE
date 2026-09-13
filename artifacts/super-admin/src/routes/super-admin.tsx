import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getSuperAdminSession } from "@/lib/super-admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTabs } from "@/components/admin/AdminTabs";

export const Route = createFileRoute("/super-admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Super Admin · Panel General" },
      {
        name: "description",
        content:
          "Panel de control del super administrador: gestión global de boxes, aprobaciones y permisos.",
      },
      { property: "og:title", content: "Super Admin · Panel General" },
      { property: "og:description", content: "Gestión global de boxes, aprobaciones y permisos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { session, isSuperAdmin } = await getSuperAdminSession();
    if (!session) throw redirect({ to: "/auth" });
    if (!isSuperAdmin) throw redirect({ to: "/auth", search: { denied: true } });
    return { email: session.user.email ?? "" };
  },
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  const { email } = Route.useRouteContext();
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader email={email} />
      <AdminTabs />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
