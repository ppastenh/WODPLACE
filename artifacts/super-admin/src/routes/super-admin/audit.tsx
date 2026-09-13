import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/super-admin/audit")({
  head: () => ({ meta: [{ title: "Registro de Auditoría — Super Admin" }] }),
  component: AuditPage,
});

type AuditRow = {
  id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: unknown;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  "box.approve": "Aprobó un box",
  "box.reject": "Rechazó un box",
  "role.grant_box_admin": "Otorgó rol de Admin de Box",
  "role.grant_super_admin": "Otorgó rol de Super Admin",
  "role.revoke_super_admin": "Revocó rol de Super Admin",
  "report.resolve": "Resolvió un reporte",
};

async function fetchAuditLog(): Promise<AuditRow[]> {
  const { data, error } = await supabase
    .from("super_admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

/** Short, relative-ish timestamp for the collapsed row — full date only
 *  shows up once expanded. */
function shortWhen(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

function AuditRowItem({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span className="flex-1 truncate text-sm font-medium">
          {ACTION_LABELS[row.action] ?? row.action}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{shortWhen(row.created_at)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-3 py-3 text-xs">
          <p className="text-muted-foreground">
            {row.actor_email} · {row.target_type} {row.target_id}
          </p>
          <p className="text-muted-foreground">{new Date(row.created_at).toLocaleString("es-CL")}</p>
          {row.metadata ? (
            <pre className="overflow-x-auto rounded-lg bg-secondary p-2 text-secondary-foreground">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AuditPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit-log"],
    queryFn: fetchAuditLog,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Registro de Auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Últimas 200 acciones sensibles hechas desde este panel. Tocá una fila para ver el
          detalle completo. Nadie puede editar ni borrar una fila ya escrita.
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar: {String(error)}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Cargando…
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Sin actividad registrada todavía.
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((row) => (
            <AuditRowItem key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
