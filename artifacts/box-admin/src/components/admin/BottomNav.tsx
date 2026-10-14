import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, Dumbbell, Wallet, MoreHorizontal } from "lucide-react";
import { useBox } from "@/lib/box-context";

const items: Array<{ to: string; label: string; icon: LucideIcon; adminOnly?: boolean }> = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/members", label: "Miembros", icon: Users },
  { to: "/classes", label: "Clases", icon: Dumbbell },
  { to: "/finances", label: "Finanzas", icon: Wallet, adminOnly: true },
  { to: "/more", label: "Más", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Finanzas es solo de administrador/dueño/super admin -- un coach nunca
  // toca pagos ni precios (decisión de producto, S3.A de la auditoría de
  // seguridad, 2026-10-14). El resto del menú no cambia.
  const { isAdmin } = useBox();
  const visibleItems = items.filter((it) => !it.adminOnly || isAdmin);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md">
      <div
        className={`mx-auto grid max-w-md px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 ${
          visibleItems.length === 5 ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {visibleItems.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className={`grid h-9 w-12 place-items-center rounded-xl transition-colors ${active ? "bg-primary/15" : ""}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
