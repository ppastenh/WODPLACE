/**
 * Fase 3 of the mock-auth -> real Supabase Auth migration: gives every
 * existing mock wodplace_users row (auth_user_id is null) a real Supabase
 * Auth identity, WITHOUT ever changing wodplace_users.id — every FK table
 * (prs, wod_results, user_achievements, box_members, etc.) keeps working
 * untouched, since it never pointed at anything else.
 *
 * Two cases, discovered by a pre-flight check against auth.users:
 *   - BRIDGE ONLY: the email already has a real Supabase Auth account (some
 *     mock athletes are also box_admin/super_admin on box-admin, which has
 *     used real auth all along) — link auth_user_id to that EXISTING id,
 *     never touch its password.
 *   - CREATE: no existing auth account for that email — create one with a
 *     fixed QA password (these are disposable smoke-test accounts, nobody
 *     owns the inbox, no point generating a per-account password nobody
 *     will note down).
 *
 * Usage:
 *   node --env-file=.env --import tsx ./scripts/migrate-fase3-accounts.ts          (dry run)
 *   node --env-file=.env --import tsx ./scripts/migrate-fase3-accounts.ts --apply  (for real)
 *
 * Dry run does not touch the database or Supabase Auth at all — it only
 * prints the plan (which accounts, bridge vs. create, which password).
 */
import { db, wodplaceUsersTable } from "@workspace/db";
import { eq, isNull, sql } from "drizzle-orm";

import { getSupabaseAdmin } from "../src/lib/supabaseAdmin";

const APPLY = process.argv.includes("--apply");

const QA_PASSWORD = "WodplaceQA2026!";

// Row counts across every FK'd table, keyed by wodplace_users.id, taken
// before and after each migration as a sanity check — since the id itself
// never changes, these must be identical; a mismatch means the script did
// something wrong, not that data was actually at risk.
async function snapshot(userId: string) {
  const [prs, wodResults, achievements, boxMembers, trainingSettings, socialPosts, socialComments, socialReactions, contractAcceptances] =
    await Promise.all([
      db.execute(sql`select count(*)::int as n from prs where user_id = ${userId}`),
      db.execute(sql`select count(*)::int as n from wod_results where user_id = ${userId}`),
      db.execute(sql`select count(*)::int as n from user_achievements where user_id = ${userId}`),
      db.execute(sql`select count(*)::int as n from box_members where user_id = ${userId}`),
      db.execute(sql`select count(*)::int as n from training_settings where user_id = ${userId}`),
      db.execute(sql`select count(*)::int as n from social_posts where user_id = ${userId}`),
      db.execute(sql`select count(*)::int as n from social_comments where user_id = ${userId}`),
      db.execute(sql`select count(*)::int as n from social_reactions where user_id = ${userId}`),
      db.execute(sql`select count(*)::int as n from contract_acceptances where user_id = ${userId}`),
    ]);
  return {
    prs: Number(prs.rows[0]?.["n"] ?? 0),
    wodResults: Number(wodResults.rows[0]?.["n"] ?? 0),
    achievements: Number(achievements.rows[0]?.["n"] ?? 0),
    boxMembers: Number(boxMembers.rows[0]?.["n"] ?? 0),
    trainingSettings: Number(trainingSettings.rows[0]?.["n"] ?? 0),
    socialPosts: Number(socialPosts.rows[0]?.["n"] ?? 0),
    socialComments: Number(socialComments.rows[0]?.["n"] ?? 0),
    socialReactions: Number(socialReactions.rows[0]?.["n"] ?? 0),
    contractAcceptances: Number(contractAcceptances.rows[0]?.["n"] ?? 0),
  };
}

function snapshotsMatch(a: Record<string, number>, b: Record<string, number>): boolean {
  return Object.keys(a).every((k) => a[k] === b[k]);
}

