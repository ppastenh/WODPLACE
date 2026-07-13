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
 * Makes sure a row exists for each default contract document so the app has
 * something to list/read even before an admin has uploaded a PDF for it.
 */
export async function ensureDefaultDocuments(): Promise<void> {
  await db
    .insert(contractDocumentsTable)
    .values(DEFAULT_CONTRACT_DOCUMENTS.map((doc) => ({ ...doc })))
    .onConflictDoNothing({ target: contractDocumentsTable.slug });
}
