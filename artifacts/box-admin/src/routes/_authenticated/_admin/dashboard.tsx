import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { MetricCard } from "@/components/admin/MetricCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Users, CalendarDays, DollarSign, AlertTriangle, Plus, CreditCard, Dumbbell, UserPlus, ChevronRight, Megaphone } from "lucide-react";
import { format, startOfMonth, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


export const Route = createFileRoute("/_authenticated/_admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Dlovebox" },
      { name: "description", content: "Resumen del box: miembros activos, clases del día, ingresos y actividad reciente." },
      { property: "og:title", content: "Dashboard — Dlovebox" },
      { property: "og:description", content: "Panel principal de gestión del box." },
    ],
  }),
  component: DashboardPage,
});

function useDashboardStats(boxId: string) {
  return useQuery({
    queryKey: ["dashboard-stats", boxId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const in7days = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const [newThisMonth, active, todayClasses, monthRevenue, expiring] = await Promise.all([
        supabase.from("box_members").select("user_id", { count: "exact", head: true }).eq("box_id", boxId).gte("joined_at", monthStart),
        supabase.from("box_members").select("user_id", { count: "exact", head: true }).eq("box_id", boxId).eq("status", "activo"),
        supabase.from("class_sessions").select("id", { count: "exact", head: true }).eq("box_id", boxId).eq("session_date", today),
        supabase.from("payments").select("amount").eq("box_id", boxId).eq("status", "pagado").gte("paid_at", monthStart),
        supabase.from("box_members").select("user_id", { count: "exact", head: true }).eq("box_id", boxId).lte("next_payment_at", in7days).gte("next_payment_at", today),
      ]);

      const revenue = (monthRevenue.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);

      return {
        newThisMonth: newThisMonth.count ?? 0,
        active: active.count ?? 0,
        todayClasses: todayClasses.count ?? 0,
        revenue,
        expiring: expiring.count ?? 0,
      };
    },
  });
}

type ExpiringRow = {
  user_id: string;
  status: string;
  next_payment_at: string | null;
  wodplace_users: { name: string } | null;
  plans: { name: string } | null;
};

function useExpiringMembers(enabled: boolean, boxId: string) {
  return useQuery({
    enabled,
    queryKey: ["expiring-members", boxId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const in7days = format(addDays(new Date(), 7), "yyyy-MM-dd");
      const { data } = await supabase
        .from("box_members")
        .select("user_id, status, next_payment_at, wodplace_users(name), plans(name)")
        .eq("box_id", boxId)
        .gte("next_payment_at", today)
        .lte("next_payment_at", in7days)
        .order("next_payment_at", { ascending: true });
      return (data ?? []) as unknown as ExpiringRow[];
    },
  });
}

type UpcomingClass = { id: string; name: string; start_time: string | null; capacity: number; bookings: number };

function useUpcomingClasses(boxId: string) {
  return useQuery({
    queryKey: ["upcoming-classes", boxId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: sessions } = await supabase
        .from("class_sessions")
        .select("id, name, start_time, capacity")
        .eq("box_id", boxId)
        .eq("session_date", today)
        .order("start_time", { ascending: true })
        .limit(4);
      const rows = sessions ?? [];
      if (rows.length === 0) return [] as UpcomingClass[];
      const { data: bookings } = await supabase
        .from("class_bookings")
        .select("session_id")
        .eq("box_id", boxId)
        .in("session_id", rows.map((r) => r.id));
      const counts = new Map<string, number>();
      for (const b of bookings ?? []) counts.set(b.session_id, (counts.get(b.session_id) ?? 0) + 1);
      return rows.map((r) => ({ ...r, bookings: counts.get(r.id) ?? 0 })) as UpcomingClass[];
    },
  });
}

function DashboardPage() {
  const { boxId } = useBox();
  const stats = useDashboardStats(boxId);
  const upcoming = useUpcomingClasses(boxId);
  const [expOpen, setExpOpen] = useState(false);
  const expiring = useExpiringMembers(expOpen, boxId);
  const s = stats.data;

  return (
    <AdminShell>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <h1 className="mt-1 text-2xl font-black">Hola, admin 👋</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu box hoy</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={Users} label="Miembros activos" value={s?.active ?? "—"} accent />
        <MetricCard icon={UserPlus} label="Nuevos este mes" value={s?.newThisMonth ?? "—"} />
        <MetricCard icon={CalendarDays} label="Clases hoy" value={s?.todayClasses ?? "—"} />
        <MetricCard icon={DollarSign} label="Ingresos del mes" value={s ? `$${s.revenue.toLocaleString()}` : "—"} />
      </div>

      <button
        onClick={() => setExpOpen(true)}
        className="mt-3 flex w-full items-center gap-3 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-left active:scale-[0.99] transition-transform"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">Por vencer</div>
          <div className="text-[11px] text-muted-foreground">Próximos 7 días · toca para ver la lista</div>
        </div>
        <div className="text-xl font-black">{s?.expiring ?? "—"}</div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <Dialog open={expOpen} onOpenChange={setExpOpen}>
        <DialogContent className="max-w-[92vw] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Membresías por vencer</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {expiring.isLoading && <p className="text-xs text-muted-foreground">Cargando…</p>}
            {!expiring.isLoading && (expiring.data ?? []).length === 0 && (
              <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                No hay membresías por vencer en los próximos 7 días
              </p>
            )}
            {(expiring.data ?? []).map((m) => (
              <Link
                key={m.user_id}
                to="/members/$id"
                params={{ id: m.user_id }}
                onClick={() => setExpOpen(false)}
                className="flex items-center gap-3 rounded-2xl border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.wodplace_users?.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {m.plans?.name ?? "Sin plan"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-bold text-amber-400">
                    {m.next_payment_at ? format(new Date(`${m.next_payment_at}T00:00:00`), "d MMM", { locale: es }) : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">vence</div>
                </div>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>


      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction to="/members" icon={UserPlus} label="Agregar miembro" />
          <QuickAction to="/classes" icon={CalendarDays} label="Crear clase" />
          <QuickAction to="/finances" icon={CreditCard} label="Registrar pago" />
          <QuickAction to="/more/notifications" icon={Megaphone} label="Enviar aviso" />
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Próximas clases</h2>
          <Link to="/classes" className="text-xs font-semibold text-primary">Ver todas</Link>
        </div>
        <div className="space-y-2">
          {(upcoming.data ?? []).length === 0 && (
            <div className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">
              No hay clases programadas hoy
            </div>
          )}
          {(upcoming.data ?? []).map((c) => {
            const enrolled = c.bookings ?? 0;
            const pct = c.capacity ? Math.min(100, (enrolled / c.capacity) * 100) : 0;
            return (
              <Link to="/classes/$id" params={{ id: c.id }} key={c.id}
                className="block rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.start_time?.slice(0, 5)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold">{enrolled}/{c.capacity}</div>
                    <div className="text-[10px] text-muted-foreground">cupos</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </AdminShell>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof Plus; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl border bg-card p-3 active:scale-[0.98] transition-transform">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-semibold leading-tight">{label}</span>
    </Link>
  );
}
