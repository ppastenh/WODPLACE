import { Loader2 } from "lucide-react";

/** Shown instead of "Acceso restringido" while a pending invite claim is
 *  settling (or about to be retried) — see _authenticated/route.tsx's
 *  pendingComponent and _admin.tsx's AdminLayout. */
export function ActivatingStaffAccess() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Activando tu acceso de staff…</p>
    </div>
  );
}
