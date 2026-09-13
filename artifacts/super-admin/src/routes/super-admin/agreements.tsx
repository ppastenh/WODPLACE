import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/super-admin/agreements")({
  head: () => ({ meta: [{ title: "Acuerdos de Plataforma — Super Admin" }] }),
  component: AgreementsPage,
});

type AdminAgreementStatus = {
  userId: string; // auth.users id
  email: string;
  boxName: string;
  accepted: boolean;
  acceptedAt: string | null;
};

async function fetchAgreementStatuses(): Promise<AdminAgreementStatus[]> {
  // 1. Every box_admin (super_admin is exempt from the agreement entirely —
  //    they're the other party to it, not someone who accepts it).
  const { data: roles, error: rolesErr } = await supabase
    .from("user_roles")
    .select("user_id, box_id")
    .eq("role", "box_admin");
  if (rolesErr) throw rolesErr;
  const roleRows = roles ?? [];
  if (roleRows.length === 0) return [];

  const adminIds = [...new Set(roleRows.map((r) => r.user_id))];
  const { data: profs, error: profErr } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", adminIds);
  if (profErr) throw profErr;
  const emailById = new Map((profs ?? []).map((p) => [p.id, p.email]));

  const boxIds = [...new Set(roleRows.map((r) => r.box_id).filter((v): v is string => !!v))];
  let boxNameById = new Map<string, string>();
  if (boxIds.length) {
    const { data: boxes, error: boxErr } = await supabase.from("boxes").select("id, name").in("id", boxIds);
    if (boxErr) throw boxErr;
    boxNameById = new Map((boxes ?? []).map((b) => [b.id, b.name]));
  }

  const admins = roleRows
    .map((r) => ({
      userId: r.user_id,
      email: emailById.get(r.user_id) ?? null,
      boxName: r.box_id ? (boxNameById.get(r.box_id) ?? "(box sin nombre)") : "(sin box asignado)",
    }))
    .filter((a): a is { userId: string; email: string; boxName: string } => !!a.email);

  // 2. Bridge to wodplace's local id space by email (same pattern as
  //    api-server's lib/adminRole.ts) — platform_agreement_acceptances.userId
  //    is a wodplace_users.id, not this auth.users uuid.
  const emails = admins.map((a) => a.email.toLowerCase());
  const { data: wodplaceUsers, error: wuErr } = await supabase
    .from("wodplace_users")
    .select("id, email")
    .in("email", emails);
  if (wuErr) throw wuErr;
  const wodplaceIdByEmail = new Map(
    (wodplaceUsers ?? []).map((u) => [u.email.toLowerCase(), u.id]),
  );

  const wodplaceIds = [...new Set([...wodplaceIdByEmail.values()])];
  let acceptedAtByWodplaceId = new Map<string, string>();
  if (wodplaceIds.length) {
    const { data: acceptances, error: accErr } = await supabase
      .from("platform_agreement_acceptances")
      .select("user_id, accepted_at")
      .in("user_id", wodplaceIds);
    if (accErr) throw accErr;
    acceptedAtByWodplaceId = new Map((acceptances ?? []).map((a) => [a.user_id, a.accepted_at]));
  }

  return admins.map((a) => {
    const wodplaceId = wodplaceIdByEmail.get(a.email.toLowerCase());
    const acceptedAt = wodplaceId ? (acceptedAtByWodplaceId.get(wodplaceId) ?? null) : null;
    return { userId: a.userId, email: a.email, boxName: a.boxName, accepted: !!acceptedAt, acceptedAt };
  });
}

function AgreementRow({ admin }: { admin: AdminAgreementStatus }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {admin.accepted ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        )}
        <span className="flex-1 text-sm font-medium">{admin.boxName}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="space-y-1 border-t border-border px-3 py-3 text-xs text-muted-foreground">
          <p>Admin: {admin.email}</p>
          <p>
            {admin.accepted && admin.acceptedAt
              ? `Aceptado el ${new Date(admin.acceptedAt).toLocaleString("es-CL")}`
              : "Todavía no aceptó el acuerdo."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function AgreementsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["agreements"],
    queryFn: fetchAgreementStatuses,
  });

  const admins = data ?? [];
  const accepted = admins.filter((a) => a.accepted);
  const pending = admins.filter((a) => !a.accepted);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Acuerdos de Plataforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Qué admins de box aceptaron el acuerdo de uso de la plataforma. super_admin queda exento
          — es la otra parte del acuerdo, no quien lo acepta. Tocá un box para ver el email del
          admin y la fecha.
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar: {String(error)}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Cargando…
        </div>
      ) : admins.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Todavía no hay ningún box_admin.
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-destructive">
              Sin aceptar ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos los admins de box aceptaron.</p>
            ) : (
              pending.map((a) => <AgreementRow key={a.userId} admin={a} />)
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-success">
              Aceptado ({accepted.length})
            </h2>
            {accepted.map((a) => (
              <AgreementRow key={a.userId} admin={a} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
