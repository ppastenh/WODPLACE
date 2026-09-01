import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";

type OAuthDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Falta authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
      <p className="text-sm text-muted-foreground">
        No se pudo cargar esta solicitud de autorización: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "la aplicación";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) { setBusy(false); setError(err.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("El servidor de autorización no devolvió una URL de retorno."); return; }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <Dumbbell className="h-8 w-8" />
      </div>
      <div className="mt-6 w-full max-w-sm rounded-3xl border bg-card p-6 text-center">
        <h1 className="text-xl font-bold">Conectar {clientName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {clientName} podrá usar Dlovebox en tu nombre, con tus mismos permisos.
        </p>
        {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
        <div className="mt-6 space-y-2">
          <Button disabled={busy} onClick={() => decide(true)} className="h-12 w-full rounded-full font-semibold">
            Autorizar
          </Button>
          <Button disabled={busy} variant="ghost" onClick={() => decide(false)} className="h-12 w-full rounded-full">
            Cancelar
          </Button>
        </div>
      </div>
    </main>
  );
}
