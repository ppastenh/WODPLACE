import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Plus, ChevronLeft, ChevronRight, ArrowRight, User as UserIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { CLASS_TOPICS, EVENT_TOPICS, type ClassCategory } from "@/lib/class-topics";
import {
  format, addDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addMonths, isSameDay, isSameMonth, isBefore, startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { ClassQuickView } from "@/components/admin/ClassQuickView";
import { useIsMobile } from "@/hooks/use-mobile";


const WEEK_DAYS = [
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "M", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
  { label: "D", value: 0 },
];

const DAY_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const HOUR_START = 6;
const HOUR_END = 23;
const HOUR_PX = 72;
const COMPACT_PX = 22;
const GUTTER = 52;

/** Hours (absolute, 0-23) that any class overlaps. */
function busyHours(list: ClassRow[]) {
  const set = new Set<number>();
  for (const c of list) {
    const [h, m] = c.start_time.split(":").map(Number);
    const start = h * 60 + m;
    const end = start + (c.duration_minutes || 60);
    for (let hh = Math.floor(start / 60); hh <= Math.floor((end - 1) / 60); hh++) set.add(hh);
  }
  return set;
}

/** Builds a minute -> pixel mapper with compact empty hours. */
function useTimeScale(list: ClassRow[]) {
  const busy = busyHours(list);
  const heights: number[] = [];
  const tops: number[] = [];
  let acc = 0;
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    tops.push(acc);
    const hh = busy.has(h) ? HOUR_PX : COMPACT_PX;
    heights.push(hh);
    acc += hh;
  }
  const total = acc;
  const y = (minutes: number) => {
    const clamped = Math.min(Math.max(minutes, HOUR_START * 60), (HOUR_END + 1) * 60);
    const h = Math.min(Math.floor(clamped / 60), HOUR_END);
    const i = h - HOUR_START;
    return tops[i] + ((clamped - h * 60) / 60) * heights[i];
  };
  return { busy, heights, tops, total, y };
}


export const Route = createFileRoute("/_authenticated/_admin/classes")({
  head: () => ({
    meta: [
      { title: "Clases — Dlovebox" },
      { name: "description", content: "Calendario semanal y mensual de clases y WODs del box." },
      { property: "og:title", content: "Clases — Dlovebox" },
      { property: "og:description", content: "Calendario de clases del box." },
    ],
  }),
  component: ClassesPage,
});

type ClassRow = {
  id: string;
  name: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  capacity: number;
  level: string;
  status: string;
  notes: string | null;
  coach: { name: string } | null;
  class_bookings: { id: string; status: string; attended: boolean | null }[];
};

function useClassesRange(from: Date, to: Date) {
  const { boxId } = useBox();
  const f = format(from, "yyyy-MM-dd");
  const t = format(to, "yyyy-MM-dd");
  return useQuery({
    queryKey: ["classes-range", boxId, f, t],
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from("class_sessions")
        .select("id, name, session_date, start_time, duration_minutes, capacity, level, status, notes, coach:coaches(name)")
        .eq("box_id", boxId)
        .gte("session_date", f)
        .lte("session_date", t)
        .order("start_time");
      const rows = (sessions ?? []) as unknown as Omit<ClassRow, "class_bookings">[];
      if (rows.length === 0) return [] as ClassRow[];

      // class_bookings has no FK to class_sessions (kept loose on purpose), so
      // it can't be embedded — fetch and group in JS.
      const { data: bookings } = await supabase
        .from("class_bookings")
        .select("id, status, attended, session_id")
        .eq("box_id", boxId)
        .in("session_id", rows.map((r) => r.id));
      const bySession = new Map<string, { id: string; status: string; attended: boolean | null }[]>();
      for (const b of bookings ?? []) {
        const arr = bySession.get(b.session_id) ?? [];
        arr.push({ id: b.id, status: b.status, attended: b.attended });
        bySession.set(b.session_id, arr);
      }
      return rows.map((r) => ({ ...r, class_bookings: bySession.get(r.id) ?? [] })) as ClassRow[];
    },
  });
}

