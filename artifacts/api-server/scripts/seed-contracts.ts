/**
 * One-off seed script: uploads the initial contract PDFs to object storage
 * and attaches them to their contract_documents rows. Run with:
 *   pnpm --filter @workspace/api-server run seed:contracts
 */
import { readFile } from "fs/promises";
import path from "path";
import { contractDocumentsTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";

import { ObjectStorageService } from "../src/lib/objectStorage";
import { DEFAULT_CONTRACT_DOCUMENTS } from "../src/lib/contractDocuments";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");

const SEED_FILES: Record<string, string> = {
  membership: "attached_assets/0_Contrato_de_Membresia_WODPLACE_1783899581742.pdf",
  health: "attached_assets/0_Responsabilidad_y_Salud_WODPLACE_1783899627571.pdf",
  rules: "attached_assets/0_Reglamento_del_Box_WODPLACE_1783899674260.pdf",
};

async function main() {
  const objectStorageService = new ObjectStorageService();

  for (const doc of DEFAULT_CONTRACT_DOCUMENTS) {
    const relativePath = SEED_FILES[doc.slug];
    if (!relativePath) continue;

    const filePath = path.join(repoRoot, relativePath);
    const bytes = await readFile(filePath);

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    const putResponse = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: bytes,
    });
    if (!putResponse.ok) {
      throw new Error(
        `Failed to upload ${doc.slug}: ${putResponse.status} ${putResponse.statusText}`,
      );
    }

    await db
      .insert(contractDocumentsTable)
      .values({ slug: doc.slug, title: doc.title, objectPath, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: contractDocumentsTable.slug,
        set: { objectPath, updatedAt: new Date() },
      });

    console.log(`Seeded ${doc.slug} -> ${objectPath}`);
  }

  const rows = await db.select().from(contractDocumentsTable);
  console.log(rows);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
