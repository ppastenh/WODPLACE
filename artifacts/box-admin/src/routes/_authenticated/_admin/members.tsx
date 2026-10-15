import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { makeWodplaceUserId } from "@/lib/ids";
import { copyToClipboard } from "@/lib/clipboard";
import { isInsideAppWebView, postToNative } from "@/lib/rnBridge";
import { computeNextPaymentAt } from "@/lib/payments";
import { membershipStatusLabel } from "@/lib/membershipStatus";
import { apiFetch } from "@/lib/apiClient";
import { useState } from "react";
import {
  Search, Plus, User, Copy, RefreshCw, MessageCircle, Check, X,
  UserRound, CalendarDays, MoreVertical, Settings, CircleCheck, Tag,
  PlayCircle, PauseCircle, AlertCircle, Lock, Clock, KeyRound, Receipt, Trash2,
  ChevronDown, Mail, UserX, Send, TriangleAlert,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { BookClassSheet } from "@/components/admin/BookClassSheet";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import type { NewInviteCodeResult, InviteEmailResult } from "@workspace/api-zod";

// Un miembro "sin cuenta" (Fase 2 de invitación de alumno, 2026-10-15)
// igual necesita un email en wodplace_users (NOT NULL + UNIQUE) -- se le
// da uno sintético, único por fila, que nunca se muestra como si fuera
// real (ver toItem/InfoRow de email en la ficha).
const NO_ACCOUNT_EMAIL_DOMAIN = "@wodplace.local";
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(NO_ACCOUNT_EMAIL_DOMAIN);
}

export const Route = createFileRoute("/_authenticated/_admin/members")({
  head: () => ({
    meta: [
      { title: "Miembros — WODPLACE" },
      { name: "description", content: "Gestión de miembros del box: buscar, filtrar y administrar." },
      { property: "og:title", content: "Miembros — WODPLACE" },
      { property: "og:description", content: "Lista y gestión de miembros." },
    ],
  }),
  component: MembersPage,
});

type Status = "todos" | "activo" | "pausado" | "suspendido" | "vencido" | "bloqueado";
type MemberStatus = "activo" | "pausado" | "suspendido" | "vencido" | "bloqueado";

export type MemberListItem = {
  /** box_members.user_id (a wodplace_users.id — text). */
  id: string;
  full_name: string;
  status: string;
  next_payment: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  plan?: { name: string } | null;
};

type MemberRow_ = {
  user_id: string;
  status: string;
  next_payment_at: string | null;
  photo_url: string | null;
  phone: string | null;
  wodplace_users: { name: string; email: string; avatar_url: string | null } | null;
  plans: { name: string } | null;
};

function toItem(r: MemberRow_): MemberListItem {
  const rawEmail = r.wodplace_users?.email ?? null;
  return {
    id: r.user_id,
    full_name: r.wodplace_users?.name ?? "—",
    email: isPlaceholderEmail(rawEmail) ? null : rawEmail,
    status: r.status,
    next_payment: r.next_payment_at,
    // The athlete's own uploaded photo is the canonical avatar; box_members'
    // photo_url is a legacy admin-settable fallback nothing currently writes.
    photo_url: r.wodplace_users?.avatar_url ?? r.photo_url,
    phone: r.phone,
    plan: r.plans,
  };
}

