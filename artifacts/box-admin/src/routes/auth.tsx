import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { claimPendingInvite, storePendingInviteCode } from "@/lib/pendingInvite";
import type { CheckInviteCodeResult } from "@workspace/api-zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dumbbell, Mail, Ticket } from "lucide-react";

type InviteCheckOutcome = "valid" | "invalid" | "rate_limited" | "error";

const INVALID_CODE_MESSAGE = "El código de invitación no es válido, no corresponde a este correo o venció.";
const RATE_LIMITED_MESSAGE = "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
const CHECK_ERROR_MESSAGE = "No pudimos validar el código. Intenta de nuevo.";
const MAX_RESENDS = 3;
const RESEND_COOLDOWN_MS = 30_000;

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
      { title: "WODPLACE — Acceso" },
      { name: "description", content: "Inicia sesión o crea tu cuenta de administrador de WODPLACE." },
      { property: "og:title", content: "WODPLACE — Acceso" },
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
  const [formError, setFormError] = useState<string | null>(null);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null);
  const [resendCount, setResendCount] = useState(0);
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number | null>(null);

  // Persist the code the moment it arrives via the link, so it survives
  // even if signUp needs email confirmation (session appears later, on a
  // different page load) — see lib/pendingInvite.ts.
  useEffect(() => {
    if (invite) storePendingInviteCode(invite.trim());
  }, [invite]);

  /**
   * Read-only pre-flight so a bad code is rejected HERE, before creating
   * any account — not only later when the post-confirmation reclaim runs
   * (see _authenticated/route.tsx). Fails CLOSED on any failure (429,
   * network, anything else): a fake code repeated past the point this
   * starts failing must never fall through to creating the account
   * anyway — that's exactly how a rate-limited check turned into a
   * bypass before. Only an EMPTY code field skips this entirely
   * (handled by the caller).
   */
  async function checkInviteCodeValid(code: string, forEmail: string): Promise<InviteCheckOutcome> {
    try {
      const { valid } = await apiFetch<CheckInviteCodeResult>("/invites/check", {
        method: "POST",
        body: JSON.stringify({ code, email: forEmail }),
      });
      return valid ? "valid" : "invalid";
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) return "rate_limited";
      return "error";
    }
  }

  async function resendConfirmationEmail() {
    if (!signupSuccessEmail || resendCount >= MAX_RESENDS) return;
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: signupSuccessEmail });
      if (error) throw error;
      setResendCount((c) => c + 1);
      setResendCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
      toast.success("Correo reenviado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reenviar el correo.");
    }
  }

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
    setFormError(null);
    setLoading(true);
    try {
      const trimmedInvite = inviteCode.trim();
      if (trimmedInvite) {
        // Validate code+email together BEFORE creating any account or
        // signing in — the account itself is never worse off than before
        // (an empty code still creates a normal, role-less account), but
        // a bad code now fails loudly here instead of silently later.
        // Any outcome other than "valid" blocks the submit — including
        // rate-limited or a network error, so hammering this with fake
        // codes can't fall through into creating the account anyway.
        const outcome = await checkInviteCodeValid(trimmedInvite, email);
        if (outcome !== "valid") {
          setFormError(
            outcome === "invalid"
              ? INVALID_CODE_MESSAGE
              : outcome === "rate_limited"
                ? RATE_LIMITED_MESSAGE
                : CHECK_ERROR_MESSAGE,
          );
          setLoading(false);
          return;
        }
        storePendingInviteCode(trimmedInvite);
      }

      if (mode === "signup") {
        // The invite code rides along in the confirmation link itself
        // (not just sessionStorage) so it survives confirming from a
        // DIFFERENT browser/device than the one that signed up — e.g.
        // signing up on desktop, confirming from the phone's inbox. "/"
        // (index.tsx) reads it back out and stores it the same way, right
        // before the session (from Supabase's own redirect) lands there.
        // No new exposure: the code already travels in plain text in the
        // invite email itself (approved earlier), to the same inbox.
        const base = `${window.location.origin}${nextPath ?? "/"}`;
        const emailRedirectTo = trimmedInvite
          ? `${base}?invite=${encodeURIComponent(trimmedInvite)}`
          : base;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo, data: { full_name: name } },
        });
        if (error) throw error;
        if (!(await supabase.auth.getSession()).data.session) {
          // Email confirmation is required for this project — no session
          // yet, so the invite can't be claimed until the user confirms
          // and signs in; it stays stashed for that later visit (see
          // _authenticated/route.tsx). Replace the form with the success
          // screen instead of leaving it visible with the password still
          // filled in.
          setSignupSuccessEmail(email);
          setPassword("");
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await finishLogin();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (signupSuccessEmail) {
    const resendDisabled = resendCount >= MAX_RESENDS || (resendCooldownUntil !== null && Date.now() < resendCooldownUntil);
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
        <div className="mb-8 flex flex-col items-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Mail className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">WODPLACE</h1>
        </div>
        <div className="w-full max-w-sm space-y-4 rounded-3xl border bg-card p-6 text-center">
          <h2 className="text-lg font-bold">Tu cuenta fue creada</h2>
          <p className="text-sm text-muted-foreground">
            Te enviamos un correo a <strong>{signupSuccessEmail}</strong>. Ábrelo y confírmalo para continuar.
          </p>
          <p className="text-xs text-muted-foreground">Si no lo encuentras, revisa la carpeta de spam.</p>
          <Button
            type="button"
            variant="outline"
            disabled={resendDisabled}
            onClick={resendConfirmationEmail}
            className="w-full rounded-full"
          >
            {resendCount >= MAX_RESENDS ? "Ya reenviado varias veces" : "Reenviar correo"}
          </Button>
          <Button
            type="button"
            onClick={() => {
              setSignupSuccessEmail(null);
              setMode("signin");
              setFormError(null);
            }}
            className="w-full rounded-full"
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="mb-8 flex flex-col items-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Dumbbell className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight">WODPLACE</h1>
        <p className="text-sm text-muted-foreground">Panel de administración</p>
      </div>

      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-3xl border bg-card p-6">
        <div className="flex rounded-full bg-secondary p-1 text-sm">
          <button type="button" onClick={() => { setMode("signin"); setFormError(null); }}
            className={`flex-1 rounded-full py-2 font-medium ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Iniciar sesión
          </button>
          <button type="button" onClick={() => { setMode("signup"); setFormError(null); }}
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

        <div className="space-y-2">
          <Label htmlFor="invite" className="flex items-center gap-1.5">
            <Ticket className="h-3.5 w-3.5" /> Código de invitación
            <span className="text-[10px] font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="invite"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Ej. ABCD23XYZ7MNPQ"
            autoComplete="off"
          />
        </div>

        {formError && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full rounded-full h-12 font-semibold">
          {loading ? "Cargando..." : mode === "signin" ? "Ingresar" : "Crear cuenta"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Con un código de invitación válido, tu cuenta recibe el acceso que te asignaron
          apenas {mode === "signin" ? "inicies sesión" : "confirmes tu correo e inicies sesión"}.
        </p>
      </form>
    </div>
  );
}
