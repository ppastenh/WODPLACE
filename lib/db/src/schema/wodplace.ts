import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

export type InsertWodplaceUser = Omit<typeof wodplaceUsersTable.$inferInsert, 'createdAt'>;
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

export type InsertContractDocument = typeof contractDocumentsTable.$inferInsert;
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
  // Populated only when the member was under 18 at acceptance time — the
  // guardian stands in for the minor's own signature/acceptance. Null for
  // adult members.
  guardianName: text("guardian_name"),
  guardianRelationship: text("guardian_relationship"),
  // Null until the box owner views this acceptance in the admin panel.
  // Re-set to null whenever a member (re-)accepts, so the owner is notified
  // again — this is the whole notification mechanism, no push/email infra.
  seenByOwnerAt: timestamp("seen_by_owner_at", { withTimezone: true }),
});

export type ContractAcceptanceRow = typeof contractAcceptancesTable.$inferSelect;

// Server-side class booking state. The mobile app still generates the
// deterministic sessionId from the class date/time, while these rows make
// bookings and waitlist order visible to every device.
export const classBookingsTable = pgTable(
  "class_bookings",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // "confirmed" | "waiting"
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("class_bookings_session_user_idx").on(
      table.sessionId,
      table.userId,
    ),
  ],
);

export type ClassBookingRow = typeof classBookingsTable.$inferSelect;

export const wodplaceNotificationsTable = pgTable(
  "wodplace_notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("wodplace_notifications_user_created_idx").on(
      table.userId,
      table.createdAt,
      table.id,
    ),
  ],
);

export type WodplaceNotificationRow =
  typeof wodplaceNotificationsTable.$inferSelect;

// Admin-configurable key/value settings (e.g. box display name).
export const boxSettingsTable = pgTable("box_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type BoxSettingRow = typeof boxSettingsTable.$inferSelect;

// Social feed posts. imageUris is a JSON-serialised string[].
export const socialPostsTable = pgTable("social_posts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => wodplaceUsersTable.id, {
    onDelete: "set null",
  }),
  authorName: text("author_name").notNull(),
  body: text("body").notNull().default(""),
  imageUris: text("image_uris"), // JSON: string[]
  type: text("type").notNull().default("post"), // "post" | "announcement"
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type SocialPostRow = typeof socialPostsTable.$inferSelect;

// Comments on social posts.
export const socialCommentsTable = pgTable("social_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .references(() => socialPostsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => wodplaceUsersTable.id, {
    onDelete: "set null",
  }),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type SocialCommentRow = typeof socialCommentsTable.$inferSelect;

// One emoji reaction per user per post (upsert to change emoji).
export const socialReactionsTable = pgTable(
  "social_reactions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => socialPostsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("social_reactions_post_user_idx").on(
      table.postId,
      table.userId,
    ),
  ],
);
export type SocialReactionRow = typeof socialReactionsTable.$inferSelect;

// Moderation reports from users.
export const socialReportsTable = pgTable("social_reports", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .references(() => socialPostsTable.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id").references(() => wodplaceUsersTable.id, {
    onDelete: "set null",
  }),
  reporterName: text("reporter_name").notNull(),
  reason: text("reason").notNull(), // "spam" | "inappropriate" | "other"
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
export type SocialReportRow = typeof socialReportsTable.$inferSelect;

// Users blocked by admin — their posts are hidden from the community feed.
export const blockedUsersTable = pgTable("blocked_users", {
  userId: text("user_id")
    .primaryKey()
    .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
  blockedAt: timestamp("blocked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type BlockedUserRow = typeof blockedUsersTable.$inferSelect;
