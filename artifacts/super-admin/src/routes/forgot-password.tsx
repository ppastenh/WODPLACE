import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Super Admin · Recuperar contraseña" }],
  }),
  component: ForgotPasswordPage,
});

/**
 * Always shows the same outcome, whether or not the email belongs to a
 * real account — never reveal which emails are registered.
 */
function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Swallowed on purpose.
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="mb-8 flex flex-col items-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground">Super Admin</h1>
        <p className="text-sm text-muted-foreground">Recuperar contraseña</p>
      </div>

      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Mail className="h-8 w-8 text-primary" />
            <p className="font-semibold text-foreground">Si el correo existe, te enviamos un enlace</p>
            <p className="text-sm text-muted-foreground">Revisa tu bandeja de entrada (y spam).</p>
            <Link to="/auth" className="mt-2 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ingresa tu correo y te enviaremos un enlace para elegir una contraseña nueva.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="rounded-full" />
            </div>
            <Button type="submit" disabled={loading} className="h-12 w-full rounded-full font-semibold">
              {loading ? "Enviando…" : "Enviar enlace"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
