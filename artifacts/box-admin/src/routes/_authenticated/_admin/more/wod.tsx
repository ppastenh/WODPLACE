import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Search, Send } from "lucide-react";
import { useBox } from "@/lib/box-context";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_admin/more/wod")({
  head: () => ({
    meta: [
      { title: "WOD del día — Dlovebox" },
      { name: "description", content: "Publicá el WOD del día para los atletas del box." },
      { property: "og:title", content: "WOD del día — Dlovebox" },
      { property: "og:description", content: "Elegí un WOD del catálogo o armá uno personalizado." },
    ],
  }),
  component: WodPage,
});

type Wod = {
  id: string;
  name: string;
  format: "for_time" | "amrap" | "max_reps";
  time_cap_minutes: number | null;
  description: string;
  box_id: string | null;
};

type WodOfDay = {
  id: string;
  wod_id: string;
  session_date: string;
  notes: string | null;
  wods: Wod | null;
};

const FORMAT_LABELS: Record<Wod["format"], string> = {
  for_time: "For Time",
  amrap: "AMRAP",
  max_reps: "Max Reps",
};

function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

function WodPage() {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [q, setQ] = useState("");
  const [selectedWodId, setSelectedWodId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customFormat, setCustomFormat] = useState<Wod["format"]>("for_time");
  const [customTimeCap, setCustomTimeCap] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [notes, setNotes] = useState("");

  const catalog = useQuery({
    queryKey: ["wods-catalog", boxId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wods")
        .select("id, name, format, time_cap_minutes, description, box_id")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Wod[];
    },
  });

  const today = useQuery({
    queryKey: ["wod-of-day", boxId, todayKey()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wod_of_day")
        .select("id, wod_id, session_date, notes, wods(id, name, format, time_cap_minutes, description, box_id)")
        .eq("box_id", boxId)
        .eq("session_date", todayKey())
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as WodOfDay | null) ?? null;
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      let wodId = selectedWodId;

      if (mode === "custom") {
        if (!customName.trim() || !customDescription.trim()) {
          throw new Error("Completá nombre y descripción del WOD personalizado");
        }
        const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const { error } = await supabase.from("wods").insert({
          id,
          name: customName.trim(),
          format: customFormat,
          time_cap_minutes: customFormat === "amrap" && customTimeCap ? Number(customTimeCap) : null,
          description: customDescription.trim(),
          box_id: boxId,
        });
        if (error) throw error;
        wodId = id;
      }

      if (!wodId) throw new Error("Elegí un WOD del catálogo o armá uno personalizado");

      const { error } = await supabase.from("wod_of_day").upsert(
        {
          box_id: boxId,
          wod_id: wodId,
          session_date: todayKey(),
          notes: notes.trim() || null,
        },
        { onConflict: "box_id,session_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("WOD del día publicado");
      setSelectedWodId(null);
      setCustomName("");
      setCustomTimeCap("");
      setCustomDescription("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["wod-of-day", boxId] });
      qc.invalidateQueries({ queryKey: ["wods-catalog", boxId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo publicar el WOD"),
  });

  const filteredCatalog = (catalog.data ?? []).filter((w) =>
    w.name.toLowerCase().includes(q.toLowerCase()),
  );

  const canPublish =
    !publish.isPending && (mode === "catalog" ? !!selectedWodId : customName.trim().length > 0 && customDescription.trim().length > 0);

  return (
    <AdminShell title="WOD del día" showBack>
      {today.data?.wods && (
        <section className="mb-5 rounded-3xl border bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary"><Flame className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">WOD de hoy</p>
              <p className="text-sm font-bold">{today.data.wods.name} · {FORMAT_LABELS[today.data.wods.format]}</p>
            </div>
          </div>
          <p className="whitespace-pre-line text-xs text-muted-foreground">{today.data.wods.description}</p>
          {today.data.notes && (
            <p className="mt-2 rounded-xl bg-card p-2 text-xs">{today.data.notes}</p>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">Podés reemplazarlo publicando otro abajo.</p>
        </section>
      )}

      <section className="rounded-3xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Publicar WOD</h2>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("catalog")}
            className={`h-10 rounded-full border text-xs font-semibold transition-colors ${
              mode === "catalog" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            Catálogo
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`h-10 rounded-full border text-xs font-semibold transition-colors ${
              mode === "custom" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            Personalizado
          </button>
        </div>

        {mode === "catalog" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar WOD..." className="h-11 rounded-2xl pl-9" />
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {filteredCatalog.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWodId(w.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    selectedWodId === w.id ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{w.name}</p>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {FORMAT_LABELS[w.format]}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{w.description}</p>
                  {w.box_id && <span className="mt-1 inline-block text-[10px] text-primary">Personalizado del box</span>}
                </button>
              ))}
              {filteredCatalog.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Sin resultados</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ej: WOD del viernes" />
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={customFormat} onValueChange={(v) => setCustomFormat(v as Wod["format"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent side="top">
                  <SelectItem value="for_time">For Time</SelectItem>
                  <SelectItem value="amrap">AMRAP</SelectItem>
                  <SelectItem value="max_reps">Max Reps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {customFormat === "amrap" && (
              <div>
                <Label>Cap de tiempo (minutos)</Label>
                <Input type="number" min={1} value={customTimeCap} onChange={(e) => setCustomTimeCap(e.target.value)} placeholder="Ej: 20" />
              </div>
            )}
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={customDescription}
                rows={4}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Ej: 21-15-9 Thrusters (95/65), Pull-ups"
              />
            </div>
          </div>
        )}

        <div className="mt-3">
          <Label>Notas del día (opcional)</Label>
          <Textarea
            value={notes}
            rows={2}
            maxLength={300}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Escalá a 65/45 si es tu primera vez"
          />
        </div>

        <button
          disabled={!canPublish}
          onClick={() => publish.mutate()}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground active:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {publish.isPending ? "Publicando..." : "Publicar WOD del día"}
        </button>
      </section>
    </AdminShell>
  );
}