async function main() {
  const admin = getSupabaseAdmin();

  const mockAccounts = await db
    .select({ id: wodplaceUsersTable.id, name: wodplaceUsersTable.name, email: wodplaceUsersTable.email })
    .from(wodplaceUsersTable)
    .where(isNull(wodplaceUsersTable.authUserId));

  console.log(`Found ${mockAccounts.length} mock account(s) to migrate.`);
  console.log(APPLY ? "Mode: APPLY (writing for real)" : "Mode: DRY RUN (no changes will be made)");
  console.log("");

  // Resolve which emails already have a real Supabase Auth account (some
  // mock athletes are also box_admin/super_admin on box-admin) vs. which
  // need a brand-new one.
  const existingAuthByEmail = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) if (u.email) existingAuthByEmail.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
    page += 1;
  }

  const bridgeOnly = mockAccounts.filter((a) => existingAuthByEmail.has(a.email.toLowerCase()));
  const toCreate = mockAccounts.filter((a) => !existingAuthByEmail.has(a.email.toLowerCase()));

  console.log(`Bridge only (already have a real auth account): ${bridgeOnly.length}`);
  console.log(`Create new (fresh QA password): ${toCreate.length}\n`);

  const rollbackLog: { wodplaceUserId: string; authUserId: string; created: boolean }[] = [];
  const newPasswords: { email: string; password: string }[] = [];

  // --- Bridge-only accounts: link to their existing identity, never touch the password.
  for (const account of bridgeOnly) {
    const authUserId = existingAuthByEmail.get(account.email.toLowerCase())!;
    console.log(`- [BRIDGE] ${account.email} (${account.name}, id=${account.id}) -> auth.users.id=${authUserId}`);

    if (!APPLY) {
      console.log("    would set auth_user_id, no password change");
      continue;
    }

    const before = await snapshot(account.id);
    await db.update(wodplaceUsersTable).set({ authUserId }).where(eq(wodplaceUsersTable.id, account.id));
    const after = await snapshot(account.id);

    if (!snapshotsMatch(before, after)) {
      console.error(`    DATA MISMATCH after bridging ${account.email}:`);
      console.error(`      before: ${JSON.stringify(before)}`);
      console.error(`      after:  ${JSON.stringify(after)}`);
      console.error("    Aborting — investigate before continuing.");
      break;
    }

    // Sanity check: confirm the row now resolves via GET /api/users/me's
    // exact query shape (authUserId lookup), not just that the UPDATE ran.
    const [check] = await db
      .select({ id: wodplaceUsersTable.id })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.authUserId, authUserId));
    if (check?.id !== account.id) {
      console.error(`    VERIFICATION FAILED — auth_user_id lookup does not resolve back to ${account.id}`);
      break;
    }

    rollbackLog.push({ wodplaceUserId: account.id, authUserId, created: false });
    console.log(`    OK — bridged, data snapshot unchanged (${JSON.stringify(after)}), lookup verified.`);
  }

  // --- New accounts: create with the fixed QA password.
  for (const account of toCreate) {
    console.log(`- [CREATE] ${account.email} (${account.name}, id=${account.id})`);

    if (!APPLY) {
      console.log(`    would create auth.users row with password=${QA_PASSWORD}, then bridge`);
      continue;
    }

    const before = await snapshot(account.id);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: account.email,
      password: QA_PASSWORD,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      console.error(`    FAILED to create auth user: ${createErr?.message}`);
      console.error("    Aborting remaining migrations — already-migrated accounts above are unaffected.");
      break;
    }
    const authUserId = created.user.id;

    await db.update(wodplaceUsersTable).set({ authUserId }).where(eq(wodplaceUsersTable.id, account.id));

    const after = await snapshot(account.id);
    if (!snapshotsMatch(before, after)) {
      console.error(`    DATA MISMATCH after migration for ${account.email}:`);
      console.error(`      before: ${JSON.stringify(before)}`);
      console.error(`      after:  ${JSON.stringify(after)}`);
      console.error("    Aborting — investigate before continuing.");
      break;
    }

    const { data: signedIn, error: signInErr } = await admin.auth.signInWithPassword({
      email: account.email,
      password: QA_PASSWORD,
    });
    if (signInErr || !signedIn.user || signedIn.user.id !== authUserId) {
      console.error(`    LOGIN VERIFICATION FAILED for ${account.email}: ${signInErr?.message}`);
      break;
    }

    rollbackLog.push({ wodplaceUserId: account.id, authUserId, created: true });
    newPasswords.push({ email: account.email, password: QA_PASSWORD });
    console.log(`    OK — created + bridged (auth_user_id=${authUserId}), data snapshot unchanged (${JSON.stringify(after)}), login verified.`);
  }

  if (APPLY && rollbackLog.length > 0) {
    console.log("\nRollback log (wodplace_users.id -> auth.users.id, created=whether this script made the auth account):");
    for (const r of rollbackLog) console.log(`  ${r.wodplaceUserId} -> ${r.authUserId} (created=${r.created})`);
  }

  if (APPLY && newPasswords.length > 0) {
    console.log("\n=== New QA accounts — fixed password (same for all) ===");
    console.log(`  password: ${QA_PASSWORD}`);
    for (const r of newPasswords) console.log(`  ${r.email}`);
  }

  if (APPLY) {
    const remaining = mockAccounts.length - rollbackLog.length;
    console.log(remaining === 0 ? "\nAll accounts migrated successfully." : `\n${remaining} account(s) NOT migrated due to an abort above — see errors.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
