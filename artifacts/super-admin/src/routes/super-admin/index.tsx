import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Clock, Users, TrendingUp, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/admin/StatCard";

export const Route = createFileRoute("/super-admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Super Admin" }] }),
  component: DashboardPage,
});

type BoxCounts = { activo: number; pendiente: number; rechazado: number; suspendido: number };

async function fetchBoxCounts(): Promise<BoxCounts> {
  const { data, error } = await supabase.from("boxes").select("status");
  if (error) throw error;
  const counts: BoxCounts = { activo: 0, pendiente: 0, rechazado: 0, suspendido: 0 };
  for (const row of data ?? []) {
    const s = row.status as keyof BoxCounts;
    if (s in counts) counts[s] += 1;
  }
  return counts;
}

async function fetchStudentTotal(): Promise<number> {
  const { count, error } = await supabase
    .from("box_members")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Easy-to-compute growth signal: new members across the whole platform in
 *  the last 30 days, via box_members.joined_at (already tracked per row). */
async function fetchRecentGrowth(): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("box_members")
    .select("*", { count: "exact", head: true })
    .gte("joined_at", since);
  if (error) throw error;
  return count ?? 0;
}

function DashboardPage() {
  const countsQ = useQuery({ queryKey: ["dashboard", "box-counts"], queryFn: fetchBoxCounts });
  const studentsQ = useQuery({ queryKey: ["dashboard", "students"], queryFn: fetchStudentTotal });
  const growthQ = useQuery({ queryKey: ["dashboard", "growth"], queryFn: fetchRecentGrowth });

  const counts = countsQ.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Panel General</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen de toda la plataforma, en tiempo real.
        </p>
      </div>

      {countsQ.isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudieron cargar los boxes: {String(countsQ.error)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          value={countsQ.isLoading ? "…" : (counts?.activo ?? 0)}
          label="Boxes activos"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          value={countsQ.isLoading ? "…" : (counts?.pendiente ?? 0)}
          label="Pendientes de aprobar"
          tone="primary"
        />
        <StatCard
          icon={<XCircle className="h-4 w-4" />}
          value={countsQ.isLoading ? "…" : (counts?.rechazado ?? 0)}
          label="Rechazados"
          tone="destructive"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          value={studentsQ.isLoading ? "…" : (studentsQ.data ?? "—")}
          label="Alumnos totales"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-success" /> Crecimiento reciente
        </div>
        <p className="mt-2 text-3xl font-bold text-success">
          {growthQ.isLoading ? "…" : `+${growthQ.data ?? 0}`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Alumnos nuevos en los últimos 30 días, en toda la plataforma.
        </p>
      </div>
    </div>
  );
}
