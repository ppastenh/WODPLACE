import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, User as UserIcon, CalendarDays, Pencil, Trash2, ArrowRight, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export type QuickViewClass = {
  id: string;
  name: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  capacity: number;
  coach?: { name: string } | null;
  enrolled?: number;
  attended?: number;
};

export function ClassQuickView({
  c,
  open,
  onOpenChange,
}: {
  c: QuickViewClass | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    session_date: "",
    start_time: "",
    duration_minutes: 60,
    capacity: 15,
  });

  useEffect(() => {
    if (c) {
      setEditing(false);
      setForm({
        name: c.name,
        session_date: c.session_date,
        start_time: String(c.start_time).slice(0, 5),
        duration_minutes: c.duration_minutes || 60,
        capacity: c.capacity ?? 15,
      });
    }
  }, [c?.id]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["classes-range"] });
    if (c) qc.invalidateQueries({ queryKey: ["class", boxId, c.id] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!c) return;
      const { error } = await supabase.from("class_sessions").update(form).eq("box_id", boxId).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clase actualizada");
      invalidate();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!c) return;
      await supabase.from("class_bookings").delete().eq("box_id", boxId).eq("session_id", c.id);
      const { error } = await supabase.from("class_sessions").delete().eq("box_id", boxId).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clase eliminada");
      invalidate();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  if (!c) return null;

  const [h, m] = String(c.start_time).split(":").map(Number);
  const endMin = h * 60 + m + (c.duration_minutes || 60);
  const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
  const enrolled = c.enrolled ?? 0;
  const pct = c.capacity ? Math.min(100, (enrolled / c.capacity) * 100) : 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base">{editing ? "Editar clase" : c.name}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          {editing ? (
            <form
              onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
              className="space-y-3"
            >
              <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Fecha</Label><Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} /></div>
                <div><Label>Hora</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Duración (min)</Label><Input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
                <div><Label>Cupos</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="h-11 flex-1 rounded-full" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button type="submit" disabled={save.isPending} className="h-11 flex-1 rounded-full font-semibold">Guardar</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{String(c.start_time).slice(0, 5)} - {end}</span>
                <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" />{c.coach?.name || "Sin coach"}</span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(parseISO(c.session_date), "dd MMM yyyy", { locale: es })}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="shrink-0 text-sm font-bold">
                  <span className="text-primary">{enrolled}</span>
                  <span className="text-muted-foreground"> / {c.capacity} cupos</span>
                </p>
              </div>

              <Link
                to="/classes/$id"
                params={{ id: c.id }}
                onClick={() => onOpenChange(false)}
                className="mt-4 flex items-center justify-between rounded-2xl border bg-card px-4 py-3 text-sm font-semibold"
              >
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Ver asistentes</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 rounded-full" onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="outline"
                  disabled={del.isPending}
                  onClick={() => { if (confirm("¿Eliminar esta clase?")) del.mutate(); }}
                  className="h-11 rounded-full border-destructive/40 text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Small helper so callers can fetch fresh enrolled counts if needed. */
export function useClassEnrolled(classId: string | null) {
  const { boxId } = useBox();
  return useQuery({
    queryKey: ["class-enrolled", boxId, classId],
    enabled: !!classId,
    queryFn: async () =>
      (await supabase.from("class_bookings").select("id").eq("box_id", boxId).eq("session_id", classId!)).data?.length ?? 0,
  });
}
