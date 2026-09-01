import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/_admin/more/settings")({
  head: () => ({ meta: [{ title: "Configuración — Dlovebox" }, { name: "description", content: "Configuración del panel." }, { property: "og:title", content: "Configuración — Dlovebox" }, { property: "og:description", content: "Configuración." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AdminShell title="Configuración" showBack>
      <div className="rounded-3xl border bg-card p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Cuenta</p>
        <p className="mt-1 text-sm font-semibold">{email || "—"}</p>
      </div>
      <Button variant="outline" onClick={signOut} className="mt-4 w-full rounded-full h-11 text-destructive border-destructive/30">
        <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
      </Button>
    </AdminShell>
  );
}
