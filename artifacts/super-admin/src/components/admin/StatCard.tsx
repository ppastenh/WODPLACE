import type { ReactNode } from "react";

export function StatCard({
  icon,
  value,
  label,
  tone = "foreground",
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  tone?: "foreground" | "primary" | "destructive" | "success";
}) {
  const toneClass = {
    foreground: "text-foreground",
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-success",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground">{icon}</div>
      <div className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</div>
      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}
