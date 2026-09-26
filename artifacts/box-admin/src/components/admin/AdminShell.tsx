import type { ReactNode } from "react";
import { MobileHeader } from "./MobileHeader";
import { BottomNav } from "./BottomNav";

type Props = {
  title?: string;
  showBack?: boolean;
  /** Overrides the back arrow's destination — needed for routes whose URL
   *  has no real route one segment up (e.g. /member-detail/$id, where
   *  MobileHeader's default `to=".."` would land on /member-detail, a 404).
   *  Leave unset for routes where ".." already resolves correctly (e.g.
   *  more/* going up to /more). */
  backTo?: string;
  right?: ReactNode;
  children: ReactNode;
};

export function AdminShell({ title, showBack, backTo, right, children }: Props) {
  return (
    <div className="min-h-dvh bg-background">
      <MobileHeader title={title} showBack={showBack} backTo={backTo} right={right} />
      <main className="mx-auto max-w-md px-4 pb-28 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
