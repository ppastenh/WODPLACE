// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [],
  },
  nitro: {
    // Preventive, not reactive: super-admin's identical setup hit a real
    // production bug where Rolldown's chunk-splitting for the server
    // bundle produced a circular import between two chunks ("__exportAll
    // is not a function" at runtime on Cloudflare Workers -- see that
    // app's vite.config.ts for the full story, reproduced locally via
    // `wrangler dev`). box-admin's current module graph happens not to
    // trigger it today, but it's the same bundler non-determinism on the
    // same tooling -- a future dependency bump could make it start
    // splitting this way here too. Forcing a single-file server bundle
    // removes the possibility entirely; SSR has no lazy-loading benefit
    // from splitting anyway (the client bundle, untouched, still is).
    rollupConfig: {
      output: {
        inlineDynamicImports: true,
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
});