function ClassesPage() {
  const [mode, setMode] = useState<"semana" | "mes">("semana");
  const [selected, setSelected] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);

  return (
    <AdminShell
      title="Clases"
      right={
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Nueva clase"
          className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
        {(["semana", "mes"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full py-2 text-sm font-semibold capitalize transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "semana" ? (
        <WeekView selected={selected} onSelect={setSelected} />
      ) : (
        <MonthView selected={selected} onSelect={setSelected} onViewAll={() => setMode("semana")} />
      )}

      <AddClassFab defaultDate={format(selected, "yyyy-MM-dd")} open={addOpen} onOpenChange={setAddOpen} />
    </AdminShell>
  );
}

/* ---------------- Week ---------------- */

function layoutDay(list: ClassRow[]) {
  const items = [...list]
    .map((c) => {
      const [h, m] = c.start_time.split(":").map(Number);
      const start = h * 60 + m;
      return { c, start, end: start + (c.duration_minutes || 60) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const out: { c: ClassRow; col: number; cols: number }[] = [];
  let group: typeof items = [];
  let groupEnd = -1;

  const flush = () => {
    if (!group.length) return;
    const colEnds: number[] = [];
    const assigned = group.map((it) => {
      let col = colEnds.findIndex((e) => e <= it.start);
      if (col === -1) { col = colEnds.length; colEnds.push(it.end); }
      else colEnds[col] = it.end;
      return { it, col };
    });
    const cols = colEnds.length;
    assigned.forEach(({ it, col }) => out.push({ c: it.c, col, cols }));
    group = [];
    groupEnd = -1;
  };

  for (const it of items) {
    if (group.length && it.start >= groupEnd) flush();
    group.push(it);
    groupEnd = Math.max(groupEnd, it.end);
  }
  flush();
  return out;
}



function WeekView({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const isMobile = useIsMobile();
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selected, { weekStartsOn: 1 });
  const { data } = useClassesRange(weekStart, weekEnd);
  const dayKey = format(selected, "yyyy-MM-dd");
  const dayClasses = (data ?? []).filter((c) => c.session_date === dayKey);
  const scale = useTimeScale(dayClasses);
  const [quick, setQuick] = useState<ClassRow | null>(null);


  return (
    <div className="mt-4">
      <h2 className="text-xl font-black tracking-tight">Calendario</h2>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((lbl, i) => {
          const d = addDays(weekStart, i);
          const active = isSameDay(d, selected);
          return (
            <button key={lbl} onClick={() => onSelect(d)} className="flex flex-col items-center gap-1 py-1">
              <span className="text-[10px] font-semibold text-muted-foreground">{lbl}</span>
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
              >
                {format(d, "d")}
              </span>
            </button>
          );
        })}
      </div>

      {isMobile ? (
        <MobileDayClasses dayClasses={dayClasses} onQuick={setQuick} />
      ) : (
        <div className="mt-4 border-t border-border/60 pt-3">
          <div className="relative" style={{ height: scale.total + 8 }}>
            {Array.from({ length: HOUR_END - HOUR_START + 1 }).map((_, i) => {
              const hour = HOUR_START + i;
              const isBusy = scale.busy.has(hour);
              return (
                <div key={i}>
                  <div className="absolute left-0 right-0 flex items-center gap-2" style={{ top: scale.tops[i] }}>
                    <span
                      className={`w-11 shrink-0 -translate-y-1/2 text-[11px] tabular-nums ${
                        isBusy ? "font-semibold text-foreground" : "font-medium text-muted-foreground/60"
                      }`}
                    >
                      {String(hour).padStart(2, "0")}:00
                    </span>
                    {!isBusy && <div className="flex-1 border-t border-border/30" />}
                  </div>
                  {isBusy &&
                    [1, 2, 3].map((q) => (
                      <div
                        key={q}
                        className="absolute right-0 border-t border-dashed border-border/20"
                        style={{ top: scale.tops[i] + (scale.heights[i] * q) / 4, left: GUTTER }}
                      />
                    ))}
                </div>
              );
            })}

            {layoutDay(dayClasses).map(({ c, col, cols }) => {
              const [h, m] = c.start_time.split(":").map(Number);
              const dur = c.duration_minutes || 60;
              const startMin = h * 60 + m;
              const endMin = startMin + dur;
              const top = scale.y(startMin);
              const height = Math.max(34, scale.y(endMin) - top - 4);
              const enrolled = c.class_bookings?.length ?? 0;
              const attended = (c.class_bookings ?? []).filter((a) => a.attended === true).length;
              const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
              const widthPct = 100 / cols;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setQuick(c)}
                  className="absolute flex flex-col justify-center overflow-hidden rounded-[18px] border border-primary/30 bg-gradient-to-br from-primary/25 to-primary/5 px-3 py-1.5 text-left transition-transform active:scale-[0.99]"
                  style={{
                    top,
                    height,
                    left: `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${(col * widthPct) / 100})`,
                    width: `calc((100% - ${GUTTER}px) * ${widthPct / 100} - 4px)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-bold leading-tight">{c.name}</p>
                    <span className="shrink-0 text-[11px] font-bold text-primary">{attended}/{enrolled}</span>
                  </div>
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    {c.start_time.slice(0, 5)} - {end}
                  </p>
                  {c.coach?.name && height > 52 && (
                    <p className="truncate text-[11px] leading-tight text-muted-foreground/80">{c.coach.name}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ClassQuickView
        c={quick ? { ...quick, enrolled: quick.class_bookings?.length ?? 0, attended: (quick.class_bookings ?? []).filter((a) => a.attended === true).length } : null}
        open={!!quick}
        onOpenChange={(v) => !v && setQuick(null)}
      />
    </div>
  );
}

/* ---------------- Week (mobile) ---------------- */
// Replaces the 24h timeline (with its empty-hour rows) on narrow viewports
// with a compact, grouped-by-time-of-day list — the desktop/web timeline
// above is untouched and still renders as-is for wider viewports.

function startMinutesOf(c: ClassRow): number {
  const [h, m] = c.start_time.split(":").map(Number);
  return h * 60 + m;
}

const DAY_SECTIONS = [
  { key: "manana", label: "Mañana", inSection: (min: number) => min < 12 * 60 },
  { key: "tarde", label: "Tarde", inSection: (min: number) => min >= 12 * 60 && min < 19 * 60 },
  { key: "noche", label: "Noche", inSection: (min: number) => min >= 19 * 60 },
] as const;

function MobileDayClasses({ dayClasses, onQuick }: { dayClasses: ClassRow[]; onQuick: (c: ClassRow) => void }) {
  const sorted = [...dayClasses].sort((a, b) => startMinutesOf(a) - startMinutesOf(b));

  return (
    <div className="mt-4 space-y-5">
      {DAY_SECTIONS.map((section) => {
        const items = sorted.filter((c) => section.inSection(startMinutesOf(c)));
        return (
          <div key={section.key}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{section.label}</p>
            {items.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">{section.label}: sin clases</p>
            ) : (
              <div className="mt-2 space-y-2">
                {items.map((c) => (
                  <MobileClassCard key={c.id} c={c} onQuick={() => onQuick(c)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MobileClassCard({ c, onQuick }: { c: ClassRow; onQuick: () => void }) {
  const startMin = startMinutesOf(c);
  const endMin = startMin + (c.duration_minutes || 60);
  const fmtMin = (min: number) =>
    `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const enrolled = c.class_bookings?.length ?? 0;
  const capacity = c.capacity ?? 0;

  return (
    <button
      type="button"
      onClick={onQuick}
      className="flex w-full items-stretch gap-3 text-left transition-transform active:scale-[0.99]"
    >
      <div className="w-11 shrink-0 pt-3 text-right">
        <p className="text-xs font-bold tabular-nums">{fmtMin(startMin)}</p>
        <p className="text-[10px] tabular-nums text-muted-foreground">{fmtMin(endMin)}</p>
      </div>
      <div className="flex-1 rounded-2xl border border-l-4 border-border/60 border-l-primary bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-bold">{c.name}</p>
          <span className="shrink-0 text-xs font-bold text-primary">
            {enrolled}/{capacity}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <UserIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{c.coach?.name ?? "Sin coach asignado"}</span>
        </div>
      </div>
    </button>
  );
}

/* ---------------- Month ---------------- */

function MonthView({
  selected,
  onSelect,
  onViewAll,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  /** Switches ClassesPage to the Semana view (already on `selected`), reusing
   *  its Mañana/Tarde/Noche grouped list instead of navigating to a single
   *  class's detail page — see "Ver todas las clases del día" below. */
  onViewAll: () => void;
}) {
  const [cursor, setCursor] = useState(startOfMonth(selected));
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const { data } = useClassesRange(gridStart, gridEnd);
  const withClasses = new Set((data ?? []).map((c) => c.session_date));
  const dayKey = format(selected, "yyyy-MM-dd");
  const dayClasses = (data ?? []).filter((c) => c.session_date === dayKey);
  const [quick, setQuick] = useState<ClassRow | null>(null);


  const cells: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) cells.push(d);
  const today = startOfDay(new Date());

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setCursor(addMonths(cursor, -1))} className="grid h-9 w-9 place-items-center rounded-full bg-secondary">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-base font-black capitalize">{format(cursor, "MMMM yyyy", { locale: es })}</p>
        <button onClick={() => setCursor(addMonths(cursor, 1))} className="grid h-9 w-9 place-items-center rounded-full bg-secondary">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {DAY_LABELS.map((l) => (
          <span key={l} className="text-[10px] font-semibold text-muted-foreground">{l}</span>
        ))}
        {cells.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const active = isSameDay(d, selected);
          const inMonth = isSameMonth(d, cursor);
          // Only dims past days — today onward keeps the normal color, and
          // the selected day always keeps its primary highlight regardless.
          const isPast = isBefore(d, today);
          return (
            <button key={key} onClick={() => onSelect(d)} className="flex flex-col items-center py-1">
              <span
                className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : !inMonth
                      ? "text-muted-foreground/40"
                      : isPast
                        ? "text-muted-foreground/60"
                        : "text-foreground"
                }`}
              >
                {format(d, "d")}
              </span>
              <span className={`mt-0.5 h-1 w-1 rounded-full ${withClasses.has(key) && !active ? "bg-primary" : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      <h3 className="mt-5 text-sm font-bold">
        Clases · <span className="capitalize">{format(selected, "EEEE d 'de' MMMM", { locale: es })}</span>
      </h3>
      <div className="mt-2 space-y-2">
        {dayClasses.length === 0 && (
          <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">Sin clases este día</p>
        )}
        {dayClasses.slice(0, 3).map((c) => (
          <ClassCard key={c.id} c={c} onQuick={() => setQuick(c)} />
        ))}
      </div>
      {dayClasses.length > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="mb-6 mt-3 flex w-full items-center justify-between rounded-2xl px-1 py-3 text-xs font-semibold text-primary active:bg-secondary/60"
        >
          Ver todas las clases del día <ArrowRight className="h-4 w-4" />
        </button>
      )}

      <ClassQuickView
        c={quick ? { ...quick, enrolled: quick.class_bookings?.length ?? 0, attended: (quick.class_bookings ?? []).filter((a) => a.attended === true).length } : null}
        open={!!quick}
        onOpenChange={(v: boolean) => !v && setQuick(null)}
      />
    </div>
  );
}

function ClassCard({ c, onQuick }: { c: ClassRow; onQuick: () => void }) {
  const enrolled = c.class_bookings?.length ?? 0;
  const attended = (c.class_bookings ?? []).filter((a) => a.attended === true).length;
  const [h, m] = c.start_time.split(":").map(Number);
  const endMin = h * 60 + m + (c.duration_minutes || 60);
  const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
  return (
    <button
      type="button"
      onClick={onQuick}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-left active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{c.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {c.start_time.slice(0, 5)} - {end}
        </p>
        {c.coach?.name && <p className="truncate text-[11px] text-muted-foreground">{c.coach.name}</p>}
      </div>
      <span className="shrink-0 text-xs font-bold text-primary">{attended}/{enrolled}</span>
    </button>
  );
}


/* ---------------- Create ---------------- */

function AddClassFab({
  defaultDate,
  open,
  onOpenChange,
}: {
  defaultDate: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [form, setForm] = useState({
    name: "",
    session_date: defaultDate,
    start_time: "07:00",
    duration_minutes: 60,
    capacity: 15,
    level: "todos" as string,
    coach_id: "",
  });
  const [category, setCategory] = useState<ClassCategory>("clase");
  const [customName, setCustomName] = useState("");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [weeksAhead, setWeeksAhead] = useState(8);

  const baseDow = (() => {
    try { return parseISO(form.session_date).getDay(); } catch { return new Date().getDay(); }
  })();

  const toggleDay = (d: number) => {
    setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const openChange = (v: boolean) => {
    onOpenChange(v);
    if (v) {
      setForm((f) => ({ ...f, session_date: defaultDate }));
      setSelectedDays([baseDow]);
    }
  };

  const { data: coaches } = useQuery({
    queryKey: ["coaches", boxId],
    queryFn: async () => (await supabase.from("coaches").select("id, name").eq("box_id", boxId).order("name")).data ?? [],
  });
  const mut = useMutation({
    mutationFn: async () => {
      const base = parseISO(form.session_date);
      const common = {
        box_id: boxId,
        name: form.name === "otro" ? customName.trim() : form.name,
        start_time: form.start_time,
        duration_minutes: form.duration_minutes,
        capacity: form.capacity,
        level: form.level,
        coach_id: form.coach_id || null,
      };
      const rows: Array<typeof common & { session_date: string }> = [];
      if (repeatWeekly && selectedDays.length > 0) {
        const seen = new Set<string>();
        for (let w = 0; w < weeksAhead; w++) {
          for (const dow of selectedDays) {
            const weekStart = addDays(base, w * 7);
            const diff = (dow - weekStart.getDay() + 7) % 7;
            const d = addDays(weekStart, diff);
            if (d < base) continue;
            const key = format(d, "yyyy-MM-dd");
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({ ...common, session_date: key });
          }
        }
      } else {
        rows.push({ ...common, session_date: form.session_date });
      }
      const { error } = await supabase.from("class_sessions").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => { toast.success(n > 1 ? `${n} clases creadas` : "Clase creada"); qc.invalidateQueries({ queryKey: ["classes-range"] }); onOpenChange(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>Nueva clase</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
          <div className="space-y-2">
            <Label>Categoría</Label>
            <div className="flex gap-2">
              {(["clase", "evento"] as ClassCategory[]).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => { setCategory(c); setForm((f) => ({ ...f, name: "" })); setCustomName(""); }}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-bold ${
                    category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  {c === "clase" ? "Clase" : "Evento"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(category === "clase" ? CLASS_TOPICS : EVENT_TOPICS).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => { setForm((f) => ({ ...f, name: t })); setCustomName(""); }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    form.name === t ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, name: "otro" }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  form.name === "otro" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                Otro…
              </button>
            </div>
            {form.name === "otro" && (
              <Input
                required
                maxLength={60}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={category === "clase" ? "Escribe la clase" : "Escribe el evento"}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Fecha</Label><Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} /></div>
            <div><Label>Hora</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Duración (min)</Label><Input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
            <div><Label>Cupos</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          </div>
          <div>
            <Label>Nivel</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="principiante">Principiante</SelectItem>
                <SelectItem value="intermedio">Intermedio</SelectItem>
                <SelectItem value="avanzado">Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Coach</Label>
            <Select value={form.coach_id} onValueChange={(v) => setForm({ ...form, coach_id: v })}>
              <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
              <SelectContent>
                {(coaches ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Label className="text-sm">Repetir esta clase semanalmente</Label>
                <p className="text-xs text-muted-foreground">Crea la clase en los días elegidos</p>
              </div>
              <Switch checked={repeatWeekly} onCheckedChange={setRepeatWeekly} />
            </div>
            {repeatWeekly && (
              <>
                <div className="flex justify-between gap-1">
                  {WEEK_DAYS.map((d, i) => {
                    const active = selectedDays.includes(d.value);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`h-10 w-10 rounded-full text-sm font-semibold transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border border-primary"
                            : "border border-border text-foreground"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <Label className="text-xs">Repetir por (semanas)</Label>
                  <Input type="number" min={1} max={52} value={weeksAhead} onChange={(e) => setWeeksAhead(Math.max(1, Number(e.target.value)))} />
                </div>
              </>
            )}
          </div>
          <Button type="submit" disabled={mut.isPending} className="w-full rounded-full h-11 font-semibold">
            {mut.isPending ? "Guardando..." : "Crear clase"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
