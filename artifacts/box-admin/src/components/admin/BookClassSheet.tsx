import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { checkPlanLimit } from "@/lib/planLimit";
import { useUpcomingBookings, type UpcomingClass } from "@/lib/upcomingBookings";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Search, Clock, User as UserIcon, Check, Trash2 } from "lucide-react";
import { addDays, format } from "date-fns";
import { toast } from "sonner";

type Cls = {
  id: string;
  name: string;
  session_date: string;
  start_time: string;
  capacity: number;
  coach: { name: string } | null;
  bookings: { id: string; user_id: string }[];
};

export function BookClassSheet({
  memberId,
  memberName,
  open,
  onOpenChange,
}: {
  memberId: string;
  memberName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<{ classId: string; waitlist: boolean; used: number; cap: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [toRemove, setToRemove] = useState<UpcomingClass | null>(null);
  const qc = useQueryClient();
  const { boxId } = useBox();
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const upcoming = useUpcomingBookings(boxId, memberId, open);

  const classes = useQuery({
    queryKey: ["bookable-classes", boxId, today],
    enabled: open,
    queryFn: async () => {
      // Only today + tomorrow — a member almost always needs one of those
      // two, and the full week just made this list longer to scroll
      // through for no benefit.
      const { data: sessions } = await supabase
        .from("class_sessions")
        .select("id, name, session_date, start_time, capacity, coach:coaches(name)")
        .eq("box_id", boxId)
        .gte("session_date", today)
        .lte("session_date", tomorrow)
        .order("session_date")
        .order("start_time")
        .limit(80);
      const rows = (sessions ?? []) as unknown as Omit<Cls, "bookings">[];
      if (rows.length === 0) return [] as Cls[];
      const { data: bookings } = await supabase
        .from("class_bookings")
        .select("id, user_id, session_id")
        .eq("box_id", boxId)
        .in("session_id", rows.map((r) => r.id));
      const bySession = new Map<string, { id: string; user_id: string }[]>();
      for (const b of bookings ?? []) {
        const arr = bySession.get(b.session_id) ?? [];
        arr.push({ id: b.id, user_id: b.user_id });
        bySession.set(b.session_id, arr);
      }
      return rows.map((r) => ({ ...r, bookings: bySession.get(r.id) ?? [] })) as Cls[];
    },
  });

  const book = useMutation({
    mutationFn: async ({ classId, waitlist }: { classId: string; waitlist: boolean }) => {
      const { error } = await supabase.from("class_bookings").insert({
        box_id: boxId,
        session_id: classId,
        user_id: memberId,
        status: waitlist ? "lista_espera" : "inscrito",
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.waitlist ? "Agregado como sobrecupo" : "Reservado");
      qc.invalidateQueries({ queryKey: ["bookable-classes"] });
      qc.invalidateQueries({ queryKey: ["class-bookings"] });
      qc.invalidateQueries({ queryKey: ["classes-range"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  // Same delete-by-id behavior as class-detail.$id.tsx / member-detail's
  // "Clases" tab — no waitlist auto-promotion. Also invalidates
  // bookable-classes (unlike those two) so THIS sheet's own "Ya inscrito"/
  // capacity numbers refresh immediately if the removed booking was one of
  // today's or tomorrow's sessions.
  const removeBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from("class_bookings").delete().eq("box_id", boxId).eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva eliminada");
      qc.invalidateQueries({ queryKey: ["member-upcoming-classes", boxId, memberId] });
      qc.invalidateQueries({ queryKey: ["classes-range"] });
      qc.invalidateQueries({ queryKey: ["bookable-classes"] });
      setToRemove(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar la reserva"),
  });

  // Unlike the athlete's own POST /bookings, this writes class_bookings
  // directly and never went through that limit check — an admin CAN book a
  // student past their plan's classes_per_period (unlike the athlete, who's
  // hard-blocked), but only after confirming it's intentional.
  async function startBooking(classId: string, waitlist: boolean) {
    setChecking(true);
    try {
      const limit = await checkPlanLimit({ boxId, userId: memberId });
      if (limit && limit.used >= limit.cap) {
        setPending({ classId, waitlist, used: limit.used, cap: limit.cap });
        return;
      }
    } finally {
      setChecking(false);
    }
    book.mutate({ classId, waitlist });
  }

  const list = (classes.data ?? []).filter((c) =>
    (c.name + " " + (c.coach?.name ?? "")).toLowerCase().includes(q.toLowerCase())
  );
  const todayList = list.filter((c) => c.session_date === today);
  const tomorrowList = list.filter((c) => c.session_date === tomorrow);

  function renderClassCard(c: Cls) {
    const attendees = c.bookings ?? [];
    const enrolled = attendees.length;
    const already = attendees.some((a) => a.user_id === memberId);
    const full = enrolled >= (c.capacity ?? 0);
    return (
      <div key={c.id} className="rounded-2xl border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{c.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{String(c.start_time).slice(0, 5)}</span>
              {c.coach?.name && <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{c.coach.name}</span>}
            </div>
          </div>
          <span className={`shrink-0 text-xs font-bold ${full ? "text-destructive" : "text-primary"}`}>
            {enrolled}/{c.capacity}
          </span>
        </div>

        <div className="mt-2">
          {already ? (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              <Check className="h-3.5 w-3.5" /> Ya inscrito
            </p>
          ) : full ? (
            <Button
              size="sm"
              variant="outline"
              disabled={book.isPending || checking}
              onClick={() => startBooking(c.id, true)}
              className="h-9 w-full rounded-full text-xs"
            >
              Agregar como sobrecupo
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={book.isPending || checking}
              onClick={() => startBooking(c.id, false)}
              className="h-9 w-full rounded-full text-xs font-semibold"
            >
              Reservar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base">Reservar clase · {memberName}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          {upcoming.data && upcoming.data.length > 0 ? (
            <div className="mb-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ya agendado
              </p>
              {upcoming.data.map((c) => (
                <div key={c.bookingId} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{c.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {format(new Date(`${c.session_date}T00:00:00`), "dd MMM")} · {c.start_time.slice(0, 5)}
                      {c.coachName ? ` · ${c.coachName}` : ""}
                    </p>
                    {c.status === "lista_espera" && (
                      <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        En lista de espera
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar reserva de ${c.name}`}
                    disabled={removeBooking.isPending}
                    onClick={() => setToRemove(c)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-destructive active:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar clase o coach..." className="h-11 rounded-full pl-9" />
          </div>

          <div className="mt-3 max-h-[55vh] space-y-4 overflow-y-auto pb-2">
            {classes.isLoading && <p className="py-6 text-center text-xs text-muted-foreground">Cargando...</p>}
            {!classes.isLoading && list.length === 0 && (
              <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">Sin clases disponibles</p>
            )}
            {todayList.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clases de hoy</p>
                {todayList.map(renderClassCard)}
              </div>
            )}
            {tomorrowList.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clases de mañana</p>
                {tomorrowList.map(renderClassCard)}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>

    <ConfirmDialog
      open={pending != null}
      onOpenChange={(v) => { if (!v) setPending(null); }}
      title="Clase extra fuera del plan"
      description={
        pending
          ? `${memberName} ya usó ${pending.used}/${pending.cap} clases de su plan en este período. Esta se agendaría como una clase extra.`
          : undefined
      }
      confirmLabel="Agendar igual"
      loading={book.isPending}
      onConfirm={() => {
        if (!pending) return;
        book.mutate({ classId: pending.classId, waitlist: pending.waitlist });
        setPending(null);
      }}
    />

    <ConfirmDialog
      open={toRemove != null}
      onOpenChange={(v) => { if (!v) setToRemove(null); }}
      title="Eliminar reserva"
      description={
        toRemove
          ? `¿Eliminar la reserva de ${memberName} en ${toRemove.name} (${format(new Date(`${toRemove.session_date}T00:00:00`), "dd MMM")})?`
          : undefined
      }
      confirmLabel="Eliminar"
      destructive
      loading={removeBooking.isPending}
      onConfirm={() => { if (toRemove) removeBooking.mutate(toRemove.bookingId); }}
    />
    </>
  );
}
