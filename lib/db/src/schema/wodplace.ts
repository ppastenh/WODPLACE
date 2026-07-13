import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Mirrors the WodplaceUser id created client-side in AsyncStorage. There is
// no real auth system yet — this table exists so contract state can be tied
// to a stable user id across app reinstalls/devices via a lightweight sync.
export const wodplaceUsersTable = pgTable("wodplace_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertWodplaceUserSchema = createInsertSchema(
  wodplaceUsersTable,
).omit({ createdAt: true });
export type InsertWodplaceUser = z.infer<typeof insertWodplaceUserSchema>;
export type WodplaceUserRow = typeof wodplaceUsersTable.$inferSelect;

// One row per contract document (membership, health/responsibility, box
// rules). `objectPath` points at the uploaded PDF in object storage; it is
// null until an admin uploads a file for that slug.
export const contractDocumentsTable = pgTable("contract_documents", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  objectPath: text("object_path"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertContractDocumentSchema = createInsertSchema(
  contractDocumentsTable,
);
export type InsertContractDocument = z.infer<
  typeof insertContractDocumentSchema
>;
export type ContractDocumentRow = typeof contractDocumentsTable.$inferSelect;

// Per-user read progress for each contract document.
export const contractReadProgressTable = pgTable(
  "contract_read_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    documentSlug: text("document_slug")
      .notNull()
      .references(() => contractDocumentsTable.slug, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("contract_read_progress_user_doc_idx").on(
      table.userId,
      table.documentSlug,
    ),
  ],
);

export type ContractReadProgressRow =
  typeof contractReadProgressTable.$inferSelect;

// Final acceptance record per user — the legal record with a full timestamp
// plus the emergency contact captured at acceptance time.
export const contractAcceptancesTable = pgTable("contract_acceptances", {
  userId: text("user_id")
    .primaryKey()
    .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
  emergencyContactName: text("emergency_contact_name").notNull(),
  emergencyContactPhone: text("emergency_contact_phone").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull(),
});

export type ContractAcceptanceRow = typeof contractAcceptancesTable.$inferSelect;
