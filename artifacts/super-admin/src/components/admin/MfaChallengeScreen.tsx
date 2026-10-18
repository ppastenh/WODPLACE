import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { createAttemptLimiter, listFactors, verifyFactor } from "@/lib/mfa";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";

/**
 * Bloquea el panel hasta completar el segundo factor -- se muestra SOLO
 * cuando la cuenta ya tiene un factor verificado y la sesión actual sigue
 * en aal1 (ver super-admin.tsx). Una cuenta sin factores nunca ve esta
 * pantalla.
 */
export function MfaChallengeScreen({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limiterRef = useRef(createAttemptLimiter());

  async function handleVerify() {
    if (code.length !== 6) return;
    const cooldown = limiterRef.current.checkCooldown();
    if (cooldown) {
      setError(cooldown);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const factors = await listFactors();
      const verified = factors.find((f) => f.status === "verified");
      if (!verified) throw new Error("No se encontró un factor verificado en esta cuenta.");
      await verifyFactor(verified.id, code);
      limiterRef.current.recordSuccess();
      onVerified();
    } catch {
      const cooldownMsg = limiterRef.current.recordFailure();
      setError(cooldownMsg ?? "Código incorrecto. Revisa la hora de tu teléfono e intenta de nuevo.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Verificación en dos pasos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta cuenta tiene un segundo factor inscrito. Ingresa el código de 6 dígitos de tu app
            de autenticación para continuar.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode} disabled={busy}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={handleVerify}
          disabled={busy || code.length !== 6}
          className="w-full rounded-full"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Verificar
        </Button>
        <Button
          variant="ghost"
          className="w-full rounded-full text-muted-foreground"
          onClick={() => void supabase.auth.signOut()}
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
