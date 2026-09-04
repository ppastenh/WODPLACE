import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Dumbbell } from "lucide-react";
import type { ReactNode } from "react";
import { NotificationsBell } from "./NotificationsBell";
import { useBox } from "@/lib/box-context";

function BoxSwitcher() {
  const { boxId, boxes, setBoxId } = useBox();
  if (boxes.length <= 1) return null;
  return (
    <select
      value={boxId}
      onChange={(e) => setBoxId(e.target.value)}
      aria-label="Box activo"
      className="max-w-[38vw] shrink truncate rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"
    >
      {boxes.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}


type Props = {
  title?: string;
  showBack?: boolean;
  right?: ReactNode;
};

export function MobileHeader({ title, showBack, right }: Props) {
  const canBack = useRouterState({ select: (s) => s.location.pathname !== "/dashboard" });
  const backVisible = showBack && canBack;
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
        {backVisible ? (
          <Link
            to=".."
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground"
            aria-label="Volver"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : !title ? (
          // Brand block only where there's no section title — today that's
          // just the dashboard ("Inicio"). Every other screen passes a
          // title, so it stands alone instead of sitting next to it.
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </div>
            <span className="text-base font-black tracking-tight">Dlovebox</span>
          </Link>
        ) : null}
        {title && <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h1>}
        {!title && <div className="flex-1" />}
        <BoxSwitcher />
        <NotificationsBell />
        {right}

      </div>
    </header>
  );
}
