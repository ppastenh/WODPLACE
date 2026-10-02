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
  nitro: {
    // Rolldown's default chunk-splitting for this app's server bundle
    // produces a circular import between two chunks (a tiny helper chunk
    // re-exporting `__exportAll`, which itself imports back from the main
    // chunk it's extracted from) -- box-admin's identical setup doesn't hit
    // this, so it's dependent on this app's specific module graph, not
    // something in our own code. Cloudflare Workers' module loader throws
    // "__exportAll is not a function" on that circular reference at
    // runtime (reproduced locally via `wrangler dev` against the exact
    // build output). Forcing the server bundle into one file removes any
    // possibility of a chunk-boundary circular import -- SSR has no lazy-
    // loading benefit from splitting anyway, unlike the client bundle
    // (untouched, still code-split normally).
    // rollupConfig is a real nitro option (passed straight through to the
    // underlying nitro plugin -- confirmed working at runtime), just not
    // declared in this wrapper's own narrower NitroOptions type. The `as`
    // cast below is only to satisfy that type; the object shape itself is
    // unchanged.
    rollupConfig: {
      output: {
        inlineDynamicImports: true,
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
});
