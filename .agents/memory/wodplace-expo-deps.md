---
name: WODPLACE Expo dependency pinning
description: Version pinning rules for Expo packages and stale .d.ts pitfall in lib/api-client-react
---

## Expo package versions
- Expo SDK 54 requires `expo-file-system@~19.0.24`. A `*` range makes pnpm resolve v57+, which breaks. Pin the version in `artifacts/wodplace/package.json` and keep expo deps ONLY in the wodplace artifact — never in shared libs.
- With expo-file-system v19, import from `expo-file-system/legacy` for `uploadAsync`; the root entry throws deprecation errors.
- **Why:** pnpm resolved a major version far ahead of the Expo SDK's compatible range, causing runtime failures that looked like app bugs.

## Shared lib build
- `lib/api-client-react` must stay free of react-native/expo imports (tsconfig `types: ["react"]` can't resolve them). Use callback injection (e.g. optional `nativeUploader`) as the platform discriminator instead of `Platform.OS` inside the lib.
- The lib uses TS project references (`composite: true`, emits `dist/*.d.ts`). After editing lib source, run `npx tsc --build` in the lib dir or wodplace typecheck sees stale signatures.
- **How to apply:** whenever a shared-lib API changes, rebuild declarations before trusting typecheck results in consumers.
