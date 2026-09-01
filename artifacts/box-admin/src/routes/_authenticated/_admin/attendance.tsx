import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "./members";
import { toast } from "sonner";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/_admin/attendance")({
  head: () => ({
    meta: [
      { title: "Asistencia — Dlovebox" },
      { name: "description", content: "Check-in de miembros, historial y estadísticas semanales." },
      { property: "og:title", content: "Asistencia — Dlovebox" },
      { property: "og:description", content: "Check-in y asistencia diaria." },
    ],
  }),
  component: AttendancePage,
});

type SearchHit = { user_id: string; photo_url: string | null; wodplace_users: { name: string } | null };
type TodayRow = { id: string; attended_at: string; wodplace_users: { name: string } | null };

function AttendancePage() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const { boxId } = useBox();
  const todayStart = startOfDay(new Date()).toISOString();

  const search = useQuery({
    queryKey: ["att-members", boxId, q],
    queryFn: async () => ((await supabase
      .from("box_members")
      .select("user_id, photo_url, wodplace_users!inner(name)")
      .eq("box_id", boxId)
      .eq("status", "activo")
      .ilike("wodplace_users.name", `%${q}%`)
      .limit(8)).data ?? []) as unknown as SearchHit[],
    enabled: q.length > 0,
  });

  const todayList = useQuery({
    queryKey: ["att-today", boxId],
    queryFn: async () => ((await supabase
      .from("attendance")
      .select("id, attended_at, wodplace_users(name)")
      .eq("box_id", boxId)
      .gte("attended_at", todayStart)
      .order("attended_at", { ascending: false })).data ?? []) as unknown as TodayRow[],
  });

  const weekly = useQuery({
    queryKey: ["att-weekly", boxId],
    queryFn: async () => {
      const from = subDays(new Date(), 6);
      const { data } = await supabase
        .from("attendance")
        .select("attended_at")
        .eq("box_id", boxId)
        .gte("attended_at", from.toISOString());
      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        buckets[d] = 0;
      }
      (data ?? []).forEach((r) => {
        const d = format(new Date(r.attended_at), "yyyy-MM-dd");
        if (buckets[d] !== undefined) buckets[d]++;
      });
      return Object.entries(buckets).map(([date, count]) => ({ date, count }));
    },
  });

  const checkin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("attendance").insert({ box_id: boxId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Check-in registrado"); qc.invalidateQueries({ queryKey: ["att-today"] }); qc.invalidateQueries({ queryKey: ["att-weekly"] }); setQ(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const max = Math.max(1, ...(weekly.data ?? []).map((d) => d.count));

  return (
    <AdminShell title="Asistencia">
      <div className="rounded-3xl border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Check-in rápido</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar miembro..." className="pl-9 rounded-full h-11" />
        </div>
        {q && (
          <div className="mt-2 space-y-1">
            {(search.data ?? []).map((m) => (
              <button key={m.user_id} onClick={() => checkin.mutate(m.user_id)}
                className="flex w-full items-center gap-3 rounded-xl bg-secondary p-2 active:scale-[0.99] transition-transform">
                <Avatar name={m.wodplace_users?.name ?? "?"} url={m.photo_url} size={32} />
                <span className="flex-1 text-left text-sm">{m.wodplace_users?.name}</span>
                <Check className="h-4 w-4 text-primary" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">Últimos 7 días</h2>
        <div className="rounded-3xl border bg-card p-4">
          <div className="flex h-32 items-end gap-1.5">
            {(weekly.data ?? []).map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-md bg-primary/80"
                    style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{format(new Date(d.date), "EEEEEE", { locale: es })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">Asistieron hoy · {todayList.data?.length ?? 0}</h2>
        <div className="space-y-2">
          {todayList.data?.length === 0 && <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">Nadie ha marcado asistencia hoy</p>}
          {todayList.data?.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <Avatar name={a.wodplace_users?.name ?? "?"} size={36} />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{a.wodplace_users?.name}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(a.attended_at), "HH:mm")}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
