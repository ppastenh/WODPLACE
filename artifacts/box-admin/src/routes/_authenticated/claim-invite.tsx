import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Ticket, LogOut } from "lucide-react";
import type { ClaimInviteResult } from "@workspace/api-zod";

/**
 * Manual entry point for someone who already has a session (athlete
 * account or otherwise) and wants to redeem a staff invite without
 * going through /auth — e.g. reached from the "Acceso restringido"
 * screen in _admin.tsx, or typed in directly.
 */
export const Route = createFileRoute("/_authenticated/claim-invite")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Código de invitación — Dlovebox" }],
  }),
  component: ClaimInvitePage,
});

function ClaimInvitePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await apiFetch<ClaimInviteResult>("/invites/claim", {
        method: "POST",
        body: JSON.stringify({ code: trimmed }),
      });
      toast.success("Invitación aplicada: ya tienes el nuevo acceso.");
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-3xl border bg-card p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Ticket className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold">Tengo un código de invitación</h1>
          <p className="text-xs text-muted-foreground">
            Ingresa el código que te compartió el administrador de tu box para activar tu acceso.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="claim-code">Código</Label>
          <Input
            id="claim-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej. ABCD23XYZ7MNPQ"
            autoComplete="off"
            required
          />
        </div>

        <Button type="submit" disabled={loading || !code.trim()} className="w-full rounded-full h-11 font-semibold">
          {loading ? "Verificando..." : "Activar acceso"}
        </Button>

        <Button type="button" variant="ghost" onClick={onSignOut} className="w-full rounded-full text-muted-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
