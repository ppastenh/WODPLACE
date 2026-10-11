import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  claimPendingInviteOnce,
  consumeInviteClaimError,
  consumeJustJoinedStaff,
  markInviteClaimError,
  markJustJoinedStaff,
  readPendingInviteCode,
} from "@/lib/pendingInvite";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Catches the user landing here with a session for the FIRST time —
    // whether that's right after sign-in/sign-up (which also calls
    // claimPendingInvite itself, so this is a no-op then) or, the case
    // this exists for, after confirming their email via Supabase's own
    // link: a separate page load that never goes through auth.tsx's
    // submit handler at all, so nothing else would ever attempt this.
    // claimPendingInviteOnce() runs at most once per page load, so this
    // beforeLoad firing again on every later navigation is a cheap no-op.
    const result = await claimPendingInviteOnce();
    if (result?.claimed) {
      markJustJoinedStaff();
      if (location.pathname !== "/dashboard") {
        throw redirect({ to: "/dashboard" });
      }
    } else if (result && !result.claimed && result.message && !readPendingInviteCode()) {
      // Code is gone -> this was a definitive rejection (invalid/expired),
      // not a transient one (which leaves the code in place to retry
      // later and should stay silent here).
      markInviteClaimError(result.message);
    }

    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  useEffect(() => {
    if (consumeJustJoinedStaff()) {
      toast.success("¡Bienvenido al staff!", { duration: 6000 });
    }
    const errorMessage = consumeInviteClaimError();
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, []);

  return <Outlet />;
}
