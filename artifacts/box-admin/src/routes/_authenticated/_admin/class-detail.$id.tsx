import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Button } from "@/components/ui/button";
import { Avatar } from "./members";
import { UserPlus, Clock, User as UserIcon, CalendarDays, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/_admin/classes/$id")({
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
  wodplace_users: { name: string } | null;
};

function ClassDetail() {
  const { id } = Route.useParams();
  const { boxId } = useBox();
  const [tab, setTab] = useState<"asistentes" | "espera">("asistentes");
  const [q, setQ] = useState("");

  const cls = useQuery({
    queryKey: ["class", boxId, id],
    queryFn: async () =>
      (await supabase.from("class_sessions").select("*, coaches(name)").eq("box_id", boxId).eq("id", id).maybeSingle()).data,
  });

  const attendees = useQuery({
    queryKey: ["class-bookings", boxId, id],
    queryFn: async () => ((await supabase
      .from("class_bookings")
      .select("id, status, wodplace_users(name)")
      .eq("box_id", boxId)
      .eq("session_id", id)).data ?? []) as unknown as BookingRow[],
  });

  const c = cls.data;
  if (!c) return <AdminShell title="Clase" showBack><p className="p-6 text-center text-sm">Cargando...</p></AdminShell>;

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
    <AdminShell title="Clases" showBack>
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
            }} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{String(c.start_time).slice(0, 5)} - {end}</span>
          <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" />{c.coaches?.name || "Sin coach"}</span>
          <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(parseISO(c.session_date), "dd MMM yyyy", { locale: es })}</span>
        </div>

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
            </div>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[76px] z-30 mx-auto max-w-md px-4 pb-2">
        <AddParticipant classId={id} />
      </div>
    </AdminShell>
  );
}

function EditClass({ classId, initial }: {
  classId: string;
  initial: { name: string; start_time: string; duration_minutes: number; capacity: number; session_date: string };
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const qc = useQueryClient();
  const { boxId } = useBox();
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("class_sessions").update(form).eq("box_id", boxId).eq("id", classId);
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
    onSuccess: () => { toast.success("Agregado"); qc.invalidateQueries({ queryKey: ["class-bookings", boxId, classId] }); setOpen(false); setQ(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });
  return (
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
            <button key={m.user_id} onClick={() => add.mutate(m.user_id)}
              className="flex w-full items-center gap-3 rounded-xl bg-secondary p-2 text-left">
              <Avatar name={m.wodplace_users?.name ?? "?"} size={32} />
              <span className="text-sm">{m.wodplace_users?.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
