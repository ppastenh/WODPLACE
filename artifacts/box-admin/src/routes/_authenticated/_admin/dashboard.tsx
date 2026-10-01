import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { MetricCard } from "@/components/admin/MetricCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Users, CalendarDays, DollarSign, AlertTriangle, Plus, CreditCard, Dumbbell, UserPlus, ChevronRight, Megaphone, User as UserIcon, Award } from "lucide-react";
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

type UpcomingClass = {
  id: string;
  name: string;
  session_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  capacity: number;
  bookings: number;
  coach: { name: string } | null;
};

type ClassTimeInfo = Pick<UpcomingClass, "session_date" | "start_time" | "duration_minutes">;

function classWindow(c: ClassTimeInfo): { start: Date; end: Date } | null {
  if (!c.start_time) return null;
  const [h, m] = c.start_time.split(":").map(Number);
  const start = new Date(`${c.session_date}T00:00:00`);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + (c.duration_minutes || 60) * 60_000);
  return { start, end };
}

/** Whether `now` falls inside [start_time, start_time + duration) — drives
 *  the "en curso" green dot on the dashboard's upcoming-classes cards. */
function isClassLive(c: ClassTimeInfo, now: Date): boolean {
  const w = classWindow(c);
  return !!w && now >= w.start && now < w.end;
}

/** Whether the class has already finished (now past start + duration) —
 *  used to drop it from "Próximas clases" once it's over. */
function hasClassEnded(c: ClassTimeInfo, now: Date): boolean {
  const w = classWindow(c);
  return !!w && now >= w.end;
}

function useUpcomingClasses(boxId: string) {
  return useQuery({
    queryKey: ["upcoming-classes", boxId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: sessions } = await supabase
        .from("class_sessions")
        .select("id, name, session_date, start_time, duration_minutes, capacity, coach:coaches(name)")
        .eq("box_id", boxId)
        .eq("session_date", today)
        .order("start_time", { ascending: true });
      // Filtered client-side (not by a `session_date`/`start_time` query
      // condition) since "ended" depends on duration_minutes too, not just
      // the start time — a session's end time isn't a column to filter on.
      const now = new Date();
      const rows = (sessions ?? []).filter((r) => !hasClassEnded(r, now)).slice(0, 4);
      if (rows.length === 0) return [] as UpcomingClass[];
      const { data: bookings } = await supabase
        .from("class_bookings")
        .select("session_id")
        .eq("box_id", boxId)
        .in("session_id", rows.map((r) => r.id));
      const counts = new Map<string, number>();
      for (const b of bookings ?? []) counts.set(b.session_id, (counts.get(b.session_id) ?? 0) + 1);
      return rows.map((r) => ({ ...r, bookings: counts.get(r.id) ?? 0 })) as unknown as UpcomingClass[];
    },
  });
}

function DashboardPage() {
  const { boxId, isAdmin, myCoachId } = useBox();
  if (!isAdmin) return <CoachHome boxId={boxId} coachId={myCoachId} />;
  return <AdminHome boxId={boxId} />;
}

type MyClassRow = {
  id: string;
  name: string;
  session_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  capacity: number;
  athletes: { name: string; rank: string | null; status: string }[];
};

// Fase 2: read-only by design (point 8 of the coach permission list) — a
// coach never manages bookings from here, just sees who's coming and their
// level. Fase 3 adds the matching RLS restriction (class_bookings scoped
// to sessions this coach actually teaches) for the "gestionar reservas"
// permission itself; this view doesn't need that yet since it's select-only.
function useMyClassesToday(boxId: string, coachId: string | null) {
  return useQuery({
    queryKey: ["my-classes-today", boxId, coachId],
    enabled: !!boxId && !!coachId,
    queryFn: async () => {
      // Guarded by `enabled` above — queryFn never runs with a null coachId.
      const coach = coachId!;
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: sessions } = await supabase
        .from("class_sessions")
        .select("id, name, session_date, start_time, duration_minutes, capacity")
        .eq("box_id", boxId)
        .eq("coach_id", coach)
        .eq("session_date", today)
        .order("start_time", { ascending: true });
      if (!sessions || sessions.length === 0) return [] as MyClassRow[];

      const { data: bookings } = await supabase
        .from("class_bookings")
        .select("session_id, status, wodplace_users(name, rank)")
        .eq("box_id", boxId)
        .in("session_id", sessions.map((s) => s.id));

      const bySession = new Map<string, MyClassRow["athletes"]>();
      for (const b of (bookings ?? []) as unknown as {
        session_id: string;
        status: string;
        wodplace_users: { name: string; rank: string | null } | null;
      }[]) {
        const list = bySession.get(b.session_id) ?? [];
        list.push({
          name: b.wodplace_users?.name ?? "—",
          rank: b.wodplace_users?.rank ?? null,
          status: b.status,
        });
        bySession.set(b.session_id, list);
      }

      return sessions.map((s) => ({ ...s, athletes: bySession.get(s.id) ?? [] })) as MyClassRow[];
    },
  });
}

