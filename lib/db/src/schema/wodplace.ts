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
  uuid,
} from "drizzle-orm/pg-core";

// Mirrors the WodplaceUser id created client-side in AsyncStorage. There is
// no real auth system yet — this table exists so contract state can be tied
// to a stable user id across app reinstalls/devices via a lightweight sync.
export const wodplaceUsersTable = pgTable("wodplace_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Unique as of the Fase 2 auth migration (see supabase/migrations/
  // ..._wodplace_users_email_unique_and_phone.sql) — a handful of dupes
  // from the mock era were cleaned up first. Real registration
  // (POST /auth/register) checks this proactively for a friendly error
  // instead of surfacing the raw constraint violation.
  email: text("email").notNull(),
  // Real accounts persist this for real (POST /auth/register); mock
  // accounts never synced it (client-only, lost on reinstall) — added in
  // the same migration as the column above, while already touching this
  // exact area for the auth migration.
  phone: text("phone"),
  // Uploaded from the mobile profile screen; null until the athlete picks a
  // photo. Canonical avatar for the whole app — box-admin's member views
  // read this too instead of keeping a separate copy.
  avatarUrl: text("avatar_url"),
  // Self-expression fields shown on the public member profile — a fun
  // level tag and a short self-written bio line. Neither is validated
  // against a fixed enum server-side, same as box_members.status.
  rank: text("rank"),
  phrase: text("phrase"),
  // Synced from the mobile profile (previously AsyncStorage-only) so
  // per-box "upcoming birthdays" (see routes/boxes.ts) can be real instead
  // of a hardcoded mock list. Only ever read back as month/day — never the
  // full date/year — when showing another member's birthday.
  birthdate: date("birthdate"),
  // Bridge to the real Supabase Auth account, once this athlete has one —
  // null for every mock/local-only account today. Same pattern as the
  // admin side's profiles/user_roles-by-email bridge (see lib/adminRole.ts):
  // `id` (and every FK pointing at it — RM, wod_results, user_achievements,
  // box_members, etc.) never changes, so migrating to real auth never
  // touches existing data. See supabase/migrations/
  // ..._wodplace_users_auth_bridge.sql for the full rationale.
  authUserId: uuid("auth_user_id"),
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

// Whether a MINOR's first name + birthday (month/day only, never year or
// age) may be shown to the rest of the box in "Próximos cumpleaños". A
// deliberately separate table from contract_acceptances rather than a
// column there: contract_acceptances already has a broader box-staff
// (admin + coach) RLS update policy for "mark seen", and RLS can't
// restrict individual columns within a row — a dedicated table lets this
// specific grant get its own admin-only (never coach) RLS policy instead
// of fighting the existing one. Adults never get a row here at all; the
// birthdays query treats "minor with no row" the same as "not authorized".
export const birthdayVisibilityConsentsTable = pgTable("birthday_visibility_consents", {
  userId: text("user_id")
    .primaryKey()
    .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
  boxId: text("box_id").notNull(),
  // Current effective state — what GET /box-memberships/upcoming-birthdays
  // actually checks. false is the only value the athlete's own self-service
  // endpoint may ever write (see routes/contracts.ts); true can only be set
  // via the guardian's checkbox at initial contract acceptance, or by a
  // box_admin (never a coach — enforced by this table's RLS policy) acting
  // on the guardian's in-person authorization.
  consent: boolean("consent").notNull().default(false),
  // Below: history of the most recent grant — preserved across a later
  // withdrawal so it's still answerable "who granted this, and when" even
  // after the athlete (or an admin) turns it back off.
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  // 'contrato' (the guardian's checkbox at acceptance time) or 'admin'.
  source: text("source"),
  // The admin's email, captured only when source = 'admin'. Null for
  // 'contrato' — that path has no separate guardian login/identity to
  // record (same trust-model limit as the rest of the minor contract flow).
  grantedByEmail: text("granted_by_email"),
  // Which revision of the informational/consent copy was shown when this
  // was granted (e.g. "v1") — so a later copy change doesn't retroactively
  // blur what a given guardian actually agreed to.
  textVersion: text("text_version"),
  // Set on withdrawal (self-service or admin), cleared on the next grant.
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export type BirthdayVisibilityConsentRow =
  typeof birthdayVisibilityConsentsTable.$inferSelect;

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

// Append-only trail of sensitive actions taken from the super-admin panel
// (approve/reject a box, grant/revoke a role, resolve a report, ...).
// Written directly by the super-admin web app via the Supabase client (same
// style as the rest of that app) — `actorEmail` rather than a user id
// because the actor is a Supabase Auth account, a different identity space
// than wodplace_users. RLS (see supabase/migrations) only grants INSERT, no
// UPDATE/DELETE — not even a super_admin can rewrite history through
// PostgREST, though this is still a client-attested log, not
// server-enforced: someone with a super_admin session could still bypass
// the app and skip logging an action outright.
export const superAdminAuditLogTable = pgTable("super_admin_audit_log", {
  id: text("id").primaryKey(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(), // e.g. "box.approve", "role.grant_super_admin"
  targetType: text("target_type").notNull(), // "box" | "user_role" | "report"
  targetId: text("target_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type SuperAdminAuditLogRow = typeof superAdminAuditLogTable.$inferSelect;

// Bug/problem reports a box_admin files for the platform owner (super_admin)
// to follow up on — NOT athlete-facing Comunidad moderation (that stays
// entirely inside box-admin, see social_reports above). Written and read
// directly via the Supabase client from both box-admin (insert own + read
// own) and super-admin (read/resolve all) — same style as
// super_admin_audit_log, RLS in supabase/migrations.
export const supportReportsTable = pgTable("support_reports", {
  id: text("id").primaryKey(),
  reporterUserId: text("reporter_user_id").notNull(), // auth.users id (box_admin)
  reporterEmail: text("reporter_email").notNull(),
  boxId: text("box_id").notNull(),
  description: text("description").notNull(),
  // Optional screenshot — same public "wodplace-uploads" Storage bucket as
  // everything else (lib/objectStorage.ts), new "support/" prefix, uploaded
  // directly from box-admin's own authenticated Supabase client (unlike
  // wodplace's report screenshots, box-admin has real auth already so it
  // doesn't need api-server to mint a presigned URL).
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"), // super_admin's email
});
export type SupportReportRow = typeof supportReportsTable.$inferSelect;

// Pre-authorization gate for "Crear mi Box" (see routes/platformAgreement.ts's
// /create-box) — a super_admin adds an email here BEFORE that person can use
// the self-service box-creation flow at all; api-server checks this table on
// every /create-box call. Written/read directly via the Supabase client from
// super-admin's own panel (RLS in supabase/migrations restricts it to
// is_super_admin()). `email` is the PK and is always stored lowercased —
// every lookup still wraps both sides in lower() defensively (see
// resolveAdminRoles-style email bridges elsewhere in this codebase).
export const boxCreationAuthorizationsTable = pgTable("box_creation_authorizations", {
  email: text("email").primaryKey(),
  authorizedBy: text("authorized_by").notNull(), // super_admin's email
  authorizedAt: timestamp("authorized_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Set once by api-server when this email successfully creates its box —
  // blocks reuse. Independent of revokedAt: a super_admin can revoke access
  // that was never used, or leave a used one as historical record.
  usedAt: timestamp("used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
export type BoxCreationAuthorizationRow =
  typeof boxCreationAuthorizationsTable.$inferSelect;

// Server-side class booking state, against REAL class_sessions rows (the
// same table box-admin's own class-scheduling UI reads/writes directly via
// Supabase — see supabase/migrations/20260830190000_wodplace_admin_panel_port.sql).
// `sessionId` is a real class_sessions.id (a uuid string), not a
// client-fabricated "date_time" string like it used to be before Agendar
// was wired to real per-box schedules. `boxId` is required by the live
// table (NOT NULL, no default) — resolved server-side via
// resolveBoxIdForAthlete, never trusted from the client. `status` uses the
// SAME vocabulary box-admin already writes ("inscrito" / "lista_espera"),
// not this table's old wodplace-only "confirmed"/"waiting" strings, so both
// apps interpret the same rows consistently — the wire contract the mobile
// app itself sees (BookingRecord.status) still says "confirmed"/"waiting";
// the translation happens only in api-server's routes/bookings.ts.
export const classBookingsTable = pgTable(
  "class_bookings",
  {
    id: text("id").primaryKey(),
    boxId: text("box_id").notNull(),
    sessionId: text("session_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // "inscrito" | "lista_espera"
    // Whether the athlete actually showed up -- orthogonal to `status` on
    // purpose (see 20261001170000_class_bookings_attendance.sql). null =
    // not marked yet, true = asistio, false = no-show.
    attended: boolean("attended"),
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

// Comments on box-admin "Avisos" (the `announcements` table — Supabase-
// managed, not modeled here). Deliberately a SEPARATE table from
// social_comments rather than reusing it: announcements and social_posts are
// different models (one admin-authored with no reactions/comments of its
// own until now, one athlete-authored), and blending them under one table
// was already rejected once for social_posts.type — same reasoning applies
// here. `announcementId` has no `.references()` (announcements isn't a
// Drizzle-owned table, same as `boxId` below), but a real FK constraint to
// public.announcements(id) was added directly in Postgres, cascade-deleting
// with the aviso.
export const announcementCommentsTable = pgTable("announcement_comments", {
  id: text("id").primaryKey(),
  announcementId: text("announcement_id").notNull(),
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
export type AnnouncementCommentRow = typeof announcementCommentsTable.$inferSelect;

// One emoji reaction per user per aviso — see announcementCommentsTable's
// comment for why this is a separate table from social_reactions.
export const announcementReactionsTable = pgTable(
  "announcement_reactions",
  {
    id: text("id").primaryKey(),
    announcementId: text("announcement_id").notNull(),
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
    uniqueIndex("announcement_reactions_announcement_user_idx").on(
      table.announcementId,
      table.userId,
    ),
  ],
);
export type AnnouncementReactionRow = typeof announcementReactionsTable.$inferSelect;

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
  // Optional screenshot/evidence the reporter attaches — same Supabase
  // Storage bucket as everything else (see lib/objectStorage.ts), prefix
  // "reports". Shown both in box-level moderation (wodplace's "Más" screen)
  // and in super-admin's Moderación Global, since both read this same row.
  imageUrl: text("image_url"),
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
  preferredUnit: text("preferred_unit").notNull().default("lb"), // 'kg' | 'lb'
  sex: text("sex"), // 'f' | 'm' | 'x' | null
  barWeight: numeric("bar_weight").notNull().default("20"),
  barUnit: text("bar_unit").notNull().default("kg"), // 'kg' | 'lb'
  // Self-reported, always in kg regardless of preferredUnit — used only to
  // compute the bodyweight-relative achievements (back/front squat, deadlift
  // × 1x/1.5x/2x BW). Null until the athlete sets it; those 9 achievements
  // just stay locked until then (see achievements/evaluate.ts).
  bodyweightKg: numeric("bodyweight_kg"),
  // Mixed lb/kg set (lb for the main plates, kg fractionals for fine
  // adjustment) — matches preferredUnit's own "lb" default.
  plates: jsonb("plates")
    .$type<PlateSpec[]>()
    .notNull()
    .default(
      sql`'[
        {"unit":"lb","weight":55,"pairs":2},
        {"unit":"lb","weight":45,"pairs":2},
        {"unit":"lb","weight":35,"pairs":2},
        {"unit":"lb","weight":25,"pairs":4},
        {"unit":"lb","weight":15,"pairs":4},
        {"unit":"lb","weight":10,"pairs":2},
        {"unit":"kg","weight":2,"pairs":2},
        {"unit":"kg","weight":1.5,"pairs":2},
        {"unit":"kg","weight":1,"pairs":2}
      ]'::jsonb`,
    ),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type TrainingSettingsRow = typeof trainingSettingsTable.$inferSelect;

// ── Achievements (medallas) ──────────────────────────────────────────────────

// One row per unlocked achievement. The catalog of definitions (names,
// descriptions, thresholds) lives in code (api-server's
// lib/achievements/catalog.ts), not here — this table only records who
// unlocked what and when. Permanent once written: re-evaluating never
// deletes a row, even if the data that triggered it (a PR, a booking) is
// later removed. `awardedBy`/`boxId` are only ever set for MOVIMIENTO/
// COMPETENCIA achievements (coach-granted) — null for every automatic one.
//
// `sourceWodResultId` is the one targeted exception to "permanent": it's set
// only by evaluate.ts's WOD category (wod_count_*/wod_level_*/wod_hero_*/
// wod_improve — never wod_beast_mode, which comes from 5 results together,
// not one) so box-admin's WOD results view can delete exactly the medals a
// specific bad result caused when the admin deletes that result. `on delete
// set null` on the FK: if the result is gone for some other reason, the
// medal row still isn't silently deleted — only the explicit "delete this
// result" action in box-admin does both together.
export const userAchievementsTable = pgTable(
  "user_achievements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    awardedBy: text("awarded_by"),
    boxId: text("box_id"),
    // Real FK to the granting coach, added alongside the coach activity
    // summary feature -- awardedBy (an email string) stays as the historical
    // audit trail, but this is what "medals I've granted" queries join on.
    // Null for every automatic achievement (never coach-granted) and for
    // admin-granted ones (admins have no coaches row).
    coachId: text("coach_id"),
    sourceWodResultId: text("source_wod_result_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_achievements_user_achievement_idx").on(
      table.userId,
      table.achievementId,
    ),
  ],
);
export type UserAchievementRow = typeof userAchievementsTable.$inferSelect;

// ── WOD del día ───────────────────────────────────────────────────────────

// Catalog: seeded hero/benchmark WODs (boxId null) + a box's own custom ones
// (boxId set) — same createdBy-scoping shape as the RM module's `movements`
// table. `description` is free text (the movements/reps breakdown, e.g.
// "21-15-9 Thrusters (95/65), Pull-ups") rather than a structured
// movement-by-movement model — matches how boxes actually write these up.
// `format` drives which result fields wod_results expects: 'for_time' ->
// timeSeconds, 'amrap' -> rounds (+ optional reps for a partial round;
// EMOM-style WODs like Chelsea log rounds only, no partial reps), 'max_reps'
// -> reps only (e.g. Fight Gone Bad).
export const wodsTable = pgTable("wods", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  format: text("format").notNull(), // 'for_time' | 'amrap' | 'max_reps'
  timeCapMinutes: integer("time_cap_minutes"),
  description: text("description").notNull(),
  boxId: text("box_id"), // null = global hero WOD, set = one box's custom WOD
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type WodRow = typeof wodsTable.$inferSelect;

// One published WOD per box per day — box-admin writes this directly via
// Supabase (RLS), same pattern as announcements/class_sessions; api-server
// only reads it (GET /wod/today) for the athlete-facing side.
export const wodOfDayTable = pgTable(
  "wod_of_day",
  {
    id: text("id").primaryKey(),
    boxId: text("box_id").notNull(),
    wodId: text("wod_id")
      .notNull()
      .references(() => wodsTable.id, { onDelete: "restrict" }),
    sessionDate: date("session_date").notNull(),
    // Day-specific adjustments a coach might add (scaling notes, etc.) —
    // shown alongside the catalog wod's own description, doesn't replace it.
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("wod_of_day_box_date_idx").on(table.boxId, table.sessionDate),
  ],
);
export type WodOfDayRow = typeof wodOfDayTable.$inferSelect;

// An athlete's logged result for a specific day's published WOD. Tied to
// wodOfDayId (not directly to wodId) so "how did I do on the exact WOD
// published that day" is unambiguous; querying wod_results -> wod_of_day ->
// wods by wods.id gives the full history for a repeating hero WOD (e.g. every
// time this box has ever run Grace), same join shape as prs -> movements.
export const wodResultsTable = pgTable(
  "wod_results",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => wodplaceUsersTable.id, { onDelete: "cascade" }),
    wodOfDayId: text("wod_of_day_id")
      .notNull()
      .references(() => wodOfDayTable.id, { onDelete: "cascade" }),
    timeSeconds: integer("time_seconds"),
    rounds: integer("rounds"),
    reps: integer("reps"),
    // 6-level scale, low to high: 'beginner' | 'rookie' | 'scaled' | 'master'
    // | 'rx' | 'elite'. Replaced a plain Rx/Scaled boolean (see
    // supabase/migrations/..._wod_results_level_scale.sql) — old rows
    // migrated losslessly (true -> 'scaled', false -> 'rx').
    level: text("level").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One result per athlete per published WOD — POST /wod-results upserts
    // on this so re-logging edits instead of duplicating.
    uniqueIndex("wod_results_user_wod_of_day_idx").on(table.userId, table.wodOfDayId),
  ],
);
export type WodResultRow = typeof wodResultsTable.$inferSelect;
