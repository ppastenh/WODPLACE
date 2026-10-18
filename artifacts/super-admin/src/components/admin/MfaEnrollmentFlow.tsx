import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  cleanupUnverifiedFactors,
  createAttemptLimiter,
  enrollTotpFactor,
  verifyFactor,
} from "@/lib/mfa";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

type PendingFactor = { factorId: string; secret: string; otpauthUri: string; qrDataUrl: string };

/**
 * Inscribe los DOS factores obligatorios, uno a la vez. El QR se genera
 * 100% local (librería `qrcode`, sin red) a partir del URI otpauth:// que
 * ya llegó desde Supabase -- nunca se manda a ningún servicio externo. El
 * secreto solo vive en el estado de este componente mientras dura la
 * inscripción; se descarta (nunca se guarda en localStorage/consola) apenas
 * se verifica o se cancela.
 */
export function MfaEnrollmentFlow({
  onComplete,
  onCancel,
  allowCancel,
  stepsToRun = 2,
}: {
  onComplete: () => void;
  onCancel?: () => void;
  allowCancel: boolean;
  /** 2 = inscripción inicial obligatoria (los dos factores de una vez).
   *  1 = agregar un solo factor nuevo (ej. tras borrar uno, desde Ajustes). */
  stepsToRun?: 1 | 2;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, setPending] = useState<PendingFactor | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limiterRef = useRef(createAttemptLimiter());

  // Al desmontar sin terminar, limpia cualquier factor sin verificar que
  // haya quedado de un intento interrumpido.
  useEffect(() => {
    return () => {
      void cleanupUnverifiedFactors();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function startStep() {
      setError(null);
      setBusy(true);
      try {
        const friendlyName = step === 1 ? "Factor principal" : "Factor de respaldo";
        const { factorId, secret, otpauthUri } = await enrollTotpFactor(
          `${friendlyName} ${Date.now()}`,
        );
        const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 });
        if (!cancelled) setPending({ factorId, secret, otpauthUri, qrDataUrl });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo generar el código QR");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void startStep();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function handleVerify() {
    if (!pending || code.length !== 6) return;
    const cooldown = limiterRef.current.checkCooldown();
    if (cooldown) {
      setError(cooldown);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyFactor(pending.factorId, code);
      limiterRef.current.recordSuccess();
      // El secreto deja de existir en memoria apenas se verifica.
      setPending(null);
      setCode("");
      if (step === 1 && stepsToRun === 2) {
        setStep(2);
      } else {
        toast.success(
          stepsToRun === 2
            ? "Los dos factores quedaron inscritos y verificados."
            : "Factor inscrito y verificado.",
        );
        onComplete();
      }
    } catch {
      const cooldownMsg = limiterRef.current.recordFailure();
      setError(cooldownMsg ?? "Código incorrecto. Revisa la hora de tu teléfono e intenta de nuevo.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {stepsToRun === 2
            ? `Inscribir segundo factor — Paso ${step} de 2`
            : "Agregar un factor nuevo"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {stepsToRun === 1
            ? "Escanéalo con tu app de autenticación, o guarda el código de configuración impreso en un lugar seguro."
            : step === 1
              ? "Primero, tu factor principal: escanéalo con tu app de autenticación (Google Authenticator, Authy, 1Password, etc.)."
              : "Ahora el factor de respaldo — escanéalo en OTRO dispositivo, o guarda el código de configuración impreso en un lugar seguro. Si pierdes el principal, este es tu única forma de volver a entrar sin pedir ayuda."}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {pending ? (
        <div className="space-y-4">
          <div className="flex justify-center rounded-xl border border-border bg-card p-4">
            <img src={pending.qrDataUrl} alt="Código QR para inscribir el factor" width={220} height={220} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              O ingresa este código de configuración a mano, o guárdalo impreso:
            </p>
            <p className="mt-1 break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm">
              {pending.secret}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Ingresa el código de 6 dígitos para verificar:</p>
            <InputOTP maxLength={6} value={code} onChange={setCode} disabled={busy}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleVerify} disabled={busy || code.length !== 6} className="rounded-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verificar
            </Button>
            {allowCancel ? (
              <Button variant="outline" className="rounded-full" onClick={onCancel} disabled={busy}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Generando código…</p>
      )}
    </div>
  );
}