function MembersPage() {
  const { boxId, isAdmin, myPermissions } = useBox();
  const canAddMembers = isAdmin || !!myPermissions?.members_edit;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("todos");

  const { data: plans } = useQuery({
    queryKey: ["plans", boxId],
    queryFn: async () =>
      (await supabase.from("plans").select("id, name, price, duration_days").eq("box_id", boxId).order("name")).data ?? [],
  });

  const members = useQuery({
    queryKey: ["members", boxId, q, status],
    queryFn: async () => {
      let query = supabase
        .from("box_members")
        .select("user_id, status, next_payment_at, photo_url, phone, wodplace_users!inner(name, email, avatar_url), plans(name)")
        .eq("box_id", boxId)
        .order("name", { referencedTable: "wodplace_users" });
      if (status !== "todos") query = query.eq("status", status);
      if (q) query = query.ilike("wodplace_users.name", `%${q}%`);
      const { data } = await query;
      return ((data ?? []) as unknown as MemberRow_[]).map(toItem);
    },
  });

  return (
    <AdminShell title="Miembros">
      <BoxInviteCard />
      <PendingRequests />
      <PendingMemberInvites />
      <div className="sticky top-[calc(env(safe-area-inset-top)+56px)] z-20 -mx-4 mb-4 space-y-3 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar miembro..." className="pl-9 rounded-full h-11 bg-card" />
          </div>
          {/* Agregar un miembro nuevo exige members_edit del coach, igual
              que editarlo (auditoría de seguridad, 2026-10-14). */}
          {canAddMembers && <AddMemberMenu plans={plans ?? []} isAdmin={isAdmin} />}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {(["todos", "activo", "pausado", "suspendido", "vencido", "bloqueado"] as Status[]).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${status === s ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {members.isLoading && <SkeletonList />}
        {members.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay miembros. Agrega el primero con el botón +
          </div>
        )}
        {members.data?.map((m) => (
          <MemberRow key={m.id} m={m} />
        ))}
      </div>
    </AdminShell>
  );
}

export function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return url ? (
    <img src={url} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <div style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-foreground">
      {initials || <User className="h-4 w-4" />}
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    activo: "bg-primary/20 text-primary",
    pausado: "bg-sky-500/20 text-sky-400",
    suspendido: "bg-warning/20 text-warning",
    vencido: "bg-destructive/20 text-destructive",
    bloqueado: "bg-destructive/25 text-destructive",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[status] ?? "bg-secondary"}`}>{status}</span>;
}

function MemberRow({ m }: { m: MemberListItem }) {
  const { isAdmin, myPermissions } = useBox();
  const canBook = isAdmin || !!myPermissions?.bookings_manage;
  const canChangePlan = isAdmin; // "Cambiar plan" es solo de administrador/dueño/super admin (la base ya lo exige).
  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [book, setBook] = useState(false);
  const [selectPlan, setSelectPlan] = useState(false);
  const membershipStatus = membershipStatusLabel(m.next_payment);

  const waHref = m.phone
    ? `https://wa.me/${m.phone.replace(/\D/g, "")}`
    : `https://wa.me/`;

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left active:scale-[0.99] transition-transform"
        >
          <Avatar name={m.full_name} url={m.photo_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{m.full_name}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <StatusChip status={m.status} />
              {/* S3.A de la auditoría de seguridad (2026-10-14): para un
                  coach, ni el nombre del plan ni la fecha exacta -- solo
                  un estado simple. Administrador y dueño no cambian. */}
              {isAdmin && m.plan?.name && <span className="truncate">· {m.plan.name}</span>}
              {!isAdmin && membershipStatus && (
                <span className={membershipStatus === "Vigente" ? "text-primary" : "text-destructive"}>
                  · {membershipStatus}
                </span>
              )}
            </div>
          </div>
          {!expanded && isAdmin && m.next_payment && (
            <div className="text-right text-[10px] text-muted-foreground">
              <p className="font-semibold text-foreground">{format(new Date(m.next_payment), "dd MMM")}</p>
              <p>próximo pago</p>
            </div>
          )}
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={() => setSheet(true)}
          aria-label="Más acciones"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground active:bg-secondary"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {expanded && (
        <div className={`grid gap-1 border-t p-2 ${[canBook, true, canChangePlan].filter(Boolean).length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {/* "Reservar" exige bookings_manage; "Cambiar plan" es solo de
              administrador/dueño/super admin — la base ya rechaza ambas
              acciones para un coach sin el permiso correspondiente. */}
          {canBook && (
            <button
              onClick={() => setBook(true)}
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] text-primary active:bg-secondary"
            >
              <CalendarDays className="h-5 w-5" />
              Reservar
            </button>
          )}
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] text-primary active:bg-secondary"
          >
            <MessageCircle className="h-5 w-5" />
            Chat
          </a>
          {canChangePlan && (
            <button
              onClick={() => setSelectPlan(true)}
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] text-primary active:bg-secondary"
            >
              <Tag className="h-5 w-5" />
              Plan
            </button>
          )}
        </div>
      )}

      <MemberActionsSheet m={m} open={sheet} onOpenChange={setSheet} />
      {canBook && <BookClassSheet memberId={m.id} memberName={m.full_name} open={book} onOpenChange={setBook} />}
      {canChangePlan && (
        <SelectPlanSheet
          userId={m.id}
          memberName={m.full_name}
          currentPlanName={m.plan?.name ?? null}
          open={selectPlan}
          onOpenChange={setSelectPlan}
        />
      )}
    </div>
  );
}

export function SelectPlanSheet({
  userId,
  memberName,
  currentPlanName,
  open,
  onOpenChange,
}: {
  userId: string;
  memberName: string;
  currentPlanName: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [pendingPlan, setPendingPlan] = useState<{ id: string; name: string } | null>(null);

  const plans = useQuery({
    queryKey: ["plans", boxId],
    queryFn: async () =>
      (await supabase.from("plans").select("id, name, price, duration_days").eq("box_id", boxId).order("name")).data ?? [],
    enabled: open,
  });

  const setPlan = useMutation({
    mutationFn: async (planId: string) => {
      // Resets next_payment_at to today + the NEW plan's duration — a plan
      // change is a distinct commercial event, not a renewal, so it must not
      // inherit whatever was left on the OLD plan's cycle (that's exactly how
      // one member ended up with a 49-day due date: the old plan's leftover
      // due date just kept sitting there, unrelated to the new plan's own
      // duration). registerPayment (payments.ts) applies this same reset
      // rule when a payment itself changes the plan, so neither path can
      // stack a leftover period on top of a new one.
      const plan = (plans.data ?? []).find((p) => p.id === planId);
      const update: { plan_id: string; next_payment_at?: string } = { plan_id: planId };
      if (plan) update.next_payment_at = computeNextPaymentAt(null, new Date(), plan.duration_days);
      const { error } = await supabase
        .from("box_members")
        .update(update)
        .eq("box_id", boxId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["member", boxId, userId] });
      qc.invalidateQueries({ queryKey: ["alert-overdue"] });
      qc.invalidateQueries({ queryKey: ["alert-upcoming"] });
      toast.success("Plan actualizado");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  function selectPlan(planName: string, planId: string) {
    if (planName === currentPlanName) return;
    setPendingPlan({ id: planId, name: planName });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle className="text-base">Seleccionar plan</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-1 overflow-y-auto px-3 pb-8">
          {plans.data?.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">No hay planes creados para este box.</p>
          )}
          {plans.data?.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPlan(p.name, p.id)}
              disabled={setPlan.isPending}
              className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left active:bg-secondary disabled:opacity-50"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
              {currentPlanName === p.name && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </DrawerContent>
      <ConfirmDialog
        open={pendingPlan != null}
        onOpenChange={(v) => { if (!v) setPendingPlan(null); }}
        title="Cambiar plan"
        description={`Vas a cambiar el plan de ${memberName} de "${currentPlanName ?? "sin plan"}" a "${pendingPlan?.name ?? ""}". Esto no ajusta pagos ya hechos — los pagos se registran aparte, en Finanzas.`}
        confirmLabel="Cambiar plan"
        loading={setPlan.isPending}
        onConfirm={() => { if (pendingPlan) setPlan.mutate(pendingPlan.id); setPendingPlan(null); }}
      />
    </Drawer>
  );
}

function ActionItem({
  icon: Icon,
  title,
  subtitle,
  tone = "default",
  onClick,
  to,
  params,
}: {
  icon: typeof UserRound;
  title: string;
  subtitle?: string;
  tone?: "default" | "primary" | "warning" | "destructive";
  onClick?: () => void;
  to?: string;
  params?: Record<string, string>;
}) {
  const toneCls =
    tone === "primary" ? "text-primary"
      : tone === "warning" ? "text-warning"
        : tone === "destructive" ? "text-destructive"
          : "text-foreground";
  const inner = (
    <>
      <Icon className={`h-5 w-5 shrink-0 ${toneCls}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${toneCls}`}>{title}</p>
        {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left active:bg-secondary";
  if (to) {
    return (
      <Link to={to} params={params} className={cls} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function MemberActionsSheet({
  m,
  open,
  onOpenChange,
}: {
  m: MemberListItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { boxId, isAdmin, myPermissions } = useBox();
  const canEditMembers = isAdmin || !!myPermissions?.members_edit;
  const [confirmRemove, setConfirmRemove] = useState(false);

  const setStatus = useMutation({
    mutationFn: async (status: MemberStatus) => {
      const { error } = await supabase
        .from("box_members")
        .update({ status })
        .eq("box_id", boxId)
        .eq("user_id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["member", m.id] });
      toast.success("Estado actualizado");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("box_members")
        .delete()
        .eq("box_id", boxId)
        .eq("user_id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Miembro eliminado");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  async function resetPassword() {
    if (!m.email) return toast.error("El miembro no tiene email registrado");
    const { error } = await supabase.auth.resetPasswordForEmail(m.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) return toast.error(error.message);
    toast.success("Correo de restablecimiento enviado");
  }

  const isPaused = m.status === "pausado";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle className="text-base">Más acciones</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-3 pb-8">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Administración</p>
          {isInsideAppWebView() ? (
            // Inside the app's WebView, hand off to the native public
            // profile screen (the same one Comunidad already opens) instead
            // of box-admin's own page — there's a real app to jump to here.
            <ActionItem
              icon={UserRound}
              title="Ver perfil"
              subtitle="Nombre, PRs y actividad reciente"
              onClick={() => {
                postToNative({ type: "open-member-profile", userId: m.id, name: m.full_name });
                onOpenChange(false);
              }}
            />
          ) : (
            // Plain browser (desktop admin) — no native app to hand off to,
            // so box-admin shows its own equivalent page.
            <ActionItem
              icon={UserRound}
              title="Ver perfil"
              subtitle="Nombre, PRs y actividad reciente"
              to="/member-profile/$id"
              params={{ id: m.id }}
              onClick={() => onOpenChange(false)}
            />
          )}
          <ActionItem icon={Settings} title="Gestionar membresía" subtitle="Estado, plan, pagos y notas" to="/member-detail/$id" params={{ id: m.id }} onClick={() => onOpenChange(false)} />

          {/* Cambiar el estado de un miembro exige el permiso members_edit
              del coach (igual que editarlo) — se oculta en vez de mostrar
              un botón que va a fallar en silencio. */}
          {canEditMembers ? (
            <>
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Estado del miembro</p>
              <ActionItem icon={CircleCheck} title="Activar miembro" subtitle="El miembro podrá acceder normalmente" tone="primary" onClick={() => setStatus.mutate("activo")} />
              {isPaused ? (
                <ActionItem icon={PlayCircle} title="Reanudar membresía" subtitle="Vuelve a quedar activa desde hoy" tone="primary" onClick={() => setStatus.mutate("activo")} />
              ) : (
                <ActionItem icon={PauseCircle} title="Pausar membresía" subtitle="Congela la membresía temporalmente" tone="warning" onClick={() => setStatus.mutate("pausado")} />
              )}
              <ActionItem icon={AlertCircle} title="Suspender miembro" subtitle="Acceso temporalmente restringido" tone="warning" onClick={() => setStatus.mutate("suspendido")} />
              <ActionItem icon={Lock} title="Bloquear miembro" subtitle="El miembro no podrá iniciar sesión" tone="destructive" onClick={() => setStatus.mutate("bloqueado")} />
              <ActionItem icon={Clock} title="Marcar como vencido" subtitle="Membresía finalizada" tone="destructive" onClick={() => setStatus.mutate("vencido")} />
            </>
          ) : null}

          <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cuenta</p>
          <ActionItem icon={KeyRound} title="Restablecer contraseña" subtitle="Enviar nueva contraseña al miembro" onClick={resetPassword} />
          {/* S3.A de la auditoría de seguridad (2026-10-14): "facturas" no es
              una función real -- este botón solo abre la misma ficha del
              miembro (pestaña "Pagos", ya oculta para coach). Se oculta el
              ítem en sí para no anunciar algo que un coach no puede ver. */}
          {isAdmin && (
            <ActionItem icon={Receipt} title="Ver pagos y facturas" subtitle="Historial de pagos y facturación" to="/member-detail/$id" params={{ id: m.id }} onClick={() => onOpenChange(false)} />
          )}
          {/* Eliminar un miembro es solo de administrador/dueño/super admin
              (auditoría de seguridad, 2026-10-14) -- ningún permiso de
              coach lo habilita. */}
          {isAdmin && (
            <ActionItem
              icon={Trash2}
              title="Eliminar miembro"
              subtitle="Eliminar miembro permanentemente"
              tone="destructive"
              onClick={() => setConfirmRemove(true)}
            />
          )}
        </div>
      </DrawerContent>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Eliminar miembro"
        description={`¿Eliminar a ${m.full_name}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        loading={remove.isPending}
        onConfirm={() => { remove.mutate(); setConfirmRemove(false); }}
      />
    </Drawer>
  );
}


function SkeletonList() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border bg-card" />
      ))}
    </>
  );
}

