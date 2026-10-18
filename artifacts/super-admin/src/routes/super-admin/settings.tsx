import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldPlus, ShieldX, ShieldCheck } from "lucide-react";
import { listFactors, unenrollFactor } from "@/lib/mfa";
import { MfaEnrollmentFlow } from "@/components/admin/MfaEnrollmentFlow";

export const Route = createFileRoute("/super-admin/settings")({
  head: () => ({ meta: [{ title: "Ajustes — Super Admin" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [enrolling, setEnrolling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: listFactors,
  });

  const verifiedCount = factors.filter((f) => f.status === "verified").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Ajustes — Seguridad</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verificación en dos pasos (TOTP) para esta cuenta de Super Admin.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Factores inscritos</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : factors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tienes ningún factor inscrito.
          </p>
        ) : (
          factors.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <span className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {f.friendlyName ?? "Factor TOTP"}
                {f.status === "unverified" ? (
                  <span className="text-xs text-muted-foreground">(sin verificar)</span>
                ) : null}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(f.id)}
              >
                <ShieldX className="h-3.5 w-3.5" /> Quitar
              </Button>
            </div>
          ))
        )}

        <Button className="rounded-full" onClick={() => setEnrolling(true)}>
          <ShieldPlus className="h-4 w-4" />
          {verifiedCount === 0 ? "Inscribir los dos factores obligatorios" : "Agregar otro factor"}
        </Button>
      </section>

      <Dialog open={enrolling} onOpenChange={setEnrolling}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Inscripción de factor</DialogTitle>
          </DialogHeader>
          <MfaEnrollmentFlow
            allowCancel
            stepsToRun={verifiedCount === 0 ? 2 : 1}
            onCancel={() => setEnrolling(false)}
            onComplete={() => {
              setEnrolling(false);
              qc.invalidateQueries({ queryKey: ["mfa-factors"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">¿Quitar este factor?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Si te quedas sin ningún factor verificado, la próxima vez que entres no se te pedirá
              el segundo paso (salvo que la plataforma lo exija para todas las cuentas).
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                onClick={async () => {
                  await unenrollFactor(confirmDelete);
                  toast("Factor eliminado");
                  setConfirmDelete(null);
                  qc.invalidateQueries({ queryKey: ["mfa-factors"] });
                }}
              >
                Sí, quitar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
