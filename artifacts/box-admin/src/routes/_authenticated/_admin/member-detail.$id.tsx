import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Avatar, StatusChip, SelectPlanSheet } from "./members";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Calendar, Edit2, RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { registerPayment } from "@/lib/payments";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUpcomingBookings, type UpcomingClass } from "@/lib/upcomingBookings";

// Sibling route, not nested under members.tsx — members.tsx (the "Miembros"
// tab) has no <Outlet/>, so a route file named members.$id.tsx would change
// the URL on navigation but never actually mount (same bug fixed before for
// member-profile.$id.tsx, and again for class-detail.$id.tsx vs.
// classes.$id.tsx). "Gestionar membresía" / "Ver pagos y facturas" /
// NotificationsBell's rows / dashboard's "Por vencer" list all point here.
export const Route = createFileRoute("/_authenticated/_admin/member-detail/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Miembro — Dlovebox` },
      { name: "description", content: `Detalle del miembro ${params.id}.` },
      { property: "og:title", content: "Miembro — Dlovebox" },
      { property: "og:description", content: "Detalle de miembro." },
    ],
  }),
  component: MemberDetail,
});

type MemberDetailRow = {
  user_id: string;
  status: string;
  phone: string | null;
  photo_url: string | null;
  notes: string | null;
  joined_at: string | null;
  member_since: string | null;
  next_payment_at: string | null;
  plan_id: string | null;
  wodplace_users: { name: string; email: string; avatar_url: string | null } | null;
  plans: { name: string; price: number | null; duration_days: number | null } | null;
};

function MemberDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [selectPlan, setSelectPlan] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toRemove, setToRemove] = useState<UpcomingClass | null>(null);

  const member = useQuery({
    queryKey: ["member", boxId, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("box_members")
        .select("user_id, status, phone, photo_url, notes, joined_at, member_since, next_payment_at, plan_id, wodplace_users(name, email, avatar_url), plans(name, price, duration_days)")
        .eq("box_id", boxId)
        .eq("user_id", id)
        .maybeSingle();
      return (data as unknown as MemberDetailRow | null) ?? null;
    },
  });

  const payments = useQuery({
    queryKey: ["member-payments", boxId, id],
    queryFn: async () => (await supabase.from("payments").select("*").eq("box_id", boxId).eq("user_id", id).order("paid_at", { ascending: false }).limit(20)).data ?? [],
  });

  const prs = useQuery({
    queryKey: ["member-prs", boxId, id],
    // prs is per-person now (no box_id) — a member's records are theirs across boxes.
    queryFn: async () => (await supabase.from("prs").select("*").eq("user_id", id).order("achieved_at", { ascending: false })).data ?? [],
  });

  const upcoming = useUpcomingBookings(boxId, id);

  // Same behavior as class-detail.$id.tsx's Trash2: bypasses the athlete's
  // own 1-hour cutoff, deletes the row outright with no waitlist
  // auto-promotion (staff adds someone manually via "Agregar miembro" there
  // if a spot needs filling).
  const removeBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from("class_bookings").delete().eq("box_id", boxId).eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva eliminada");
      qc.invalidateQueries({ queryKey: ["member-upcoming-classes", boxId, id] });
      qc.invalidateQueries({ queryKey: ["classes-range"] });
      setToRemove(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar la reserva"),
  });

  // Shortcut for "renovar": registers a payment for this member's current
  // plan at its list price — same registerPayment() path Finanzas' own
  // "Registrar pago" dialog uses, so next_payment_at advances the same way
  // either place is used from.
  const renew = useMutation({
    mutationFn: async () => {
      if (!m?.plan_id || !m.plans) return;
      await registerPayment({
        boxId,
        userId: id,
        planId: m.plan_id,
        amount: Number(m.plans.price ?? 0),
        method: "efectivo",
        status: "pagado",
      });
    },
    onSuccess: () => {
      toast.success("Plan renovado");
      qc.invalidateQueries({ queryKey: ["member", boxId, id] });
      qc.invalidateQueries({ queryKey: ["member-payments", boxId, id] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["alert-overdue"] });
      qc.invalidateQueries({ queryKey: ["alert-upcoming"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo renovar"),
  });

  const m = member.data;
  if (!m) return <AdminShell title="Miembro" showBack backTo="/members"><p className="p-6 text-center text-sm text-muted-foreground">{member.isLoading ? "Cargando..." : "No encontrado"}</p></AdminShell>;

  const fullName = m.wodplace_users?.name ?? "—";

  return (
    <AdminShell title="Perfil" showBack backTo="/members">
      <div className="flex flex-col items-center rounded-3xl border bg-card p-5 text-center">
        <Avatar name={fullName} url={m.wodplace_users?.avatar_url ?? m.photo_url} size={72} />
        <h1 className="mt-3 text-xl font-black">{fullName}</h1>
        <div className="mt-2"><StatusChip status={m.status} /></div>
        <button
          onClick={() => setSelectPlan(true)}
          className="mt-2 rounded-full px-2 py-0.5 text-xs text-muted-foreground underline-offset-2 active:bg-secondary active:underline"
        >
          {m.plans?.name ? `Plan ${m.plans.name}` : "Sin plan asignado — toca para elegir"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setEditOpen(true)} className="rounded-2xl h-11 flex-col gap-1"><Edit2 className="h-4 w-4" /><span className="text-[10px]">Editar</span></Button>
        <Button
          variant="outline"
          disabled={!m.plan_id || !m.plans || renew.isPending}
          onClick={() => {
            if (!m.plans) return;
            const confirmed = confirm(
              `¿Registrar pago de $${Number(m.plans.price ?? 0).toLocaleString()} y renovar el plan ${
                m.plans.duration_days ? `por ${m.plans.duration_days} días` : ""
              }?`,
            );
            if (confirmed) renew.mutate();
          }}
          className="rounded-2xl h-11 flex-col gap-1"
        >
          <RefreshCw className="h-4 w-4" /><span className="text-[10px]">Renovar</span>
        </Button>
      </div>

      <Tabs defaultValue="info" className="mt-5">
        <TabsList className="grid w-full grid-cols-4 rounded-full bg-secondary">
          <TabsTrigger value="info" className="rounded-full text-xs">Info</TabsTrigger>
          <TabsTrigger value="classes" className="rounded-full text-xs">Clases</TabsTrigger>
          <TabsTrigger value="pay" className="rounded-full text-xs">Pagos</TabsTrigger>
          <TabsTrigger value="prs" className="rounded-full text-xs">PRs</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4 space-y-2">
          <InfoRow icon={Mail} label="Email" value={m.wodplace_users?.email || "—"} />
          <InfoRow icon={Phone} label="Teléfono" value={m.phone || "—"} />
          <InfoRow icon={Calendar} label="Ingresó" value={m.joined_at ? format(new Date(m.joined_at), "dd MMM yyyy") : "—"} />
          <InfoRow
            icon={Calendar}
            label="Alumno desde"
            value={(m.member_since ?? m.joined_at) ? format(new Date(m.member_since ?? m.joined_at!), "dd MMM yyyy") : "—"}
          />
          <InfoRow icon={Calendar} label="Próximo pago" value={m.next_payment_at ? format(new Date(m.next_payment_at), "dd MMM yyyy") : "—"} />
          {m.notes && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observaciones</p>
              <p className="mt-1 text-sm">{m.notes}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="classes" className="mt-4 space-y-2">
          {upcoming.data?.length === 0 && <Empty text="Sin clases próximas" />}
          {upcoming.data?.map((c) => (
            <div key={c.bookingId} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(`${c.session_date}T00:00:00`), "dd MMM yyyy")} · {c.start_time.slice(0, 5)}
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
        </TabsContent>

        <TabsContent value="pay" className="mt-4 space-y-2">
          {payments.data?.length === 0 && <Empty text="Sin pagos registrados" />}
          {payments.data?.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border bg-card p-3">
              <div>
                <p className="text-sm font-semibold">${Number(p.amount).toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{p.paid_at ? format(new Date(p.paid_at), "dd MMM yyyy") : "Pendiente"} · {p.method || "—"}</p>
              </div>
              <StatusChip status={p.status} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="prs" className="mt-4 space-y-2">
          {prs.data?.length === 0 && <Empty text="Sin PRs registrados" />}
          {prs.data?.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border bg-card p-3">
              <div>
                <p className="text-sm font-semibold">{p.lift_name}</p>
                <p className="text-[11px] text-muted-foreground">{format(new Date(p.achieved_at), "dd MMM yyyy")}</p>
              </div>
              <p className="text-lg font-black text-primary">{p.weight}<span className="text-xs text-muted-foreground">{p.unit}</span></p>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <SelectPlanSheet
        userId={id}
        memberName={fullName}
        currentPlanName={m.plans?.name ?? null}
        open={selectPlan}
        onOpenChange={setSelectPlan}
      />
      <EditMemberDialog
        boxId={boxId}
        userId={id}
        phone={m.phone}
        notes={m.notes}
        memberSince={m.member_since ?? m.joined_at}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={toRemove != null}
        onOpenChange={(v) => { if (!v) setToRemove(null); }}
        title="Eliminar reserva"
        description={
          toRemove
            ? `¿Eliminar la reserva de ${fullName} en ${toRemove.name} (${format(new Date(`${toRemove.session_date}T00:00:00`), "dd MMM")})?`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        loading={removeBooking.isPending}
        onConfirm={() => { if (toRemove) removeBooking.mutate(toRemove.bookingId); }}
      />
    </AdminShell>
  );
}

/** Teléfono, Observaciones y Alumno desde son los únicos campos editables
 *  acá — nombre y email viven en wodplace_users, que box-admin nunca edita. */
function EditMemberDialog({
  boxId,
  userId,
  phone,
  notes,
  memberSince,
  open,
  onOpenChange,
}: {
  boxId: string;
  userId: string;
  phone: string | null;
  notes: string | null;
  /** Falls back to joined_at when member_since was never set — see that
   *  column's own doc comment (supabase/migrations/..._member_since.sql). */
  memberSince: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ phone: phone ?? "", notes: notes ?? "", memberSince: memberSince ?? "" });

  const openChange = (v: boolean) => {
    onOpenChange(v);
    if (v) setForm({ phone: phone ?? "", notes: notes ?? "", memberSince: memberSince ?? "" });
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("box_members")
        .update({
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
          member_since: form.memberSince || null,
        })
        .eq("box_id", boxId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Miembro actualizado");
      qc.invalidateQueries({ queryKey: ["member", boxId, userId] });
      qc.invalidateQueries({ queryKey: ["members"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>Editar miembro</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <div>
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+56 9 1234 5678" />
          </div>
          <div>
            <Label>Alumno desde</Label>
            <Input
              type="date"
              value={form.memberSince}
              onChange={(e) => setForm({ ...form, memberSince: e.target.value })}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Usá esto si el alumno entrenaba acá antes de que existiera la app.
            </p>
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea
              value={form.notes}
              maxLength={500}
              rows={4}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas internas sobre este miembro (opcional)"
            />
          </div>
          <Button type="submit" disabled={save.isPending} className="h-11 w-full rounded-full font-semibold">
            {save.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed p-5 text-center text-xs text-muted-foreground">{text}</div>;
}
