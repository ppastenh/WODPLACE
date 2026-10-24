import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Flag, ShieldAlert, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { reportReasonLabel } from "@/lib/admin-alerts";
import {
  deletePostAndResolve,
  dismissPostReports,
  fetchReportGroups,
  type ReportGroup,
  type ReportStatus,
} from "@/lib/community-reports";
import { useBox } from "@/lib/box-context";

export const Route = createFileRoute("/_authenticated/_admin/more/reportes-comunidad")({
  head: () => ({
    meta: [
      { title: "Reportes de Comunidad — WODPLACE" },
      { name: "description", content: "Revisa las publicaciones que los alumnos reportaron en tu box." },
      { property: "og:title", content: "Reportes de Comunidad — WODPLACE" },
      { property: "og:description", content: "Descarta reportes o elimina publicaciones de tu box." },
    ],
  }),
  component: CommunityReportsPage,
});

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Pending = { kind: "dismiss" | "delete"; group: ReportGroup } | null;

function CommunityReportsPage() {
  const { boxId, isAdmin } = useBox();
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>("pendientes");
  const [pending, setPending] = useState<Pending>(null);

  const reports = useQuery({
    queryKey: ["community-reports", boxId, status],
    queryFn: () => fetchReportGroups(boxId, status),
    enabled: isAdmin && !!boxId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["community-reports"] });
    qc.invalidateQueries({ queryKey: ["community-reports-count"] });
    qc.invalidateQueries({ queryKey: ["alert-reports"] });
  };

  const act = useMutation({
    mutationFn: async (p: NonNullable<Pending>) => {
      if (p.kind === "dismiss") await dismissPostReports(boxId, p.group.postId);
      else await deletePostAndResolve(boxId, p.group.postId);
    },
    onSuccess: (_d, p) => {
      toast.success(p.kind === "dismiss" ? "Reporte descartado" : "Publicación eliminada");
      setPending(null);
      refresh();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
      setPending(null);
      refresh();
    },
  });

  // Solo administradores del box. Un coach que llegue por el enlace no ve nada (la base tampoco se lo permite).
  if (!isAdmin) {
    return (
      <AdminShell title="Reportes de Comunidad" showBack>
        <div className="rounded-3xl border bg-card p-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">Esta sección es solo para administradores del box.</p>
        </div>
      </AdminShell>
    );
  }

  const groups = reports.data ?? [];

  return (
    <AdminShell title="Reportes de Comunidad" showBack>
      <Tabs value={status} onValueChange={(v) => setStatus(v as ReportStatus)} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
          <TabsTrigger value="resueltos">Resueltos</TabsTrigger>
        </TabsList>
      </Tabs>

      {reports.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      ) : reports.isError ? (
        <div className="rounded-3xl border bg-card p-6 text-center">
          <p className="text-sm font-semibold">No se pudo cargar.</p>
          <Button variant="outline" className="mt-3 rounded-full" onClick={() => reports.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-3xl border bg-card p-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          {status === "pendientes" ? (
            <>
              <p className="text-sm font-bold">No hay reportes pendientes</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cuando un alumno reporte una publicación de tu box, aparecerá aquí.
              </p>
            </>
          ) : (
            <p className="text-sm font-bold">Aún no hay reportes resueltos en los últimos 30 días.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <ReportCard key={g.postId} g={g} resolved={status === "resueltos"} onAct={(kind) => setPending({ kind, group: g })} />
          ))}
          {status === "pendientes" ? (
            <p className="px-1 pt-1 text-center text-[11px] text-muted-foreground">
              Para bloquear al autor, hazlo desde la publicación en la app.
            </p>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(v) => !v && !act.isPending && setPending(null)}
        title={pending?.kind === "delete" ? "¿Eliminar esta publicación?" : "¿Descartar el reporte?"}
        description={
          pending?.kind === "delete"
            ? "La publicación dejará de verse en la Comunidad y se cerrarán todos sus reportes. Esto no se puede deshacer desde aquí."
            : "Se cerrarán los reportes de esta publicación y la publicación seguirá visible."
        }
        confirmLabel={pending?.kind === "delete" ? "Eliminar publicación" : "Descartar reporte"}
        destructive={pending?.kind === "delete"}
        loading={act.isPending}
        onConfirm={() => pending && act.mutate(pending)}
      />
    </AdminShell>
  );
}

function ReportCard({ g, resolved, onAct }: { g: ReportGroup; resolved: boolean; onAct: (k: "dismiss" | "delete") => void }) {
  const post = g.post;
  const n = g.reports.length;
  return (
    <article className="rounded-3xl border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{post?.authorName ?? "Publicación no disponible"}</p>
          {post ? <p className="text-[11px] text-muted-foreground">{fmt(post.createdAt)}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {post?.deleted ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Eliminada</span>
          ) : null}
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
            <Flag className="h-3 w-3" /> {n} {n === 1 ? "reporte" : "reportes"}
          </span>
        </div>
      </div>

      {post ? (
        <>
          {post.body ? <p className="whitespace-pre-wrap break-words text-sm">{post.body}</p> : null}
          {post.imageUris.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {post.imageUris.map((u) => (
                <img key={u} src={u} alt="Imagen de la publicación" loading="lazy" className="aspect-square w-full rounded-xl border object-cover" />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">La publicación ya no existe.</p>
      )}

      <ul className="mt-3 space-y-1.5 border-t pt-3">
        {g.reports.map((r) => (
          <li key={r.id} className="text-xs">
            <span className="font-semibold">{reportReasonLabel(r.reason)}</span>
            <span className="text-muted-foreground"> · reportado por {r.reporterName} · {fmt(r.createdAt)}</span>
            {r.imageUrl ? (
              <>
                {" · "}
                <a href={r.imageUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  ver foto adjunta
                </a>
              </>
            ) : null}
            {resolved && r.resolvedAt ? <span className="text-muted-foreground"> · resuelto {fmt(r.resolvedAt)}</span> : null}
          </li>
        ))}
      </ul>

      {!resolved ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => onAct("dismiss")}>
            {post?.deleted ? "Cerrar reporte" : "Descartar reporte"}
          </Button>
          {post && !post.deleted ? (
            <Button variant="destructive" className="flex-1 rounded-full" onClick={() => onAct("delete")}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Eliminar publicación
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
