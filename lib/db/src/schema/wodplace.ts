import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
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
  // Uploaded from the mobile profile screen; null until the athlete picks a
  // photo. Canonical avatar for the whole app — box-admin's member views
  // read this too instead of keeping a separate copy.
  avatarUrl: text("avatar_url"),
  // Self-expression fields shown on the public member profile — a fun
  // level tag and a short self-written bio line. Neither is validated
  // against a fixed enum server-side, same as box_members.status.
  rank: text("rank"),
  phrase: text("phrase"),
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
  // The Supabase project is multi-box: contract_documents (and the
  // contract_acceptances / contract_read_progress rows) are all scoped to a
  // box. `slug` stays the primary key for now because WODPLACE runs a single
  // box; a real multi-box rollout would move that to (box_id, slug).
  boxId: text("box_id").notNull(),
  title: text("title").notNull(),
  objectPath: text("object_path"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Who this document is for — 'athlete' (the member-facing contracts shown
  // in Contratos Activos) or 'platform' (the box-admin/super-admin platform
  // agreement, gating the "Administrador" nav item instead). CHECK
  // constraint enforces the two values at the DB level; see
  // lib/contractDocuments.ts for the seeded rows of each audience.
  audience: text("audience").notNull().default("athlete"),
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
    // NOT NULL in the real Supabase table (see contract_documents.boxId
    // above for why) — resolved server-side via resolveBoxId(), never
    // supplied by the client.
    boxId: text("box_id").notNull(),
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
  // Set only when the member accepted while under 18: an explicit, separate
  // consent to process the minor's personal data for this app, distinct
  // from accepting the box's contract. Its own timestamp on purpose.
  minorDataConsentAt: timestamp("minor_data_consent_at", { withTimezone: true }),
  // NOT NULL in the real Supabase table (see contract_documents.boxId
  // above for why) — resolved server-side via resolveBoxId(), never
  // supplied by the client.
  boxId: text("box_id").notNull(),
});

export type ContractAcceptanceRow = typeof contractAcceptancesTable.$inferSelect;

// Acceptance of the platform agreement (box-admin/super-admin <-> WODPLACE
// itself, about using the software) — separate from contract_acceptances
// (box <-> athlete, about training there). One row per admin; no per-slug
// read-progress like athlete docs, since it's a single one-page agreement.
// super_admin accounts are exempt entirely (see resolveAdminRoleForEmail)
// and never get a row here.
export const platformAgreementAcceptancesTable = pgTable(
  "platform_agreement_acceptances",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    boxId: text("box_id").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull(),
  },
);

export type PlatformAgreementAcceptanceRow =
  typeof platformAgreementAcceptancesTable.$inferSelect;

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
  // NOT NULL in the real Supabase table (same schema-drift pattern as
  // contract_documents.boxId) — resolved server-side via resolveBoxId(),
  // never supplied by the client.
  boxId: text("box_id").notNull(),
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
  boxId: text("box_id").notNull(),
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
    boxId: text("box_id").notNull(),
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
  boxId: text("box_id").notNull(),
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

