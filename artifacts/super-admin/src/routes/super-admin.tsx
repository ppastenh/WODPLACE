import { useEffect, useState } from "react";
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getSuperAdminSession } from "@/lib/super-admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { MfaChallengeScreen } from "@/components/admin/MfaChallengeScreen";
import { MfaEnrollmentFlow } from "@/components/admin/MfaEnrollmentFlow";
import { getAssuranceLevel, isAal2Enforced, listFactors } from "@/lib/mfa";

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

type MfaGate = "loading" | "ok" | "challenge" | "forced-enroll";

/**
 * Compuerta de aal2, por encima del Outlet -- nunca cambia nada para una
 * cuenta sin factores inscritos salvo que el interruptor global esté
 * encendido (ver ESTADO.md, S3-B): hoy esa es siempre la rama "ok", igual
 * que antes de este cambio.
 */
function SuperAdminLayout() {
  const { email } = Route.useRouteContext();
  const [gate, setGate] = useState<MfaGate>("loading");

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
        setGate("forced-enroll");
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
  if (gate === "forced-enroll") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Esta plataforma ahora exige verificación en dos pasos para todas las cuentas de Super
            Admin. Inscribe tus dos factores para continuar.
          </p>
          <MfaEnrollmentFlow allowCancel={false} onComplete={() => setGate("ok")} />
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
