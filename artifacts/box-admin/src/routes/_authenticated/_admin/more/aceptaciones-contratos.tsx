import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, FileCheck, ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAcceptances, markAcceptancesSeen, type AcceptanceItem } from "@/lib/contract-acceptances";
import { useBox } from "@/lib/box-context";

export const Route = createFileRoute("/_authenticated/_admin/more/aceptaciones-contratos")({
  head: () => ({
    meta: [
      { title: "Aceptaciones de contratos — WODPLACE" },
      { name: "description", content: "Quién aceptó los contratos de tu box, qué documento y versión, y cuándo." },
      { property: "og:title", content: "Aceptaciones de contratos — WODPLACE" },
      { property: "og:description", content: "Revisa las aceptaciones de contratos de tu box." },
    ],
  }),
  component: AcceptancesPage,
});

type Tab = "pendientes" | "todas";

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function AcceptancesPage() {
  const { boxId, isAdmin } = useBox();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pendientes");

  const list = useQuery({
    queryKey: ["contract-acceptances", boxId],
    queryFn: () => fetchAcceptances(boxId),
    enabled: isAdmin && !!boxId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["contract-acceptances"] });
    qc.invalidateQueries({ queryKey: ["contract-acceptances-count"] });
    qc.invalidateQueries({ queryKey: ["alert-contracts"] });
  };

  const markSeen = useMutation({
    mutationFn: () => markAcceptancesSeen(boxId),
    onSuccess: () => {
      toast.success("Aceptaciones marcadas como vistas");
      refresh();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo marcar como vistas"),
  });

  // Solo dueño, administrador del box y super admin. Un coach que llegue por el enlace no ve nada (la base tampoco se lo permite).
  if (!isAdmin) {
    return (
      <AdminShell title="Aceptaciones de contratos" showBack>
        <div className="rounded-3xl border bg-card p-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">Esta sección es solo para administradores del box.</p>
        </div>
      </AdminShell>
    );
  }

  const all = list.data ?? [];
  const unseen = all.filter((a) => !a.seen);
  const shown = tab === "pendientes" ? unseen : all;

  return (
    <AdminShell title="Aceptaciones de contratos" showBack>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pendientes">Por ver{unseen.length > 0 ? ` (${unseen.length})` : ""}</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
      ) : list.isError ? (
        <div className="rounded-3xl border bg-card p-6 text-center">
          <p className="text-sm font-semibold">No se pudo cargar.</p>
          <Button variant="outline" className="mt-3 rounded-full" onClick={() => list.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border bg-card p-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          {all.length === 0 ? (
            <p className="text-sm font-bold">Nadie ha aceptado los contratos todavía.</p>
          ) : (
            <p className="text-sm font-bold">No hay aceptaciones nuevas por ver.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "pendientes" ? (
            <Button className="w-full rounded-full" disabled={markSeen.isPending} onClick={() => markSeen.mutate()}>
              Marcar como vistas
            </Button>
          ) : null}
          {shown.map((a) => (
            <AcceptanceCard key={a.userId} a={a} />
          ))}
          <p className="px-1 pt-1 text-center text-[11px] text-muted-foreground">
            El contacto de emergencia y los datos del apoderado están en la ficha de cada miembro.
          </p>
        </div>
      )}
    </AdminShell>
  );
}

function AcceptanceCard({ a }: { a: AcceptanceItem }) {
  return (
    <article className="rounded-3xl border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{a.name}</p>
          <p className="text-[11px] text-muted-foreground">Aceptó el {fmtDay(a.acceptedAt)}</p>
        </div>
        {!a.seen ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Nueva</span>
        ) : null}
      </div>

      {a.documents.length > 0 ? (
        <ul className="space-y-1.5 border-t pt-3">
          {a.documents.map((d) => (
            <li key={d.slug} className="flex items-start gap-2 text-xs">
              <FileCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="font-semibold">{d.title}</span>
                <span className="text-muted-foreground">
                  {d.versionDate ? ` · versión del ${fmtDay(d.versionDate)}${d.superseded ? " (reemplazada)" : ""}` : ""}
                  {d.readAt ? ` · leído el ${fmtDay(d.readAt)}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t pt-3 text-xs text-muted-foreground">Sin documentos registrados.</p>
      )}

      <Link
        to="/member-detail/$id"
        params={{ id: a.userId }}
        className="mt-3 flex items-center justify-between rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-semibold active:bg-secondary"
      >
        Ver ficha del miembro
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </article>
  );
}
