// Cross-platform preinstall guard (run by pnpm before install, and by pnpm's
// pre-run dependency check). Replaces the old `sh -c '...'` one-liner, which
// failed on Windows where /bin/sh does not exist.
//
//  1. Delete stray npm/yarn lockfiles so pnpm-lock.yaml stays authoritative.
//  2. Abort with "Use pnpm instead" when the install was not started by pnpm.
import { rmSync } from 'node:fs';

for (const lockfile of ['package-lock.json', 'yarn.lock']) {
  rmSync(lockfile, { force: true });
}

const userAgent = process.env.npm_config_user_agent ?? '';
if (!userAgent.startsWith('pnpm/')) {
  console.error('Use pnpm instead');
  process.exit(1);
}
