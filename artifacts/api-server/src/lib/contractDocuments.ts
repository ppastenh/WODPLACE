import { contractDocumentsTable, db } from "@workspace/db";

/**
 * The three contracts every member must read and accept. Slugs are stable
 * identifiers used across the read-progress and acceptance tables; titles
 * are the human-readable labels shown in the app.
 */
export const DEFAULT_CONTRACT_DOCUMENTS = [
  { slug: "membership", title: "Contrato de Membresía" },
  { slug: "health", title: "Responsabilidad y Salud" },
  { slug: "rules", title: "Reglamento del Box" },
] as const;

export type ContractSlug = (typeof DEFAULT_CONTRACT_DOCUMENTS)[number]["slug"];

/**
 * The platform agreement — between WODPLACE (the super_admin) and each box's
 * box_admin, about using the software to run their box. Separate from the
 * athlete contracts above: it's audience='platform', never shown in
 * Contratos Activos, and gates the "Administrador" nav item instead (see
 * routes/platformAgreement.ts). super_admin accounts are exempt entirely.
 */
export const PLATFORM_AGREEMENT_DOCUMENT = {
  slug: "platform-agreement",
  title: "Acuerdo de Plataforma",
} as const;

/**
 * Makes sure a row exists for each default athlete contract document
 * (scoped to `boxId`) so the app has something to list/read even before an
 * admin has uploaded a PDF for it. `boxId` comes from `resolveBoxId()` —
 * `box_id` is a NOT NULL FK to `boxes` in the real schema.
 */
export async function ensureDefaultDocuments(boxId: string): Promise<void> {
  await db
    .insert(contractDocumentsTable)
    .values(DEFAULT_CONTRACT_DOCUMENTS.map((doc) => ({ ...doc, boxId, audience: "athlete" as const })))
    .onConflictDoNothing({ target: contractDocumentsTable.slug });
}

/** Same idea as ensureDefaultDocuments, for the single platform-agreement row. */
export async function ensureDefaultPlatformDocument(boxId: string): Promise<void> {
  await db
    .insert(contractDocumentsTable)
    .values({ ...PLATFORM_AGREEMENT_DOCUMENT, boxId, audience: "platform" as const })
    .onConflictDoNothing({ target: contractDocumentsTable.slug });
}
