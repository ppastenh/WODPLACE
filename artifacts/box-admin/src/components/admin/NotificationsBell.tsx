import { useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, Clock, FileCheck, Flag, UserPlus, Users, Wallet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useBox } from "@/lib/box-context";
import {
  approveRequest,
  fetchNewMembers,
  fetchOverdueMembers,
  fetchPendingReports,
  fetchPendingRequests,
  fetchUnconfirmedPayments,
  fetchUnseenContracts,
  fetchUpcomingRenewals,
  markContractSeen,
  rejectRequest,
  reportReasonLabel,
  resolveReport,
  type MemberAlert,
  type PendingReport,
  type PendingRequest,
  type UnconfirmedPayment,
  type UnseenContract,
} from "@/lib/admin-alerts";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "d MMM", { locale: es });
}

/** Admin-only operational alerts — visibility is gated by `useBox().isAdmin`
 *  (real admins, not coaches), computed in box-context.tsx from the box's
 *  actual role rows. */
export function NotificationsBell() {
  const { boxId, isAdmin } = useBox();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const enabled = isAdmin && !!boxId;

  const requests = useQuery({ queryKey: ["alert-requests", boxId], queryFn: () => fetchPendingRequests(boxId), enabled });
  const reports = useQuery({ queryKey: ["alert-reports"], queryFn: fetchPendingReports, enabled: isAdmin });
  const overdue = useQuery({ queryKey: ["alert-overdue", boxId], queryFn: () => fetchOverdueMembers(boxId), enabled });
  const upcoming = useQuery({ queryKey: ["alert-upcoming", boxId], queryFn: () => fetchUpcomingRenewals(boxId), enabled });
  const unconfirmed = useQuery({ queryKey: ["alert-unconfirmed", boxId], queryFn: () => fetchUnconfirmedPayments(boxId), enabled });
  const contracts = useQuery({ queryKey: ["alert-contracts"], queryFn: fetchUnseenContracts, enabled: isAdmin });
  const newMembers = useQuery({ queryKey: ["alert-new-members", boxId], queryFn: () => fetchNewMembers(boxId), enabled });

  const counts = {
    requests: requests.data?.length ?? 0,
    reports: reports.data?.length ?? 0,
    overdue: overdue.data?.length ?? 0,
    upcoming: upcoming.data?.length ?? 0,
    unconfirmed: unconfirmed.data?.length ?? 0,
    contracts: contracts.data?.length ?? 0,
    newMembers: newMembers.data?.length ?? 0,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const approve = useMutation({
    mutationFn: (r: PendingRequest) => approveRequest(boxId, r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alert-requests"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
  const reject = useMutation({
    mutationFn: (id: string) => rejectRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-requests"] }),
  });
  const resolve = useMutation({
    mutationFn: (id: string) => resolveReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-reports"] }),
  });
  const seeContract = useMutation({
    mutationFn: (userId: string) => markContractSeen(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-contracts"] }),
  });

  // Coaches get the rest of box-admin, but not this — it's for real admins.
  if (!isAdmin) return null;
  const close = () => setOpen(false);

  return (
    <>
      <button
        aria-label="Notificaciones"
        onClick={() => setOpen(true)}
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground active:opacity-80"
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
        )}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">Notificaciones</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto px-4 pb-8">
            {total === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">Todo al día. No hay nada pendiente.</p>
            ) : (
              <>
                <Section icon={Users} title="Solicitudes de membresía" count={counts.requests}>
                  {requests.data?.map((r) => (
                    <RequestRow
                      key={r.id}
                      r={r}
                      busy={approve.isPending || reject.isPending}
                      onApprove={() => approve.mutate(r)}
                      onReject={() => reject.mutate(r.id)}
                    />
                  ))}
                </Section>

                <Section icon={Flag} title="Reportes de comunidad" count={counts.reports}>
                  {reports.data?.map((r) => (
                    <ReportRow key={r.id} r={r} busy={resolve.isPending} onResolve={() => resolve.mutate(r.id)} />
                  ))}
                </Section>

                <Section icon={AlertTriangle} title="Pagos vencidos" count={counts.overdue}>
                  {overdue.data?.map((m) => (
                    <MemberRow key={m.userId} m={m} label="venció" onClick={close} />
                  ))}
                </Section>

                <Section icon={Clock} title="Por vencer (7 días)" count={counts.upcoming}>
                  {upcoming.data?.map((m) => (
                    <MemberRow key={m.userId} m={m} label="vence" onClick={close} />
                  ))}
                </Section>

                <Section icon={Wallet} title="Pagos sin confirmar" count={counts.unconfirmed}>
                  {unconfirmed.data?.map((p) => (
                    <PaymentRow key={p.id} p={p} onClick={close} />
                  ))}
                </Section>

                <Section icon={FileCheck} title="Contratos aceptados" count={counts.contracts}>
                  {contracts.data?.map((c) => (
                    <ContractRow key={c.userId} c={c} busy={seeContract.isPending} onSeen={() => seeContract.mutate(c.userId)} onClick={close} />
                  ))}
                </Section>

                <Section icon={UserPlus} title="Nuevos miembros" count={counts.newMembers}>
                  {newMembers.data?.map((m) => (
                    <MemberRow key={m.userId} m={m} label="se unió" onClick={close} />
                  ))}
                </Section>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
        <span className="ml-auto rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RequestRow({ r, onApprove, onReject, busy }: { r: PendingRequest; onApprove: () => void; onReject: () => void; busy: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{r.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{r.email ?? "Sin email"} · {fmtDate(r.createdAt)}</p>
      </div>
      <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full px-3" disabled={busy} onClick={onReject}>
        Rechazar
      </Button>
      <Button size="sm" className="h-8 shrink-0 rounded-full px-3" disabled={busy} onClick={onApprove}>
        Aprobar
      </Button>
    </div>
  );
}

function ReportRow({ r, onResolve, busy }: { r: PendingReport; onResolve: () => void; busy: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{reportReasonLabel(r.reason)}</p>
        <p className="truncate text-[11px] text-muted-foreground">Reportado por {r.reporterName} · {fmtDate(r.createdAt)}</p>
      </div>
      <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full px-3" disabled={busy} onClick={onResolve}>
        Marcar resuelto
      </Button>
    </div>
  );
}

function MemberRow({ m, label, onClick }: { m: MemberAlert; label: string; onClick: () => void }) {
  return (
    <Link
      to="/members/$id"
      params={{ id: m.userId }}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border bg-card p-3 active:bg-secondary/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{m.name}</p>
        <p className="text-[11px] text-muted-foreground">{label} {fmtDate(m.date)}</p>
      </div>
    </Link>
  );
}

function PaymentRow({ p, onClick }: { p: UnconfirmedPayment; onClick: () => void }) {
  return (
    <Link
      to="/members/$id"
      params={{ id: p.userId }}
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3 active:bg-secondary/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{p.name}</p>
        <p className="text-[11px] text-muted-foreground">{fmtDate(p.createdAt)}</p>
      </div>
      <p className="shrink-0 text-sm font-black">${p.amount.toLocaleString()}</p>
    </Link>
  );
}

function ContractRow({ c, onSeen, busy, onClick }: { c: UnseenContract; onSeen: () => void; busy: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-card p-3">
      <Link to="/members/$id" params={{ id: c.userId }} onClick={onClick} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{c.name}</p>
        <p className="text-[11px] text-muted-foreground">Aceptó el {fmtDate(c.acceptedAt)}</p>
      </Link>
      <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full px-3" disabled={busy} onClick={onSeen}>
        Visto
      </Button>
    </div>
  );
}