// Reemplaza al antiguo "Nuevo miembro" de un solo formulario con correo
// obligatorio (Fase 2 de invitación de alumno, 2026-10-15) -- ese flujo
// fue la causa de miembros duplicados cuando el alumno se registraba
// después con el mismo correo escrito a mano por el administrador (un
// typo bastaba para que quedaran como dos personas distintas). Ahora hay
// dos caminos separados y sin ese riesgo: invitar por correo (vinculación
// solo por código) o agregar sin cuenta (sin correo).
function AddMemberMenu({ plans, isAdmin }: { plans: Array<{ id: string; name: string }>; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [noAccountOpen, setNoAccountOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            aria-label="Agregar miembro"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm active:scale-95 transition-transform"
          >
            <Plus className="h-5 w-5" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle>Agregar miembro</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <button
              onClick={() => { setOpen(false); setInviteOpen(true); }}
              className="flex w-full items-start gap-3 rounded-2xl border p-4 text-left active:bg-secondary/50"
            >
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">Invitar alumno por correo</span>
                <span className="block text-xs text-muted-foreground">
                  Le llega un código personal para crear su cuenta y unirse.
                </span>
              </span>
            </button>
            <button
              onClick={() => { setOpen(false); setNoAccountOpen(true); }}
              className="flex w-full items-start gap-3 rounded-2xl border p-4 text-left active:bg-secondary/50"
            >
              <UserX className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <span>
                <span className="block text-sm font-semibold">Agregar alumno sin cuenta</span>
                <span className="block text-xs text-muted-foreground">
                  Para quien no tiene celular o correo propio (ej. un menor). No podrá entrar a la app.
                </span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <InviteByEmailDialog open={inviteOpen} onOpenChange={setInviteOpen} plans={plans} />
      <AddMemberWithoutAccountDialog open={noAccountOpen} onOpenChange={setNoAccountOpen} plans={plans} isAdmin={isAdmin} />
    </>
  );
}

function InviteByEmailDialog({
  open,
  onOpenChange,
  plans,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plans: Array<{ id: string; name: string }>;
}) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", plan_id: "" });
  const qc = useQueryClient();
  const { boxId } = useBox();

  const mut = useMutation({
    mutationFn: async () => {
      const email = form.email.trim().toLowerCase();
      if (!email) throw new Error("El correo es obligatorio.");

      const { data: existingMember } = await supabase
        .from("box_members")
        .select("user_id, wodplace_users!inner(email)")
        .eq("box_id", boxId)
        .eq("wodplace_users.email", email)
        .maybeSingle();
      if (existingMember) throw new Error("Este correo ya es miembro de este box.");

      const { data: pending } = await supabase
        .from("member_invites")
        .select("id")
        .eq("box_id", boxId)
        .eq("email", email)
        .eq("status", "pendiente")
        .maybeSingle();
      if (pending) {
        throw new Error("Ya existe una invitación pendiente para este correo — puedes reenviarla desde la lista de abajo.");
      }

      const { code } = await apiFetch<NewInviteCodeResult>(
        `/member-invites/new-code?boxId=${encodeURIComponent(boxId)}`,
      );
      const { data: auth } = await supabase.auth.getUser();
      const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: inserted, error } = await supabase
        .from("member_invites")
        .insert({
          box_id: boxId,
          email,
          full_name: form.full_name.trim() || null,
          phone: form.phone.trim() || null,
          plan_id: form.plan_id || null,
          code,
          expires_at,
          created_by: auth.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new Error("Ya existe una invitación pendiente para este correo — puedes reenviarla desde la lista de abajo.");
        }
        throw error;
      }

      // La invitación ya existe aunque el correo falle -- nunca se pierde
      // por un problema de envío, solo queda disponible para "Reenviar"
      // (mismo criterio que la invitación de staff).
      const { emailSent } = await apiFetch<InviteEmailResult>(`/member-invites/${inserted.id}/send`, {
        method: "POST",
      }).catch(() => ({ emailSent: false }));
      return { email, emailSent };
    },
    onSuccess: ({ email, emailSent }) => {
      qc.invalidateQueries({ queryKey: ["member_invites"] });
      setForm({ full_name: "", email: "", phone: "", plan_id: "" });
      onOpenChange(false);
      if (emailSent) toast.success(`Invitación enviada a ${email}`);
      else toast.error("La invitación se creó, pero el correo no pudo enviarse. Usa Reenviar.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>Invitar alumno por correo</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
          <div><Label>Nombre completo (opcional)</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Correo</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Teléfono (opcional)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <Label>Plan (opcional)</Label>
            <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona un plan (opcional)" /></SelectTrigger>
              <SelectContent side="top">
                {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Le llega un correo con un código personal de un solo uso. Al crear su cuenta (o iniciar
            sesión si ya tiene una) y escribir el código en la app, queda vinculado a este box con
            el plan que elijas.
          </p>
          <Button type="submit" disabled={mut.isPending} className="w-full rounded-full h-11 font-semibold">
            {mut.isPending ? "Enviando..." : "Enviar invitación"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberWithoutAccountDialog({
  open,
  onOpenChange,
  plans,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plans: Array<{ id: string; name: string }>;
  isAdmin: boolean;
}) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    plan_id: "",
    emergency_name: "",
    emergency_phone: "",
    contractSigned: false,
  });
  const qc = useQueryClient();
  const { boxId } = useBox();

  const mut = useMutation({
    mutationFn: async () => {
      const fullName = form.full_name.trim();
      if (!fullName) throw new Error("El nombre es obligatorio.");
      const userId = makeWodplaceUserId();
      const { error: userErr } = await supabase
        .from("wodplace_users")
        .insert({ id: userId, name: fullName, email: `sin-cuenta+${userId}${NO_ACCOUNT_EMAIL_DOMAIN}` });
      if (userErr) throw userErr;

      // Contacto de emergencia y "contrato firmado en papel" son solo de
      // administrador/dueño/super admin -- un coach con members_edit
      // puede agregar al miembro, pero no estos dos campos (ni la base
      // los deja editar después, vía UPDATE, aunque sí los deja fijar en
      // este INSERT puntual si se los mandara; se ocultan en la interfaz
      // para que un coach ni los vea).
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("box_members").insert({
        box_id: boxId,
        user_id: userId,
        phone: form.phone.trim() || null,
        plan_id: form.plan_id || null,
        ...(isAdmin && form.emergency_name.trim() ? { emergency_contact_name: form.emergency_name.trim() } : {}),
        ...(isAdmin && form.emergency_phone.trim() ? { emergency_contact_phone: form.emergency_phone.trim() } : {}),
        ...(isAdmin && form.contractSigned
          ? { contract_signed_physically_at: new Date().toISOString(), contract_signed_physically_by: auth.user?.id ?? null }
          : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Miembro agregado");
      qc.invalidateQueries({ queryKey: ["members"] });
      onOpenChange(false);
      setForm({ full_name: "", phone: "", plan_id: "", emergency_name: "", emergency_phone: "", contractSigned: false });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>Agregar alumno sin cuenta</DialogTitle></DialogHeader>
        <div className="flex gap-2 rounded-2xl bg-warning/15 p-3 text-xs text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Este miembro no tendrá acceso a la app: no puede reservar clases ni ver su progreso.
            Úsalo solo si la persona no tiene celular o correo propio (por ejemplo, un menor sin correo).
          </p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
          <div><Label>Nombre completo</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Teléfono (opcional)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <Label>Plan (opcional)</Label>
            <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona un plan (opcional)" /></SelectTrigger>
              <SelectContent side="top">
                {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <>
              <div><Label>Contacto de emergencia — nombre (opcional)</Label><Input value={form.emergency_name} onChange={(e) => setForm({ ...form, emergency_name: e.target.value })} /></div>
              <div><Label>Contacto de emergencia — teléfono (opcional)</Label><Input value={form.emergency_phone} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} /></div>
              <label className="flex items-start gap-2 rounded-2xl border p-3">
                <Checkbox
                  checked={form.contractSigned}
                  onCheckedChange={(v) => setForm({ ...form, contractSigned: v === true })}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">Contrato firmado en papel</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Queda registrado quién lo marcó y cuándo.
                  </span>
                </span>
              </label>
            </>
          )}
          <Button type="submit" disabled={mut.isPending} className="w-full rounded-full h-11 font-semibold">
            {mut.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type PendingMemberInvite = {
  id: string;
  email: string;
  code: string;
  status: "pendiente" | "usado" | "cancelado";
  expires_at: string | null;
  used_at: string | null;
  plan: { name: string } | null;
  joinedViaGenericCode: boolean;
};

function PendingMemberInvites() {
  const { boxId, isAdmin } = useBox();
  const qc = useQueryClient();

  const invites = useQuery({
    queryKey: ["member_invites", boxId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_invites")
        .select("id, email, code, status, expires_at, used_at, plans(name)")
        .eq("box_id", boxId)
        .eq("status", "pendiente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<{
        id: string; email: string; code: string; status: "pendiente";
        expires_at: string | null; used_at: string | null; plans: { name: string } | null;
      }>;
      if (rows.length === 0) return [] as PendingMemberInvite[];

      // Alumno invitado que ya está en el box igual (se unió con el código
      // genérico en vez del personal) -- aviso para el administrador, caso
      // (e) aprobado en el diseño de la Fase 2.
      const emails = rows.map((r) => r.email);
      const { data: alreadyMembers } = await supabase
        .from("box_members")
        .select("wodplace_users!inner(email)")
        .eq("box_id", boxId)
        .in("wodplace_users.email", emails);
      const joinedEmails = new Set(
        ((alreadyMembers ?? []) as unknown as Array<{ wodplace_users: { email: string } }>).map(
          (m) => m.wodplace_users.email,
        ),
      );

      return rows.map((r) => ({
        id: r.id,
        email: r.email,
        code: r.code,
        status: r.status,
        expires_at: r.expires_at,
        used_at: r.used_at,
        plan: r.plans,
        joinedViaGenericCode: joinedEmails.has(r.email),
      })) satisfies PendingMemberInvite[];
    },
    enabled: isAdmin,
  });

  const resend = useMutation({
    mutationFn: async (id: string) => apiFetch<InviteEmailResult>(`/member-invites/${id}/resend`, { method: "POST" }),
    onSuccess: ({ emailSent }) => {
      qc.invalidateQueries({ queryKey: ["member_invites"] });
      if (emailSent) toast.success("Código renovado y correo reenviado.");
      else toast.error("Código renovado, pero el correo no se pudo enviar.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_invites").update({ status: "cancelado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member_invites"] });
      toast.success("Invitación cancelada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  if (!isAdmin || !invites.data || invites.data.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="mb-2 px-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        Invitaciones pendientes ({invites.data.length})
      </p>
      <div className="space-y-2">
        {invites.data.map((inv) => {
          const expired = !!inv.expires_at && new Date(inv.expires_at) < new Date();
          return (
            <div key={inv.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${expired ? "bg-destructive/15 text-destructive" : "bg-primary/20 text-primary"}`}>
                      {expired ? "Vencida" : "Pendiente"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {inv.expires_at ? `Vence ${format(new Date(inv.expires_at), "dd MMM yyyy")}` : "Sin vencimiento"}
                    {inv.plan && <span>· {inv.plan.name}</span>}
                  </div>
                  {inv.joinedViaGenericCode && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-warning/15 p-2 text-[11px] text-warning">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Se unió con el código general del box, no con el suyo.</span>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    onClick={() => resend.mutate(inv.id)}
                    disabled={resend.isPending}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground active:bg-secondary/70 disabled:opacity-40"
                    aria-label="Reenviar invitación"
                    title="Genera un código nuevo y reenvía el correo"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmCancelId(inv.id)}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/15 text-destructive active:bg-destructive/25"
                    aria-label="Cancelar invitación"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmDialog
        open={!!confirmCancelId}
        onOpenChange={(v) => !v && setConfirmCancelId(null)}
        title="¿Cancelar esta invitación?"
        description="El código deja de funcionar. Puedes invitar de nuevo a este correo más tarde."
        confirmLabel="Cancelar invitación"
        destructive
        loading={cancel.isPending}
        onConfirm={() => {
          if (confirmCancelId) cancel.mutate(confirmCancelId);
          setConfirmCancelId(null);
        }}
      />
    </div>
  );
}

// Debe coincidir con lo que busca el endpoint de canje de la app móvil
// (WODPLACE api-server → POST /box-memberships/redeem → box_settings.key).
const INVITE_CODE_KEY = "invite_code";

function BoxInviteCard() {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const { data, isLoading } = useQuery({
    queryKey: ["box_settings", boxId, INVITE_CODE_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("box_settings")
        .select("value")
        .eq("box_id", boxId)
        .eq("key", INVITE_CODE_KEY)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
  });

  const regen = useMutation({
    mutationFn: async () => {
      const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
      code += "-";
      for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
      const { error } = await supabase
        .from("box_settings")
        .upsert({ box_id: boxId, key: INVITE_CODE_KEY, value: code }, { onConflict: "box_id,key" });
      if (error) throw error;
      return code;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["box_settings", boxId, INVITE_CODE_KEY] });
      toast.success("Código regenerado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const code = data ?? "—";

  async function copy() {
    const ok = await copyToClipboard(code);
    if (ok) toast.success("Código copiado");
    else toast.error("No se pudo copiar el código");
  }


  return (
    <div className="mb-4 rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Código de invitación
        </p>
        <button
          onClick={copy}
          className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground active:bg-secondary/70"
          aria-label="Copiar"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      <button
        onClick={copy}
        className="mt-3 block w-full text-center font-mono text-3xl font-black tracking-[0.25em] text-primary"
      >
        {isLoading ? "…" : code}
      </button>
      <div className="mt-4">
        <Button
          onClick={() => regen.mutate()}
          disabled={regen.isPending}
          variant="secondary"
          className="h-11 w-full rounded-full font-semibold"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${regen.isPending ? "animate-spin" : ""}`} />
          Regenerar
        </Button>
      </div>
    </div>
  );
}

type Request = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  user_id: string;
};

type RequestRow_ = {
  id: string;
  created_at: string;
  user_id: string;
  wodplace_users: { name: string; email: string } | null;
};

function PendingRequests() {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const { data: requests = [] } = useQuery({
    queryKey: ["member_requests", boxId, "pendiente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_requests")
        .select("id, created_at, user_id, wodplace_users(name, email)")
        .eq("box_id", boxId)
        .eq("status", "pendiente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as RequestRow_[]).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        full_name: r.wodplace_users?.name ?? "—",
        email: r.wodplace_users?.email ?? null,
      })) satisfies Request[];
    },
  });

  const approve = useMutation({
    mutationFn: async (r: Request) => {
      const { error: insErr } = await supabase
        .from("box_members")
        .upsert({ box_id: boxId, user_id: r.user_id, status: "activo" }, { onConflict: "box_id,user_id" });
      if (insErr) throw insErr;
      const { error } = await supabase
        .from("member_requests")
        .update({ status: "aprobado" })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member_requests"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["alert-requests"] });
      toast.success("Solicitud aprobada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("member_requests")
        .update({ status: "rechazado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member_requests"] });
      qc.invalidateQueries({ queryKey: ["alert-requests"] });
      toast.success("Solicitud rechazada");
    },
  });

  if (requests.length === 0) return null;

  return (
    <div className="mb-4 rounded-3xl border bg-card p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Solicitudes pendientes ({requests.length})
      </p>
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl border bg-background/40 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-xs font-bold">
              {r.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || <User className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.full_name}</p>
              {r.email && (
                <p className="truncate text-[11px] text-muted-foreground">{r.email}</p>
              )}
            </div>
            <button
              onClick={() => approve.mutate(r)}
              disabled={approve.isPending}
              className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary active:bg-primary/30 disabled:opacity-40"
              aria-label="Aprobar"
            >
              <Check className="h-5 w-5" />
            </button>
            <button
              onClick={() => reject.mutate(r.id)}
              disabled={reject.isPending}
              className="grid h-10 w-10 place-items-center rounded-full bg-destructive/15 text-destructive active:bg-destructive/25 disabled:opacity-40"
              aria-label="Rechazar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
