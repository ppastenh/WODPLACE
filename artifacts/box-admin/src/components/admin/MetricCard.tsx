import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
};

export function MetricCard({ icon: Icon, label, value, hint, accent }: Props) {
  return (
    <div className={`rounded-3xl border p-4 ${accent ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${accent ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-black tracking-tight">{value}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground/80">{hint}</div>}
    </div>
  );
}
