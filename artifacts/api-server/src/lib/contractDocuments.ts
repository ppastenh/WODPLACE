import { db, platformAgreementDocumentTable } from "@workspace/db";

/**
 * The three contracts every member must read and accept. Slugs are stable
 * identifiers used across the read-progress and acceptance tables; titles
 * are the human-readable labels shown in the app and in the box-admin
 * upload screen.
 *
 * As of Fase B/B1 (supabase/migrations/
 * 20261012130000_contracts_owner_only_versioned.sql) these are no longer
 * auto-seeded as empty placeholder rows for every box: a box's
 * contract_documents row for a slug only exists once its owner has
 * actually uploaded something via replace_contract_document(). A box with
 * none of the three uploaded has no contracts at all — it doesn't block
 * its athletes from anything.
 */
export const DEFAULT_CONTRACT_DOCUMENTS = [
  { slug: "membership", title: "Contrato de Membresía" },
  { slug: "health", title: "Responsabilidad y Salud" },
  { slug: "rules", title: "Reglamento del Box" },
] as const;

export type ContractSlug = (typeof DEFAULT_CONTRACT_DOCUMENTS)[number]["slug"];

/**
 * The platform agreement — between WODPLACE (the super_admin) and every
 * box's box_admin, about using the software to run their box. A single
 * global document now (platform_agreement_document, split out of
 * contract_documents in supabase/migrations/
 * 20261012120000_contract_documents_scope_by_box.sql — it was never
 * supposed to be per-box). Never shown in Contratos Activos; gates the
 * "Administrador" nav item instead (see routes/platformAgreement.ts).
 * super_admin accounts are exempt entirely.
 */
export const PLATFORM_AGREEMENT_TITLE = "Acuerdo de Plataforma";

/**
 * Makes sure the single platform_agreement_document row exists (with no
 * file attached yet, if this is the first time) so the admin panel always
 * has something to show/upload into — unlike the athlete contracts above,
 * this one really is a global singleton by design, so "ensure it exists"
 * is still correct here.
 */
export async function ensurePlatformAgreementDocument(): Promise<void> {
  const [existing] = await db.select().from(platformAgreementDocumentTable);
  if (existing) return;
  await db.insert(platformAgreementDocumentTable).values({
    id: crypto.randomUUID(),
    title: PLATFORM_AGREEMENT_TITLE,
    objectPath: null,
    fileName: null,
    mimeType: null,
  });
}