// Per-account PIN for the hidden admin panel, replacing the single shared
// ADMIN_ACCESS_CODE. Written only by the api-server (privileged connection);
// the raw PIN is never stored, only its scrypt hash. `failedAttempts` resets
// on a successful verify/setup; `lockedUntil` is set to now()+15min once it
// hits 5. The real table already exists in Supabase (applied by hand, see
// lib/db/migrations/0001_admin_pins.sql — kept only as a historical record).
export const adminPinsTable = pgTable("admin_pins", {
  userId: text("user_id")
    .primaryKey()
    .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
  pinHash: text("pin_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type AdminPinRow = typeof adminPinsTable.$inferSelect;

// One-time email code for wodplace account recovery — the local user id is
// lost on a new device, so verifying a code emailed to the address on file
// returns the existing wodplace_users.id to re-adopt. Code stored hashed
// (scrypt, lib/pinHash), one active row per user, short expiry, locked
// after repeated failures.
export const accountRecoveryCodesTable = pgTable("account_recovery_codes", {
  userId: text("user_id")
    .primaryKey()
    .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type AccountRecoveryCodeRow = typeof accountRecoveryCodesTable.$inferSelect;

// ── RM / 1RM module ─────────────────────────────────────────────────────────

// Movement catalog. Seeded rows have `createdBy = null` + `isDefault = true`;
// a user's custom movements carry their id. Visible to a user when
// `createdBy IS NULL OR createdBy = :userId`.
export const movementsTable = pgTable(
  "movements",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category"), // 'squat_dl' | 'press' | 'olympic' | null
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: text("created_by").references(() => wodplaceUsersTable.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("movements_scope_name_idx").on(
      sql`coalesce(${table.createdBy}, '')`,
      sql`lower(${table.name})`,
    ),
  ],
);
export type MovementRow = typeof movementsTable.$inferSelect;

// One personal record entry. `weight`/`unit` are the source of truth as
// entered; `weightKg` is a stored generated column used for every comparison,
// chart and percentage. `liftName` is a stable label snapshot so history keeps
// its label even if the movement is renamed. `movementId` is RESTRICT — a
// custom movement with records can't be deleted until its records are.
export const prsTable = pgTable(
  "prs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    movementId: text("movement_id")
      .notNull()
      .references(() => movementsTable.id, { onDelete: "restrict" }),
    liftName: text("lift_name").notNull(),
    weight: numeric("weight").notNull(),
    unit: text("unit").notNull(), // 'kg' | 'lb'
    weightKg: numeric("weight_kg").generatedAlwaysAs(
      sql`round((case when unit = 'lb' then weight * 0.45359237 else weight end)::numeric, 3)`,
    ),
    // Self-reported % of true 1RM the lift was performed at (30–110, step 5).
    // `weight` above already stores the projected 100% value; this keeps the
    // real effort as context. Null for records created before the field.
    percentage: numeric("percentage"),
    achievedAt: date("achieved_at").notNull().default(sql`current_date`),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("prs_user_movement_date_idx").on(
      table.userId,
      table.movementId,
      table.achievedAt.desc(),
    ),
  ],
);
export type PrRow = typeof prsTable.$inferSelect;

// One active goal per (user, movement). `achievedAt` is set the day the best
// record reaches the target.
export const prGoalsTable = pgTable(
  "pr_goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    movementId: text("movement_id")
      .notNull()
      .references(() => movementsTable.id, { onDelete: "cascade" }),
    targetWeight: numeric("target_weight").notNull(),
    targetUnit: text("target_unit").notNull(), // 'kg' | 'lb'
    targetWeightKg: numeric("target_weight_kg").generatedAlwaysAs(
      sql`round((case when target_unit = 'lb' then target_weight * 0.45359237 else target_weight end)::numeric, 3)`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    achievedAt: date("achieved_at"),
  },
  (table) => [
    uniqueIndex("pr_goals_user_movement_idx").on(
      table.userId,
      table.movementId,
    ),
  ],
);
export type PrGoalRow = typeof prGoalsTable.$inferSelect;

export type PlateSpec = { unit: "kg" | "lb"; weight: number; pairs: number };

// Per-user training settings: the bar-loader config plus the module-wide
// preferred unit. `plates` is the configurable disc inventory.
export const trainingSettingsTable = pgTable("training_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
  preferredUnit: text("preferred_unit").notNull().default("kg"), // 'kg' | 'lb'
  sex: text("sex"), // 'f' | 'm' | 'x' | null
  barWeight: numeric("bar_weight").notNull().default("20"),
  barUnit: text("bar_unit").notNull().default("kg"), // 'kg' | 'lb'
  plates: jsonb("plates")
    .$type<PlateSpec[]>()
    .notNull()
    .default(
      sql`'[
        {"unit":"kg","weight":25,"pairs":4},
        {"unit":"kg","weight":20,"pairs":4},
        {"unit":"kg","weight":15,"pairs":2},
        {"unit":"kg","weight":10,"pairs":2},
        {"unit":"kg","weight":5,"pairs":2},
        {"unit":"kg","weight":2.5,"pairs":2},
        {"unit":"kg","weight":1.25,"pairs":2},
        {"unit":"kg","weight":0.5,"pairs":2}
      ]'::jsonb`,
    ),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type TrainingSettingsRow = typeof trainingSettingsTable.$inferSelect;
