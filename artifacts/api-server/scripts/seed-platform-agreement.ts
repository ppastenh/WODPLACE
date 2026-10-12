/**
 * One-off seed script: uploads the platform agreement PDF to object storage
 * and attaches it to the single platform_agreement_document row (global,
 * not per-box as of Fase B/B1a — see supabase/migrations/
 * 20261012120000_contract_documents_scope_by_box.sql). Run with:
 *   npx tsx --env-file=.env scripts/seed-platform-agreement.ts
 */
import { readFile } from "fs/promises";
import path from "path";
import { db, platformAgreementDocumentTable } from "@workspace/db";

import { createUploadUrl, getPublicUrl } from "../src/lib/objectStorage";
import { PLATFORM_AGREEMENT_TITLE } from "../src/lib/contractDocuments";

const FILE_PATH = path.join(import.meta.dirname, "acuerdo-plataforma-wodplace.pdf");

async function main() {
  const bytes = await readFile(FILE_PATH);

  const { uploadURL, key } = await createUploadUrl("contracts", "application/pdf");
  const putResponse = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: bytes,
  });
  if (!putResponse.ok) {
    throw new Error(`Failed to upload platform-agreement: ${putResponse.status} ${putResponse.statusText}`);
  }

  const objectPath = getPublicUrl(key);
  const fileName = path.basename(FILE_PATH);

  const [existing] = await db.select().from(platformAgreementDocumentTable);
  if (existing) {
    await db
      .update(platformAgreementDocumentTable)
      .set({ objectPath, fileName, mimeType: "application/pdf", updatedAt: new Date() });
  } else {
    await db.insert(platformAgreementDocumentTable).values({
      id: crypto.randomUUID(),
      title: PLATFORM_AGREEMENT_TITLE,
      objectPath,
      fileName,
      mimeType: "application/pdf",
    });
  }

  console.log(`Seeded platform-agreement -> ${objectPath}`);

  const [row] = await db.select().from(platformAgreementDocumentTable);
  console.log(row);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
