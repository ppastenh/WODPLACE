import { useEffect, useState } from "react";
import { createFileRoute, redirect, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { getSuperAdminSession } from "@/lib/super-admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { MfaChallengeScreen } from "@/components/admin/MfaChallengeScreen";
import { Button } from "@/components/ui/button";
import { getAssuranceLevel, isAal2Enforced, listFactors } from "@/lib/mfa";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, LogOut } from "lucide-react";

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

type MfaGate = "loading" | "ok" | "challenge" | "no-factor-blocked";

/**
 * Compuerta de aal2, por encima del Outlet -- nunca cambia nada para una
 * cuenta sin factores inscritos salvo que el interruptor global esté
 * encendido (ver ESTADO.md, S3-B): hoy esa es siempre la rama "ok", igual
 * que antes de este cambio.
 *
 * "no-factor-blocked" (2026-10-18, reemplaza la inscripción forzada
 * anterior): nunca obliga a inscribir nada en el momento -- solo avisa y
 * deja elegir. Ajustes sigue siendo alcanzable desde ahí mismo (la única
 * ruta que esta compuerta deja pasar igual) para quien sí quiera
 * inscribirse ahora.
 */
function SuperAdminLayout() {
  const { email } = Route.useRouteContext();
  const [gate, setGate] = useState<MfaGate>("loading");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onSettings = pathname.startsWith("/super-admin/settings");

  useEffect(() => {
    let cancelled = false;
    async function evaluate() {
      const [aal, factors, enforced] = await Promise.all([
        getAssuranceLevel(),
        listFactors(),
        isAal2Enforced(),
      ]);
      if (cancelled) return;
      const hasVerifiedFactor = factors.some((f) => f.status === "verified");
      if (hasVerifiedFactor && aal.currentLevel === "aal1") {
        setGate("challenge");
      } else if (!hasVerifiedFactor && enforced) {
        setGate("no-factor-blocked");
      } else {
        setGate("ok");
      }
    }
    void evaluate();
    return () => {
      cancelled = true;
    };
  }, []);

  if (gate === "loading") return null;
  if (gate === "challenge") {
    return <MfaChallengeScreen onVerified={() => setGate("ok")} />;
  }
  if (gate === "no-factor-blocked" && !onSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Esta cuenta no tiene segundo factor, por eso no puede usar el panel de super admin.
            Puedes inscribirlo en Ajustes o entrar con tu cuenta de super admin.
          </p>
          <div className="space-y-2">
            <Link to="/super-admin/settings">
              <Button className="w-full rounded-full">Ir a Ajustes</Button>
            </Link>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => void supabase.auth.signOut()}
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
