import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

const MIN_PASSWORD_LENGTH = 6;
const RECOVERY_EVENT_TIMEOUT_MS = 4000;

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Super Admin · Nueva contraseña" }],
  }),
  component: ResetPasswordPage,
});

type Phase = "checking" | "invalid-link" | "form" | "success";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        resolvedRef.current = true;
        setPhase("form");
      }
    });
    const timer = setTimeout(() => {
      if (!resolvedRef.current) setPhase("invalid-link");
    }, RECOVERY_EVENT_TIMEOUT_MS);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut().catch(() => {});
      setPhase("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="mb-8 flex flex-col items-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground">Super Admin</h1>
      </div>

      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        {phase === "checking" ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Verificando enlace...</p>
        ) : phase === "invalid-link" ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-semibold text-foreground">Este enlace no es válido</p>
            <p className="text-sm text-muted-foreground">
              Puede haber vencido, ya haberse usado, o faltar el código del enlace. Pide uno nuevo.
            </p>
            <Link to="/forgot-password" className="mt-2 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              Pedir un enlace nuevo
            </Link>
          </div>
        ) : phase === "success" ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <p className="font-semibold text-foreground">Contraseña actualizada</p>
            <p className="text-sm text-muted-foreground">Ya puedes iniciar sesión con tu contraseña nueva.</p>
            <Button onClick={() => navigate({ to: "/auth" })} className="mt-2 h-12 w-full rounded-full font-semibold">
              Iniciar sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-center font-semibold text-foreground">Elige una contraseña nueva</p>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña nueva</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className="rounded-full"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirma la contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(""); }}
                required
                autoComplete="new-password"
                className="rounded-full"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="h-12 w-full rounded-full font-semibold">
              {loading ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
