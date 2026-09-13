import { LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth";
}

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">WODPLACE</span>
          <span className="ml-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-secondary-foreground">
            SUPER ADMIN
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            <LogOut className="h-3.5 w-3.5" /> Salir
          </button>
        </div>
      </div>
    </header>
  );
}
