---
name: WODPLACE app conventions
description: Expo mobile app (CrossFit box) conventions — auth, backend wiring, contract-acceptance flow, admin panel.
---

## Auth & backend sync
- Auth is mock/local via AsyncStorage (`context/AuthContext.tsx`); there's no real session/auth backend. After any `persist()` of a user, best-effort fire-and-forget `POST /users` (sync-by-id) so backend FKs (e.g. contract read-progress) resolve — swallow errors so the app still works offline/without backend.

## Generated API client base URL
- The orval-generated client (`@workspace/api-client-react`) bakes an `/api` prefix into every generated path helper (e.g. `/api/contracts`). `setBaseUrl()` must be given just the domain (e.g. `https://<domain>`), NOT `https://<domain>/api` — adding `/api` to both produces silent `/api/api/...` 404s that are easy to miss because `data` just looks empty/undefined in the UI with no thrown error.

## orval + tanstack-query v5 override typing
- Generated `useXxx(params, { query: { enabled: ... } })` hooks type the `query` override as a full `UseQueryOptions` (which in tanstack v5 requires `queryKey`), even though the wrapper always supplies `queryKey` internally. Passing just `{ enabled }` fails typecheck; cast the partial object `as never` to bypass — this is a generation quirk, not a real behavioral gap.

## PDF viewing without native modules
- `expo-web-browser`'s `openBrowserAsync` (JS-only, no native module needed) is the approved way to show a PDF/external URL in-app without pulling in `react-native-webview` (forbidden by the `expo` skill's native-module policy). On Expo web builds specifically, the "did the user finish reading" follow-up confirmation dialog may not reliably block/appear since the browser opens as a real new tab — this is a web-preview-only quirk, not expected on native.

## Expo native module version pinning
- Always match new `expo-*` package versions to the versions in the installed `expo` package's `node_modules/expo/bundledNativeModules.json`, not whatever `^` range npm suggests — the latest published version of an Expo module is often for a newer/canary Expo SDK than the one in this project and can break the build.
