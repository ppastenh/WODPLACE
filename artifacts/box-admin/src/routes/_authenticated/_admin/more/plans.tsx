import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Plus, Pencil, Trash2, Check, X, MoreVertical, Copy, Star, PauseCircle, PlayCircle, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_admin/more/plans")({
  head: () => ({
    meta: [
      { title: "Planes — Dlovebox" },
      { name: "description", content: "Planes de membresía." },
      { property: "og:title", content: "Planes — Dlovebox" },
      { property: "og:description", content: "Planes de membresía." },
    ],
  }),
  component: PlansPage,
});

type Plan = {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  benefits: string[] | null;
  is_active: boolean;
  is_featured: boolean;
};

const empty = {
  name: "",
  price: "",
  duration_days: "30",
  benefits: [] as string[],
  is_active: true,
};

function PlansPage() {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const plans = useQuery({
    queryKey: ["plans", boxId],
    queryFn: async () =>
      ((await supabase.from("plans").select("*").eq("box_id", boxId).order("price")).data ?? []) as unknown as Plan[],
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["plans"] });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plans").delete().eq("box_id", boxId).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan eliminado");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const duplicate = useMutation({
    mutationFn: async (p: Plan) => {
      const { error } = await supabase.from("plans").insert({
        box_id: boxId,
        name: `${p.name} (copia)`,
        price: p.price,
        duration_days: p.duration_days,
        benefits: p.benefits ?? [],
        is_active: p.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan duplicado");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { is_active?: boolean; is_featured?: boolean } }) => {
      const { error } = await supabase.from("plans").update(patch).eq("box_id", boxId).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <AdminShell
      title="Planes"
      showBack
      right={
        <button
          onClick={() => setCreating(true)}
          className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      }
    >
      <div className="space-y-3">
        {plans.data?.length === 0 && (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sin planes creados
          </p>
        )}
        {plans.data?.map((p) => {
          const expanded = open === p.id;
          const count = p.benefits?.length ?? 0;
          return (
            <div key={p.id} className="rounded-2xl border bg-card">
              <div className="flex items-start gap-2 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-bold">{p.name}</p>
                    {p.is_featured && <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.duration_days} días</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-black text-primary">
                    ${Number(p.price).toLocaleString("es-CL")}
                  </p>
                  <p className="mt-0.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        p.is_active ? "bg-primary" : "bg-muted-foreground",
                      )}
                    />
                    {p.is_active ? "Activo" : "Inactivo"}
                  </p>
                </div>
                <button
                  onClick={() => setEditing(p)}
                  className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-2xl">
                    <DropdownMenuItem onClick={() => setEditing(p)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicate.mutate(p)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleFlag.mutate({ id: p.id, patch: { is_featured: !p.is_featured } })}
                    >
                      <Star className="mr-2 h-4 w-4" /> {p.is_featured ? "Quitar destacado" : "Destacar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleFlag.mutate({ id: p.id, patch: { is_active: !p.is_active } })}
                    >
                      {p.is_active ? (
                        <><PauseCircle className="mr-2 h-4 w-4" /> Desactivar</>
                      ) : (
                        <><PlayCircle className="mr-2 h-4 w-4" /> Activar</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        if (confirm(`¿Eliminar el plan "${p.name}"?`)) del.mutate(p.id);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <button
                onClick={() => setOpen(expanded ? null : p.id)}
                className="flex w-full items-center justify-between border-t px-4 py-3 text-left"
              >
                <span className="text-sm text-muted-foreground">
                  {count} beneficio{count === 1 ? "" : "s"} incluido{count === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  {expanded && "Ver menos"}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expanded ? "rotate-180 text-primary" : "text-muted-foreground",
                    )}
                  />
                </span>
              </button>

              {expanded && count > 0 && (
                <div className="px-4 pb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Beneficios incluidos
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {p.benefits!.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PlanDialog
        open={creating || !!editing}
        plan={editing}
        onDelete={(id) => del.mutate(id)}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
    </AdminShell>
  );
}

function PlanDialog({
  open,
  plan,
  onOpenChange,
  onDelete,
}: {
  open: boolean;
  plan: Plan | null;
  onOpenChange: (v: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [f, setF] = useState(empty);
  const [benefit, setBenefit] = useState("");
  const [key, setKey] = useState<string | null>(null);

  // sync form when the target plan changes
  const currentKey = plan?.id ?? "new";
  if (open && key !== currentKey) {
    setKey(currentKey);
    setF(
      plan
        ? {
            name: plan.name,
            price: String(plan.price),
            duration_days: String(plan.duration_days),
            benefits: plan.benefits ?? [],
            is_active: plan.is_active,
          }
        : empty,
    );
    setBenefit("");
  }

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: f.name,
        price: Number(f.price),
        duration_days: Number(f.duration_days),
        benefits: f.benefits,
        is_active: f.is_active,
      };
      const { error } = plan
        ? await supabase.from("plans").update(payload).eq("box_id", boxId).eq("id", plan.id)
        : await supabase.from("plans").insert({ ...payload, box_id: boxId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(plan ? "Plan actualizado" : "Plan creado");
      qc.invalidateQueries({ queryKey: ["plans"] });
      setKey(null);
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const addBenefit = () => {
    const v = benefit.trim();
    if (!v) return;
    setF((s) => ({ ...s, benefits: [...s.benefits, v] }));
    setBenefit("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setKey(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plan" : "Nuevo plan"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label>Nombre</Label>
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Precio</Label>
              <Input
                required
                type="number"
                step="0.01"
                value={f.price}
                onChange={(e) => setF({ ...f, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Duración (días)</Label>
              <Input
                required
                type="number"
                value={f.duration_days}
                onChange={(e) => setF({ ...f, duration_days: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Estado
            </Label>
            <Switch
              checked={f.is_active}
              onCheckedChange={(v) => setF((s) => ({ ...s, is_active: v }))}
            />
          </div>

          <div>
            <Label>Beneficios incluidos (opcional)</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={benefit}
                placeholder="Ej: Acceso a todas las clases del box"
                onChange={(e) => setBenefit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBenefit();
                  }
                }}
              />
              <Button type="button" variant="outline" className="shrink-0 rounded-full" onClick={addBenefit}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="mt-2 space-y-1.5">
              {f.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">{b}</span>
                  <button
                    type="button"
                    onClick={() => setF((s) => ({ ...s, benefits: s.benefits.filter((_, j) => j !== i) }))}
                    className="text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Button type="submit" disabled={mut.isPending} className="h-11 w-full rounded-full font-semibold">
            Guardar
          </Button>

          {plan && (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full border-destructive/40 font-semibold text-destructive"
              onClick={() => {
                if (confirm(`¿Eliminar el plan "${plan.name}"?`)) {
                  onDelete(plan.id);
                  setKey(null);
                  onOpenChange(false);
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar plan
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
