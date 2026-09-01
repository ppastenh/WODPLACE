import type { ReactNode } from "react";
import { MobileHeader } from "./MobileHeader";
import { BottomNav } from "./BottomNav";

type Props = {
  title?: string;
  showBack?: boolean;
  right?: ReactNode;
  children: ReactNode;
};

export function AdminShell({ title, showBack, right, children }: Props) {
  return (
    <div className="min-h-dvh bg-background">
      <MobileHeader title={title} showBack={showBack} right={right} />
      <main className="mx-auto max-w-md px-4 pb-28 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
