import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { checkPlanLimit } from "@/lib/planLimit";
import { Button } from "@/components/ui/button";
import { Avatar } from "./members";
import { UserPlus, Clock, User as UserIcon, CalendarDays, Pencil, Search, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Sibling route, not nested under classes.tsx — classes.tsx (the "Clases"
// tab) has no <Outlet/>, so a route file named classes.$id.tsx would change
// the URL on navigation but never actually mount (same bug fixed before for
// member-profile.$id.tsx vs. members.$id.tsx).
export const Route = createFileRoute("/_authenticated/_admin/class-detail/$id")({
  head: () => ({
    meta: [
      { title: "Clase — Dlovebox" },
      { name: "description", content: "Detalle de clase, asistentes y lista de espera." },
      { property: "og:title", content: "Clase — Dlovebox" },
      { property: "og:description", content: "Detalle y asistentes de la clase." },
    ],
  }),
  component: ClassDetail,
});

type BookingRow = {
  id: string;
  status: string;
  attended: boolean | null;
  wodplace_users: { name: string } | null;
};

function ClassDetail() {
  const { id } = Route.useParams();
  const { boxId, isAdmin, myPermissions } = useBox();
  const canMarkAttendance = isAdmin || !!myPermissions?.bookings_manage;
  const qc = useQueryClient();
  const [tab, setTab] = useState<"asistentes" | "espera">("asistentes");
  const [q, setQ] = useState("");
  const [toRemove, setToRemove] = useState<BookingRow | null>(null);

  const cls = useQuery({
    queryKey: ["class", boxId, id],
    queryFn: async () =>
      (await supabase.from("class_sessions").select("*, coaches(name)").eq("box_id", boxId).eq("id", id).maybeSingle()).data,
  });

  const attendees = useQuery({
    queryKey: ["class-bookings", boxId, id],
    queryFn: async () => ((await supabase
      .from("class_bookings")
      .select("id, status, attended, wodplace_users(name)")
      .eq("box_id", boxId)
      .eq("session_id", id)).data ?? []) as unknown as BookingRow[],
  });

  // Fase C: "asistencia real" -- whether the athlete actually showed up,
  // separate from the booking status (see
  // 20261001170000_class_bookings_attendance.sql for why it's not just
  // another status value). Clicking the same state again clears it back to
  // "sin marcar" (null) rather than toggling only between the two.
  const markAttendance = useMutation({
    mutationFn: async ({ bookingId, attended }: { bookingId: string; attended: boolean | null }) => {
      const { error } = await supabase.from("class_bookings").update({ attended }).eq("box_id", boxId).eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-bookings", boxId, id] });
      qc.invalidateQueries({ queryKey: ["classes-range"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo marcar la asistencia"),
  });

  // Admin-side cancellation, bypassing the 1-hour-before-class cutoff that
  // only exists client-side in the athlete's own app (BookingContext.tsx) —
  // for when a student asks staff to cancel because they can't do it
  // themselves anymore. Deliberately just deletes the row: no waitlist
  // auto-promotion/notification here (unlike POST /bookings/cancel's self-
  // cancel path) — if a spot needs filling, staff adds someone manually via
  // "Agregar miembro" below. classesUsedInPeriod is a live COUNT(*) over
  // class_bookings (see api-server's GET /box-memberships/my-box), so
  // deleting this row alone already gives the athlete their class credit
  // back — no separate counter to touch.
  const removeBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from("class_bookings").delete().eq("box_id", boxId).eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva eliminada");
      qc.invalidateQueries({ queryKey: ["class-bookings", boxId, id] });
      qc.invalidateQueries({ queryKey: ["classes-range"] });
      setToRemove(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar la reserva"),
  });

  const c = cls.data;
  if (!c) return <AdminShell title="Clase" showBack backTo="/classes"><p className="p-6 text-center text-sm">Cargando...</p></AdminShell>;

  const inscritos = attendees.data?.filter((a) => a.status !== "lista_espera") ?? [];
  const espera = attendees.data?.filter((a) => a.status === "lista_espera") ?? [];
  const pct = c.capacity ? Math.min(100, (inscritos.length / c.capacity) * 100) : 0;

  const list = (tab === "asistentes" ? inscritos : espera).filter((a) =>
    (a.wodplace_users?.name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const [h, m] = String(c.start_time).split(":").map(Number);
  const endMin = h * 60 + m + (c.duration_minutes || 60);
  const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
  const activa = c.status === "programada" || c.status === "en_curso";

  return (
    <AdminShell title="Clases" showBack backTo="/classes">
      <div className="pb-20">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 truncate text-2xl font-black tracking-tight">{c.name}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${activa ? "bg-primary" : "bg-muted-foreground"}`} />
              {activa ? "Activa" : "Finalizada"}
            </span>
            <EditClass classId={id} initial={{
              name: c.name,
              start_time: String(c.start_time).slice(0, 5),
              duration_minutes: c.duration_minutes ?? 60,
              capacity: c.capacity ?? 15,
              session_date: c.session_date,
              notes: c.notes ?? "",
            }} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{String(c.start_time).slice(0, 5)} - {end}</span>
          <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" />{c.coaches?.name || "Sin coach"}</span>
          <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(parseISO(c.session_date), "dd MMM yyyy", { locale: es })}</span>
        </div>

        {c.notes && (
          <p className="mt-3 rounded-2xl border border-border/60 bg-secondary/40 p-3 text-sm text-foreground">
            {c.notes}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="shrink-0 text-sm font-bold">
            <span className="text-primary">{inscritos.length}</span>
            <span className="text-muted-foreground"> / {c.capacity} cupos</span>
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 border-b border-border/60">
          {([["asistentes", `Asistentes (${inscritos.length})`], ["espera", `Lista de espera (${espera.length})`]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 pb-2 text-sm font-semibold transition-colors ${
                tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar miembro..." className="h-11 rounded-2xl pl-9" />
        </div>

        <div className="mt-2 divide-y divide-border/50">
          {list.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {tab === "asistentes" ? "Sin asistentes" : "Sin lista de espera"}
            </p>
          )}
          {list.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-3">
              <Avatar name={a.wodplace_users?.name ?? "?"} size={40} />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{a.wodplace_users?.name}</p>
              {tab === "asistentes" && canMarkAttendance && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Marcar a ${a.wodplace_users?.name ?? "este miembro"} como asistió`}
                    disabled={markAttendance.isPending}
                    onClick={() => markAttendance.mutate({ bookingId: a.id, attended: a.attended === true ? null : true })}
                    className={`grid h-9 w-9 place-items-center rounded-xl disabled:opacity-50 ${
                      a.attended === true ? "bg-primary text-primary-foreground" : "text-muted-foreground active:bg-secondary"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Marcar a ${a.wodplace_users?.name ?? "este miembro"} como ausente`}
                    disabled={markAttendance.isPending}
                    onClick={() => markAttendance.mutate({ bookingId: a.id, attended: a.attended === false ? null : false })}
                    className={`grid h-9 w-9 place-items-center rounded-xl disabled:opacity-50 ${
                      a.attended === false ? "bg-destructive text-destructive-foreground" : "text-muted-foreground active:bg-secondary"
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button
                type="button"
                aria-label={`Quitar a ${a.wodplace_users?.name ?? "este miembro"}`}
                disabled={removeBooking.isPending}
                onClick={() => setToRemove(a)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-destructive active:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[76px] z-30 mx-auto max-w-md px-4 pb-2">
        <AddParticipant classId={id} />
      </div>

      <ConfirmDialog
        open={toRemove != null}
        onOpenChange={(v) => { if (!v) setToRemove(null); }}
        title="Eliminar reserva"
        description={`¿Eliminar la reserva de ${toRemove?.wodplace_users?.name ?? "este miembro"}?`}
        confirmLabel="Eliminar"
        destructive
        loading={removeBooking.isPending}
        onConfirm={() => { if (toRemove) removeBooking.mutate(toRemove.id); }}
      />
    </AdminShell>
  );
}

function EditClass({ classId, initial }: {
  classId: string;
  initial: { name: string; start_time: string; duration_minutes: number; capacity: number; session_date: string; notes: string };
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const qc = useQueryClient();
  const { boxId } = useBox();
  const mut = useMutation({
    mutationFn: async () => {
      const { notes, ...rest } = form;
      const { error } = await supabase
        .from("class_sessions")
        .update({ ...rest, notes: notes.trim() || null })
        .eq("box_id", boxId)
        .eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clase actualizada");
      qc.invalidateQueries({ queryKey: ["class", boxId, classId] });
      qc.invalidateQueries({ queryKey: ["classes-range"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 rounded-full px-3 text-xs">
          <Pencil className="h-3 w-3" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>Editar clase</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
          <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Fecha</Label><Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} /></div>
            <div><Label>Hora</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Duración (min)</Label><Input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
            <div><Label>Cupos</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          </div>
          <div>
            <Label>Notas de la clase</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Qué se trabajó ese día (visible para los alumnos anotados)"
              maxLength={500}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={mut.isPending} className="h-11 w-full rounded-full font-semibold">Guardar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type MemberHit = { user_id: string; wodplace_users: { name: string } | null };

function AddParticipant({ classId }: { classId: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState<{ userId: string; name: string; used: number; cap: number } | null>(null);
  const qc = useQueryClient();
  const { boxId } = useBox();
  const search = useQuery({
    queryKey: ["members-search", boxId, q],
    queryFn: async () => ((await supabase
      .from("box_members")
      .select("user_id, wodplace_users!inner(name)")
      .eq("box_id", boxId)
      .ilike("wodplace_users.name", `%${q}%`)
      .limit(10)).data ?? []) as unknown as MemberHit[],
    enabled: q.length > 0,
  });
  const add = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("class_bookings").insert({
        box_id: boxId,
        session_id: classId,
        user_id: userId,
        status: "inscrito",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Agregado"); qc.invalidateQueries({ queryKey: ["class-bookings", boxId, classId] }); setOpen(false); setQ(""); setPending(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  // Same reasoning as BookClassSheet's startBooking: this writes
  // class_bookings directly, bypassing the athlete-side plan limit entirely
  // — confirm before letting it through once the student's plan is used up.
  async function startAdd(userId: string, name: string) {
    setChecking(true);
    try {
      const limit = await checkPlanLimit({ boxId, userId });
      if (limit && limit.used >= limit.cap) {
        setPending({ userId, name, used: limit.used, cap: limit.cap });
        return;
      }
    } finally {
      setChecking(false);
    }
    add.mutate(userId);
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 w-full gap-2 rounded-full text-sm font-bold shadow-lg shadow-primary/20">
          <UserPlus className="h-4 w-4" /> Agregar miembro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>Agregar miembro</DialogTitle></DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar miembro..." />
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {(search.data ?? []).map((m) => (
            <button
              key={m.user_id}
              disabled={checking || add.isPending}
              onClick={() => startAdd(m.user_id, m.wodplace_users?.name ?? "este miembro")}
              className="flex w-full items-center gap-3 rounded-xl bg-secondary p-2 text-left disabled:opacity-50"
            >
              <Avatar name={m.wodplace_users?.name ?? "?"} size={32} />
              <span className="text-sm">{m.wodplace_users?.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={pending != null}
      onOpenChange={(v) => { if (!v) setPending(null); }}
      title="Clase extra fuera del plan"
      description={
        pending
          ? `${pending.name} ya usó ${pending.used}/${pending.cap} clases de su plan en este período. Esta se agregaría como una clase extra.`
          : undefined
      }
      confirmLabel="Agregar igual"
      loading={add.isPending}
      onConfirm={() => { if (pending) add.mutate(pending.userId); }}
    />
    </>
  );
}
