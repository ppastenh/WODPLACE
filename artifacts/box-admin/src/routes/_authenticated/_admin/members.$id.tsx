import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Avatar, StatusChip } from "./members";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Calendar, Edit2, PauseCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/members/$id")({
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
  next_payment_at: string | null;
  wodplace_users: { name: string; email: string } | null;
  plans: { name: string; price: number | null } | null;
};

function MemberDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { boxId } = useBox();

  const member = useQuery({
    queryKey: ["member", boxId, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("box_members")
        .select("user_id, status, phone, photo_url, notes, joined_at, next_payment_at, wodplace_users(name, email), plans(name, price)")
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

  const attendance = useQuery({
    queryKey: ["member-attendance", boxId, id],
    queryFn: async () => (await supabase.from("attendance").select("*").eq("box_id", boxId).eq("user_id", id).order("attended_at", { ascending: false }).limit(30)).data ?? [],
  });

  const prs = useQuery({
    queryKey: ["member-prs", boxId, id],
    queryFn: async () => (await supabase.from("prs").select("*").eq("box_id", boxId).eq("user_id", id).order("achieved_at", { ascending: false })).data ?? [],
  });

  const toggle = useMutation({
    mutationFn: async (newStatus: "activo" | "suspendido") => {
      const { error } = await supabase.from("box_members").update({ status: newStatus }).eq("box_id", boxId).eq("user_id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Actualizado"); qc.invalidateQueries({ queryKey: ["member", boxId, id] }); qc.invalidateQueries({ queryKey: ["members"] }); },
  });

  const m = member.data;
  if (!m) return <AdminShell title="Miembro" showBack><p className="p-6 text-center text-sm text-muted-foreground">{member.isLoading ? "Cargando..." : "No encontrado"}</p></AdminShell>;

  const fullName = m.wodplace_users?.name ?? "—";

  return (
    <AdminShell title="Perfil" showBack>
      <div className="flex flex-col items-center rounded-3xl border bg-card p-5 text-center">
        <Avatar name={fullName} url={m.photo_url} size={72} />
        <h1 className="mt-3 text-xl font-black">{fullName}</h1>
        <div className="mt-2"><StatusChip status={m.status} /></div>
        {m.plans?.name && <p className="mt-2 text-xs text-muted-foreground">Plan {m.plans.name}</p>}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="outline" className="rounded-2xl h-11 flex-col gap-1"><Edit2 className="h-4 w-4" /><span className="text-[10px]">Editar</span></Button>
        <Button variant="outline" onClick={() => toggle.mutate(m.status === "activo" ? "suspendido" : "activo")}
          className="rounded-2xl h-11 flex-col gap-1"><PauseCircle className="h-4 w-4" /><span className="text-[10px]">{m.status === "activo" ? "Suspender" : "Activar"}</span></Button>
        <Button variant="outline" className="rounded-2xl h-11 flex-col gap-1"><RefreshCw className="h-4 w-4" /><span className="text-[10px]">Renovar</span></Button>
      </div>

      <Tabs defaultValue="info" className="mt-5">
        <TabsList className="grid w-full grid-cols-4 rounded-full bg-secondary">
          <TabsTrigger value="info" className="rounded-full text-xs">Info</TabsTrigger>
          <TabsTrigger value="pay" className="rounded-full text-xs">Pagos</TabsTrigger>
          <TabsTrigger value="att" className="rounded-full text-xs">Asist.</TabsTrigger>
          <TabsTrigger value="prs" className="rounded-full text-xs">PRs</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4 space-y-2">
          <InfoRow icon={Mail} label="Email" value={m.wodplace_users?.email || "—"} />
          <InfoRow icon={Phone} label="Teléfono" value={m.phone || "—"} />
          <InfoRow icon={Calendar} label="Ingresó" value={m.joined_at ? format(new Date(m.joined_at), "dd MMM yyyy") : "—"} />
          <InfoRow icon={Calendar} label="Próximo pago" value={m.next_payment_at ? format(new Date(m.next_payment_at), "dd MMM yyyy") : "—"} />
          {m.notes && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observaciones</p>
              <p className="mt-1 text-sm">{m.notes}</p>
            </div>
          )}
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

        <TabsContent value="att" className="mt-4 space-y-2">
          {attendance.data?.length === 0 && <Empty text="Sin asistencias" />}
          {attendance.data?.map((a) => (
            <div key={a.id} className="rounded-2xl border bg-card p-3 text-sm">
              {format(new Date(a.attended_at), "dd MMM yyyy · HH:mm")}
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
    </AdminShell>
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
