import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { claimPendingInvite, storePendingInviteCode } from "@/lib/pendingInvite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dumbbell, Ticket } from "lucide-react";

const authSearchSchema = z.object({
  invite: z.string().trim().min(1).max(64).optional(),
  next: z.string().optional(),
});

/** Only same-origin relative paths are allowed as post-login redirects. */
function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Dlovebox — Acceso" },
      { name: "description", content: "Inicia sesión o crea tu cuenta de administrador Dlovebox." },
      { property: "og:title", content: "Dlovebox — Acceso" },
      { property: "og:description", content: "Acceso al panel de administración." },
    ],
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const next = safeNext(search.next);
    if (next) throw redirect({ href: next });
    throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { invite, next } = Route.useSearch();
  const nextPath = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">(invite ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState(invite ?? "");
  const [loading, setLoading] = useState(false);

  // Persist the code the moment it arrives via the link, so it survives
  // even if signUp needs email confirmation (session appears later, on a
  // different page load) — see lib/pendingInvite.ts.
  useEffect(() => {
    if (invite) storePendingInviteCode(invite.trim());
  }, [invite]);

  async function finishLogin() {
    const result = await claimPendingInvite();
    if (result.claimed) {
      toast.success("Invitación aplicada: ya tienes el nuevo acceso.");
    } else if (result.message) {
      toast.error(result.message);
    }
    if (nextPath) { window.location.href = nextPath; return; }
    window.location.href = "/dashboard";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedInvite = inviteCode.trim();
      if (trimmedInvite) storePendingInviteCode(trimmedInvite);

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${nextPath ?? "/"}`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (!(await supabase.auth.getSession()).data.session) {
          // Email confirmation is required for this project — no session
          // yet, so the invite can't be claimed until the user confirms
          // and signs in; it stays stashed for that later visit.
          toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await finishLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="mb-8 flex flex-col items-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Dumbbell className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Dlovebox</h1>
        <p className="text-sm text-muted-foreground">Panel de administración</p>
      </div>

      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-3xl border bg-card p-6">
        <div className="flex rounded-full bg-secondary p-1 text-sm">
          <button type="button" onClick={() => setMode("signin")}
            className={`flex-1 rounded-full py-2 font-medium ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Iniciar sesión
          </button>
          <button type="button" onClick={() => setMode("signup")}
            className={`flex-1 rounded-full py-2 font-medium ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Crear cuenta
          </button>
        </div>

        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        </div>

        {mode === "signin" && (
          <Link to="/forgot-password" className="block text-right text-xs font-semibold text-primary">
            ¿Olvidaste tu contraseña?
          </Link>
        )}

        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="invite" className="flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5" /> Código de invitación
              <span className="text-[10px] font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="invite"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Ej. ABCD23XYZ7"
              autoComplete="off"
            />
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full rounded-full h-12 font-semibold">
          {loading ? "Cargando..." : mode === "signin" ? "Ingresar" : "Crear cuenta"}
        </Button>

        {mode === "signup" && (
          <p className="text-center text-xs text-muted-foreground">
            Con un código de invitación válido, tu cuenta recibe el acceso que te asignaron
            apenas inicies sesión.
          </p>
        )}
      </form>
    </div>
  );
}
