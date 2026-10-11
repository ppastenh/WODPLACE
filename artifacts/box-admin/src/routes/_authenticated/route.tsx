import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ActivatingStaffAccess } from "@/components/admin/ActivatingStaffAccess";
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
  beforeLoad: async () => {
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
    //
    // Still fires twice in practice when two tabs of the same browser are
    // open at once (Supabase syncs the session across tabs via
    // localStorage + a storage event, and __root.tsx's listener calls
    // router.invalidate() on every SIGNED_IN) — each tab gets its own
    // page-load guard, so each makes its own one real call. That's fine
    // now that /invites/claim is idempotent for the same account: both
    // calls succeed. The actual bug this fix is for was different —
    // _admin's role check could run (in this SAME invalidate cycle) just
    // BEFORE the claim above committed, caching "no role yet" for the
    // rest of this render with nothing to re-trigger it once the claim
    // finished a moment later — the banner would show (this beforeLoad
    // succeeded) while the screen still rendered "Acceso restringido"
    // (_admin's read of it didn't). A hard navigation sidesteps that
    // entirely: it throws away the current render and everything it
    // cached, so _admin's role check on the fresh page load always runs
    // AFTER this claim, never racing it.
    const result = await claimPendingInviteOnce();
    if (result?.claimed) {
      markJustJoinedStaff();
      window.location.replace("/dashboard");
      // The page is about to unload — never resolve so nothing here
      // renders with half-updated state in the meantime.
      return new Promise<never>(() => {});
    } else if (result && !result.claimed && result.message && !readPendingInviteCode()) {
      // Code is gone -> this was a definitive rejection (invalid/expired),
      // not a transient one (which leaves the code in place to retry
      // later and should stay silent here).
      markInviteClaimError(result.message);
    }

    return { user: data.user };
  },
  // Shown while the beforeLoad above is still pending — covers both the
  // ordinary auth check and, when there's a pending invite code, the
  // claim itself settling. Without this, _admin's own beforeLoad could
  // otherwise be the first thing visibly rendered once this route
  // resolves, which for a brand-new claim could be a flash of "Acceso
  // restringido" before this beforeLoad's hard navigation kicks in.
  pendingComponent: () => (readPendingInviteCode() ? <ActivatingStaffAccess /> : null),
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
