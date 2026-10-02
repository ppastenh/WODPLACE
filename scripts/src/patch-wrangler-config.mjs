#!/usr/bin/env node
// Patches the wrangler.json that nitro's cloudflare-module preset generates
// at build time (<app>/.output/server/wrangler.json) to declare `vars` and
// `routes` BEFORE `wrangler deploy` runs against it.
//
// Why this exists: `wrangler deploy --config <file>` is NOT additive -- it
// treats that file as the Worker's complete desired state and overwrites
// anything not declared in it, including vars and routes set by hand in the
// Cloudflare dashboard. nitro's generated file only ever contains
// name/main/assets/compatibility -- never vars or routes -- so every deploy
// silently wiped whatever custom domain route and env vars had been set
// through the dashboard. This script makes vars/routes part of the
// deployed config itself, every time, so nothing relies on dashboard-only
// state that a later deploy can clobber.
//
// Deliberately only handles NON-secret vars (the Supabase project URL and
// publishable/anon key -- safe to ship client-side by design). The service
// role key must be set as an encrypted Cloudflare SECRET (dashboard ->
// Settings -> Variables -> "Encrypt", or `wrangler secret put`), never as a
// plain var here -- secrets live outside the config file entirely, so
// `wrangler deploy` never touches them regardless of what this script does.
//
// Usage: node scripts/src/patch-wrangler-config.mjs <path-to-wrangler.json> <custom-domain>
import { readFileSync, writeFileSync } from "node:fs";

const [, , configPath, customDomain] = process.argv;

if (!configPath || !customDomain) {
  console.error("Usage: node patch-wrangler-config.mjs <wrangler.json path> <custom domain>");
  process.exit(1);
}

const VAR_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];

const config = JSON.parse(readFileSync(configPath, "utf8"));

const vars = {};
for (const name of VAR_NAMES) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var ${name} -- set it in this Cloudflare project's Environment Variables.`);
    process.exit(1);
  }
  vars[name] = value;
}

config.vars = { ...config.vars, ...vars };
config.routes = [{ pattern: customDomain, custom_domain: true }];

writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`Patched ${configPath}: added ${Object.keys(vars).length} vars and route "${customDomain}".`);
