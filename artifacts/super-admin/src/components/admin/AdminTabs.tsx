import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  FileCheck2,
  LifeBuoy,
  ScrollText,
  Users,
} from "lucide-react";

/** Grouped, not a flat list — see the "5 ajustes" reorganization proposal:
 *  visión general / gestión de la plataforma (boxes + su acuerdo) /
 *  supervisión (soporte + auditoría, ambas de "mirar qué pasó") /
 *  administración del panel mismo (quién tiene acceso de super admin). */
const groups = [
  [{ to: "/super-admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  [
    { to: "/super-admin/boxes", label: "Boxes", icon: Building2, exact: false },
    { to: "/super-admin/agreements", label: "Acuerdos", icon: FileCheck2, exact: false },
  ],
  [
    { to: "/super-admin/support", label: "Soporte", icon: LifeBuoy, exact: false },
    { to: "/super-admin/audit", label: "Auditoría", icon: ScrollText, exact: false },
  ],
  [{ to: "/super-admin/admins", label: "Super Admins", icon: Users, exact: false }],
] as const;

/** Header + section tabs, same concept as box-admin's BottomNav — a
 *  horizontal bar here since this is a 6-section desktop-first panel
 *  rather than a 5-item mobile app. */
export function AdminTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-2 sm:px-4">
        {groups.map((group, i) => (
          <div key={i} className="flex shrink-0 items-center gap-1">
            {i > 0 && <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />}
            {group.map((it) => {
              const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
