---
name: WODPLACE db schema drift
description: The Drizzle schema in lib/db/src/schema/wodplace.ts can be ahead of the actual dev Postgres database (columns defined in code but never pushed).
---

Encountered on 2026-07-13: `contract_acceptances` had `guardianName`, `guardianRelationship`, and `seenByOwnerAt` in the Drizzle schema, but the live dev database table was missing those columns, causing every insert/update through that table to fail with `column "..." does not exist`.

**Why:** Someone added columns to the schema file without ever running the push step against the dev database.

**How to apply:** If a DB write fails with a missing-column error but the column is clearly present in the schema source, don't assume the code is wrong — run `pnpm --filter @workspace/db run push` (drizzle-kit push) to sync the dev DB before debugging further. Also worth doing a stale-`.tsbuildinfo` sanity check (`pnpm run typecheck:libs` / `tsc --build`) since consuming packages can typecheck against stale `dist/*.d.ts` for `@workspace/db` if `lib/db/tsconfig.tsbuildinfo` wasn't invalidated after a schema edit.
