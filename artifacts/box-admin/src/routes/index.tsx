import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { storePendingInviteCode } from "@/lib/pendingInvite";

const searchSchema = z.object({
  invite: z.string().trim().min(1).max(64).optional(),
});

export const Route = createFileRoute("/")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    // Supabase's email-confirmation link lands here (emailRedirectTo,
    // see auth.tsx) with ?invite=CODE still attached alongside its own
    // auth tokens — stash it before deciding where to redirect so
    // _authenticated/route.tsx's beforeLoad picks it up right after.
    if (search.invite) storePendingInviteCode(search.invite);
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