/** Fase B: a coach's own contribution, never box-wide — "clases dictadas"
 *  only counts sessions that already happened (today or earlier, not
 *  cancelled), distinct athletes come from their own class rosters, and
 *  medals come from the coach_id now stamped on user_achievements at grant
 *  time (see 20261001160000_user_achievements_coach_id.sql). */
function useMyActivitySummary(boxId: string, coachId: string | null) {
  return useQuery({
    queryKey: ["my-activity-summary", boxId, coachId],
    enabled: !!boxId && !!coachId,
    queryFn: async () => {
      const coach = coachId!;
      const today = format(new Date(), "yyyy-MM-dd");

      const [sessionsTaught, medals] = await Promise.all([
        supabase
          .from("class_sessions")
          .select("id")
          .eq("box_id", boxId)
          .eq("coach_id", coach)
          .neq("status", "cancelada")
          .lte("session_date", today),
        supabase
          .from("user_achievements")
          .select("id", { count: "exact", head: true })
          .eq("coach_id", coach),
      ]);

      const sessionIds = (sessionsTaught.data ?? []).map((s) => s.id);
      let distinctAthletes = 0;
      if (sessionIds.length > 0) {
        const { data: bookings } = await supabase
          .from("class_bookings")
          .select("user_id")
          .in("session_id", sessionIds);
        distinctAthletes = new Set((bookings ?? []).map((b) => b.user_id)).size;
      }

      return {
        classesTaught: sessionIds.length,
        distinctAthletes,
        medalsAwarded: medals.count ?? 0,
      };
    },
  });
}

function CoachHome({ boxId, coachId }: { boxId: string; coachId: string | null }) {
  const classes = useMyClassesToday(boxId, coachId);
  const summary = useMyActivitySummary(boxId, coachId);

  return (
    <AdminShell>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <h1 className="mt-1 text-2xl font-black">Hola, coach 👋</h1>
        <p className="text-sm text-muted-foreground">Tu actividad</p>
      </div>

      {coachId && (
        <div className="mb-5 grid grid-cols-3 gap-2">
          <MetricCard icon={Dumbbell} label="Clases dictadas" value={summary.data?.classesTaught ?? "—"} />
          <MetricCard icon={Users} label="Alumnos distintos" value={summary.data?.distinctAthletes ?? "—"} />
          <MetricCard icon={Award} label="Medallas otorgadas" value={summary.data?.medalsAwarded ?? "—"} />
        </div>
      )}

      <p className="mb-2 text-sm font-bold">Tus clases de hoy</p>

      {!coachId && !classes.isLoading && (
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Tu cuenta todavía no está vinculada a un perfil de coach en este box.
          </p>
        </div>
      )}

      {classes.isLoading && <p className="text-xs text-muted-foreground">Cargando…</p>}

      {!classes.isLoading && coachId && (classes.data ?? []).length === 0 && (
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No tienes clases programadas hoy</p>
        </div>
      )}

      <div className="space-y-3">
        {(classes.data ?? []).map((c) => (
          <div key={c.id} className="rounded-3xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{c.name}</p>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {c.start_time ? format(new Date(`${c.session_date}T${c.start_time}`), "h:mm a") : "—"}
              {" · "}
              {c.athletes.length}/{c.capacity} inscritos
            </p>
            {c.athletes.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {c.athletes.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 truncate">
                      <UserIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{a.name}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                      {a.rank ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Nadie anotado todavía</p>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

function AdminHome({ boxId }: { boxId: string }) {
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
                to="/member-detail/$id"
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
            const live = isClassLive(c, new Date());
            return (
              <Link to="/class-detail/$id" params={{ id: c.id }} key={c.id}
                className="block rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(`${c.session_date}T00:00:00`), "EEE d MMM", { locale: es })} ·{" "}
                        {c.start_time ? format(new Date(`${c.session_date}T${c.start_time}`), "h:mm a") : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {c.coach?.name ?? "Sin coach"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {live && (
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-green-500"
                        title="En horario de clase"
                      />
                    )}
                    <div className="text-right">
                      <div className="text-sm font-bold">{enrolled}/{c.capacity}</div>
                      <div className="text-[10px] text-muted-foreground">cupos</div>
                    </div>
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
