import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { createAttemptLimiter, listFactors, verifyFactor, type MfaFactor } from "@/lib/mfa";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2, LogOut, RefreshCw } from "lucide-react";

/**
 * Bloquea el panel hasta completar el segundo factor -- se muestra SOLO
 * cuando la cuenta ya tiene un factor verificado y la sesión actual sigue
 * en aal1 (ver super-admin.tsx). Una cuenta sin factores nunca ve esta
 * pantalla.
 *
 * Con dos factores verificados, el desafío se hace contra UNO solo a la
 * vez (así lo exige la API de Supabase) -- "Usar otro factor" cambia cuál,
 * para que el de respaldo sirva de verdad si el principal falla (perdido,
 * sin batería, etc.), en vez de quedar siempre fijo en el primero de la
 * lista.
 */
export function MfaChallengeScreen({ onVerified }: { onVerified: () => void }) {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limiterRef = useRef(createAttemptLimiter());

  useEffect(() => {
    let cancelled = false;
    listFactors().then((all) => {
      if (cancelled) return;
      const verified = all.filter((f) => f.status === "verified");
      setFactors(verified);
      setSelectedFactorId(verified[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFactor = factors.find((f) => f.id === selectedFactorId) ?? null;

  function switchFactor() {
    if (factors.length < 2) return;
    const currentIndex = factors.findIndex((f) => f.id === selectedFactorId);
    const next = factors[(currentIndex + 1) % factors.length];
    setSelectedFactorId(next.id);
    setCode("");
    setError(null);
  }

  async function handleVerify() {
    if (code.length !== 6 || !selectedFactorId) return;
    const cooldown = limiterRef.current.checkCooldown();
    if (cooldown) {
      setError(cooldown);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyFactor(selectedFactorId, code);
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

        {factors.length > 1 && selectedFactor ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Usando: <span className="font-medium text-foreground">{selectedFactor.friendlyName ?? "Factor"}</span>
            </span>
            <button
              type="button"
              onClick={switchFactor}
              disabled={busy}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" /> Usar otro factor
            </button>
          </div>
        ) : null}

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
          disabled={busy || code.length !== 6 || !selectedFactorId}
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
