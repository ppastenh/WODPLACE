import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Route as SuperAdminRoute } from "@/routes/super-admin";
import { logAudit } from "@/lib/audit-log";

export const Route = createFileRoute("/super-admin/support")({
  head: () => ({ meta: [{ title: "Soporte — Super Admin" }] }),
  component: SupportPage,
});

type SupportReport = {
  id: string;
  reporterEmail: string;
  boxId: string;
  boxName: string;
  description: string;
  imageUrl: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

async function fetchSupportReports(): Promise<SupportReport[]> {
  const { data, error } = await supabase
    .from("support_reports")
    .select("id, reporter_email, box_id, description, image_url, created_at, resolved_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  const boxIds = [...new Set(rows.map((r) => r.box_id))];
  let boxNameById = new Map<string, string>();
  if (boxIds.length) {
    const { data: boxes, error: boxErr } = await supabase.from("boxes").select("id, name").in("id", boxIds);
    if (boxErr) throw boxErr;
    boxNameById = new Map((boxes ?? []).map((b) => [b.id, b.name]));
  }

  return rows.map((r) => ({
    id: r.id,
    reporterEmail: r.reporter_email,
    boxId: r.box_id,
    boxName: boxNameById.get(r.box_id) ?? "(box sin nombre)",
    description: r.description,
    imageUrl: r.image_url,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  }));
}

function SupportPage() {
  const { email } = SuperAdminRoute.useRouteContext();
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["support-reports"],
    queryFn: fetchSupportReports,
  });

  const resolve = useMutation({
    mutationFn: async (report: SupportReport) => {
      const { error } = await supabase
        .from("support_reports")
        .update({ resolved_at: new Date().toISOString(), resolved_by: email })
        .eq("id", report.id);
      if (error) throw error;
    },
    onSuccess: (_d, report) => {
      toast.success("Reporte marcado como resuelto");
      void logAudit(email, "support.resolve", "support_report", report.id, {
        boxId: report.boxId,
        reporterEmail: report.reporterEmail,
      });
      qc.invalidateQueries({ queryKey: ["support-reports"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo resolver"),
  });

  const reports = data ?? [];
  const pending = reports.filter((r) => !r.resolvedAt);
  const resolved = reports.filter((r) => r.resolvedAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Soporte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Problemas y bugs de la app que los admins de box te reportan directamente a vos.
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudieron cargar los reportes: {String(error)}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Cargando…
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Sin reportes todavía. ✅
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" /> Pendientes ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay reportes pendientes.</p>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <ReportCard key={r.id} report={r} onResolve={() => resolve.mutate(r)} resolving={resolve.isPending} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-success">
              <CheckCircle2 className="h-4 w-4" /> Resueltos ({resolved.length})
            </h2>
            <div className="space-y-3">
              {resolved.map((r) => (
                <ReportCard key={r.id} report={r} onResolve={() => {}} resolving={false} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ReportCard({
  report,
  onResolve,
  resolving,
}: {
  report: SupportReport;
  onResolve: () => void;
  resolving: boolean;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="text-sm font-semibold">{report.boxName}</p>
        <p className="text-xs text-muted-foreground">
          {report.reporterEmail} · {new Date(report.createdAt).toLocaleString("es-CL")}
        </p>
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground">{report.description}</p>
      {report.imageUrl ? (
        <img
          src={report.imageUrl}
          alt="Captura adjunta al reporte"
          className="max-h-64 w-full rounded-xl object-cover"
        />
      ) : null}
      {!report.resolvedAt ? (
        <Button onClick={onResolve} disabled={resolving} variant="outline" className="w-full rounded-full">
          <CheckCircle2 className="h-4 w-4" /> Marcar resuelto
        </Button>
      ) : null}
    </div>
  );
}
