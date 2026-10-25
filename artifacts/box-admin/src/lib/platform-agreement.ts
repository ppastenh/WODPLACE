import { apiFetch } from "@/lib/apiClient";

/**
 * Acuerdo de Plataforma — SOLO LECTURA desde el panel (F5a). Usa los mismos endpoints que ya consulta la app del
 * alumno, con la sesión del panel: no hay migración ni endpoint nuevo. El panel NO acepta ni modifica el Acuerdo
 * (eso sigue en la app; la guardia dentro del panel es F5b).
 *
 * Flujo: /auth/whoami → id de WODPLACE de quien está conectado → /platform-agreement?userId= (estado) →
 * /contracts/signed-url?slug=platform-agreement (enlace temporal para abrir el documento). El servidor verifica en
 * cada paso que la cuenta sea la del llamador (assertOwnsAccount).
 */

export type PlatformAgreementInfo = {
  /** true si ya lo aceptó, o si a esta cuenta no le corresponde aceptarlo (super admin). */
  accepted: boolean;
  /** null cuando "aceptado" es porque no aplica (super admin) o porque nunca aceptó. */
  acceptedAt: string | null;
  /** Hay un documento publicado para abrir. */
  hasDocument: boolean;
  documentTitle: string | null;
  /** Cuenta exenta (super admin): no aplica aceptar. */
  notApplicable: boolean;
  userId: string;
};

type Whoami = { wodplaceUser: { id: string } | null };
type Status = {
  roles: string[];
  accepted: boolean;
  acceptedAt: string | null;
  document: { title: string } | null;
};

export async function fetchPlatformAgreement(): Promise<PlatformAgreementInfo> {
  const me = await apiFetch<Whoami>("/auth/whoami");
  const userId = me.wodplaceUser?.id;
  if (!userId) throw new Error("No encontramos tu ficha de WODPLACE");
  const s = await apiFetch<Status>(`/platform-agreement?userId=${encodeURIComponent(userId)}`);
  return {
    accepted: s.accepted,
    acceptedAt: s.acceptedAt,
    hasDocument: !!s.document,
    documentTitle: s.document?.title ?? null,
    notApplicable: s.accepted && !s.acceptedAt,
    userId,
  };
}

export async function fetchPlatformAgreementUrl(userId: string): Promise<string> {
  const r = await apiFetch<{ url: string }>(
    `/contracts/signed-url?userId=${encodeURIComponent(userId)}&slug=platform-agreement`,
  );
  return r.url;
}
