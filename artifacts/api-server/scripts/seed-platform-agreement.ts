/**
 * One-off seed script: uploads the platform agreement PDF to object storage
 * and attaches it to the "platform-agreement" contract_documents row. Same
 * mechanism as seed-contracts.ts, for the single doc between WODPLACE
 * (super_admin) and each box's box_admin. Run with:
 *   npx tsx --env-file=.env scripts/seed-platform-agreement.ts
 */
import { readFile } from "fs/promises";
import path from "path";
import { contractDocumentsTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";

import { createUploadUrl, getPublicUrl } from "../src/lib/objectStorage";
import { resolveBoxId } from "../src/lib/boxContext";
import { PLATFORM_AGREEMENT_DOCUMENT } from "../src/lib/contractDocuments";

const FILE_PATH = path.join(import.meta.dirname, "acuerdo-plataforma-wodplace.pdf");

async function main() {
  const boxId = await resolveBoxId();
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

  await db
    .insert(contractDocumentsTable)
    .values({ ...PLATFORM_AGREEMENT_DOCUMENT, boxId, audience: "platform", objectPath, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: contractDocumentsTable.slug,
      set: { objectPath, updatedAt: new Date() },
    });

  console.log(`Seeded platform-agreement -> ${objectPath}`);

  const [row] = await db
    .select()
    .from(contractDocumentsTable)
    .where(eq(contractDocumentsTable.slug, PLATFORM_AGREEMENT_DOCUMENT.slug));
  console.log(row);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
