# Plan F7-b — eliminar el token de administrador, el PIN del servidor y las rutas `/admin/*` que ya nadie usa

Fecha: 2026-10-26. Pía aprobó empezar F7-b1 (ver "Resultado del grep sobre HEAD" y "Alcance real de F7-b1" más abajo).

Contexto: F2a/F2b sacaron el token de la moderación y de `dash-link`; F7-a2 (404281d, ya en el remoto y probada en el teléfono) reemplazó el PIN del servidor por el candado local. Lo que sigue en el servidor es código sin quien lo llame.

## 1. Inventario por grep (todo el repositorio)
Búsqueda en `artifacts/` (wodplace, api-server, box-admin, super-admin, mockup-sandbox), `lib/` (api-spec, api-zod, api-client-react, db, supabase-types), `scripts/`, `workers/` y `supabase/`, sin `node_modules`, `dist`, `.output` ni `.git`. Nota: los textos `/admin/users/...` que aparecen en los paquetes ya compilados de box-admin y super-admin (`.output/`, ignorado por git) son de la API de administración de Supabase Auth, no nuestra.

### 1.1 Rutas del servidor (11 se eliminan; 1 se queda)
| Ruta | Archivo | Quién la usa hoy |
|---|---|---|
| `POST /admin/pin/status` | `routes/admin.ts:76` | Nadie. Solo el hook generado `getAdminPinStatus`, sin ninguna llamada (la usaba el `admin-login` antiguo, reemplazado en 404281d). |
| `POST /admin/pin/setup` | `routes/admin.ts:117` | Nadie (`setupAdminPin`, sin llamadas). |
| `POST /admin/pin/verify` | `routes/admin.ts:158` | Nadie (`verifyAdminPin`, sin llamadas). |
| `POST /admin/pin/session` | `routes/admin.ts:252` | Nadie (`createAdminSession`, sin llamadas). |
| `GET /admin/contract-acceptances` | `routes/admin.ts:311` | Nadie. Hook `useListAdminContractAcceptances`, sin llamadas desde que F6 borró `more.tsx`. El panel usa la función de base de datos de F3. |
| `POST /admin/contract-acceptances/ack` | `routes/admin.ts:369` | Nadie (`useAckContractAcceptances`, sin llamadas). El panel marca vistas por RLS (F3). |
| `PUT /admin/settings/box-name` | `routes/social.ts:138` | Nadie. Hook manual `useAdminBoxName`, sin llamadas. El panel edita `boxes.name` por RLS (F4). |
| `GET /admin/social/reports` | `routes/social.ts:491` | Nadie. Hook manual `useAdminSocialReports`, sin llamadas. El panel usa RLS (F1). |
| `PATCH /admin/social/reports/:id/resolve` | `routes/social.ts:518` | Nadie (mismo hook). |
| `POST /admin/users/:userId/block` | `routes/social.ts:536` | Nadie. La app pasó a `block-author` en F2c. |
| `DELETE /admin/users/:userId/block` | `routes/social.ts:563` | Nadie. Lo reemplaza `DELETE /social/users/:userId/block` (F2a). |
| `POST /admin/dash-link` | `routes/admin.ts:442` | **SE QUEDA**: la usa `admin-dashboard.tsx` (hook `useCreateAdminDashLink`). Ya decide por sesión y rol (F2b). |

**Versiones antiguas de la app:** ninguna (Pía confirmó que no hay app publicada y que solo existen sus teléfonos de prueba). Por eso el resultado esperado de "quién la usa" es **nadie legítimo** en las 11.

### 1.2 Código del servidor
| Elemento | Dónde | Quién lo usa hoy | Destino |
|---|---|---|---|
| `lib/adminToken.ts` (firma/verificación del token, lee `ADMIN_ACCESS_CODE`) | api-server | `routes/admin.ts` (solo las rutas `pin/*`) y `lib/adminAccess.ts` | **Eliminar** |
| `lib/pinHash.ts` (`hashPin`, `verifyPin`) | api-server | `routes/admin.ts` (solo `pin/*`) | **Eliminar** |
| `lib/adminAccess.ts` — `AdminAccess`, `resolveAdminAccess`, `requireAdminAccess`, `adminAccessOf`, `canManageBox`, `manageScope`, `boxForNewToken`, `ADMIN_SESSION_HEADER`, `authUserIdForWodplaceUser` | api-server | solo las 11 rutas a eliminar | **Eliminar** esas piezas |
| `lib/adminAccess.ts` — `resolvePanelAccess`, `PanelAccess`, `resolveSessionCaller`, `SessionCaller`, `canModerateBox` | api-server | `routes/social.ts` (moderación), `routes/boxes.ts` (comentarios de avisos), `dash-link` | **Se quedan**, movidos a `lib/panelAccess.ts` (`git mv` + recorte; el nombre `adminAccess` hablaba de un token que ya no existe) |
| Cabecera `X-Admin-Session` | `adminAccess.ts`, `adminToken.ts`, comentarios en `social.ts` y `boxes.ts` | solo lo anterior | **Eliminar** (la cabecera ya se ignora desde F2) |
| Variable `ADMIN_ACCESS_CODE` | `lib/adminToken.ts` (se lee solo al firmar, no al arrancar), `.env.example:45`, comentario en `lib/db/src/schema/wodplace.ts`, `CLAUDE.md` ("12 variables en Render") | solo el token | **Eliminar** del código y la documentación; en Render, solo con OK de Pía (ver 3) |
| Imports de esquemas Zod `GetAdminPinStatus*`, `SetupAdminPin*`, `VerifyAdminPin*`, `CreateAdminSession*`, `ListAdminContractAcceptances*`, `AckContractAcceptances*` | `routes/admin.ts` | solo esas rutas | **Eliminar** |

### 1.3 Especificación y código generado
- `lib/api-spec/openapi.yaml`: rutas `/admin/pin/status`, `/setup`, `/verify`, `/session`, `/admin/contract-acceptances` y `/ack` (líneas 631–803) y sus esquemas `AdminPinStatusRequest/Result`, `AdminPinSetupRequest`, `AdminPinVerifyRequest/Result`, `AdminPinSession`, `AdminSessionRequest`, `ContractAcceptanceNotification`, `AckContractAcceptancesResult` (verificar uno por uno que ningún otro endpoint los reutilice). **Se queda** `/admin/dash-link` con `CreateAdminDashLinkRequest(+Target)` y `AdminDashLinkResult`.
- Código generado (`lib/api-zod/src/generated/**` y `lib/api-client-react/src/generated/**`): se regenera con `pnpm --filter @workspace/api-spec codegen` (orval); desaparecen los hooks y tipos de lo anterior. Hoy hay **76 archivos generados marcados como modificados que solo difieren en el fin de línea** (sin cambios reales): el commit llevará solo los archivos con cambios reales (`git add` explícito) y se comprobará con `git diff --ignore-cr-at-eol`.
- Hooks escritos a mano en `lib/api-client-react/src/social.ts`: `useAdminBoxName` (línea ~70), `useAdminSocialReports` (~391), el tipo `SocialReport` (solo lo usa ese hook) y el comentario "NOTE: the adminCode / code params…". Sin ningún uso.

### 1.4 Aplicaciones y otros paquetes
| Lugar | Resultado del grep |
|---|---|
| `artifacts/wodplace` | Ya sin `adminSession`, token ni `X-Admin-Session` (se fueron en F2c y F7-a2). Solo queda `AuthContext.verifyPassword` (la usaba el `admin-login` antiguo; hoy sin uso): se elimina en la limpieza (F7-b3). Se queda `useCreateAdminDashLink` y los hooks de moderación nuevos. |
| `artifacts/box-admin`, `artifacts/super-admin` | Nada: hablan con Supabase directo y con `dash-link` no (lo usa la app). |
| `artifacts/mockup-sandbox`, `workers/keepalive` | Nada. |
| `scripts/` | Nada nuestro (el único `/admin/users` es la API de Supabase Auth que usa `check-community-comments.ts`). |
| `lib/db`, `lib/supabase-types`, `supabase/README.md` | Mencionan la tabla `admin_pins` (ver sección 2). |

## 2. Base de datos (solo con OK aparte)
`admin_pins`: **2 filas** (hashes de los PIN antiguos; sin intentos fallidos ni bloqueos), RLS activada, **0 políticas**, llave foránea a `wodplace_users` con borrado en cascada, y **ninguna vista, función ni política** la menciona. Se puede borrar sin romper nada. Migración propuesta aparte (**F7-d, con tu OK**): `DROP TABLE admin_pins` + reversa que recrea la tabla vacía (los hashes no se recuperarían, y no hace falta: el PIN del servidor no se reutiliza). Antes: correr `check:super-admin-inlining` y `check:security-definer-grants` (obligatorios en migraciones). También se saca `adminPinsTable` de `lib/db/src/schema/wodplace.ts`, el tipo de `lib/supabase-types` y la mención en `supabase/README.md`.

## 3. Variable de Render `ADMIN_ACCESS_CODE` (solo con OK aparte)
Hoy el servidor **ya arranca sin ella** (se lee solo al firmar un token, no al iniciar). Se retira del código en F7-b1; **quitarla de Render lo haces tú, al final y solo con tu OK** (paso a paso: Render → api-server → Environment → borrar `ADMIN_ACCESS_CODE` → guardar y esperar el despliegue). Reversa: poner cualquier valor aleatorio largo (no hace falta recuperar el original, porque ningún token sobrevive).

## 4. Orden de commits (el código del servidor primero, la limpieza después)
1. **F7-b1 — servidor (lo más pequeño posible, sin renombrados):** borrar las 11 rutas (en `admin.ts` queda solo `dash-link`), borrar `adminToken.ts` y `pinHash.ts`, recortar `adminAccess.ts` a lo que se queda (sesión + rol + box) y actualizar imports y comentarios. Sin cambios en base de datos, en la app ni en Render.
2. **F7-b2 — especificación y cliente:** recortar `openapi.yaml`, regenerar con orval, borrar `useAdminBoxName`, `useAdminSocialReports` y `SocialReport` de `social.ts`.
3. **F7-b3 — limpieza y renombrados:** renombrar `adminAccess.ts` a `panelAccess.ts` y `admin.ts` a `dashLink.ts` (con `routes/index.ts`), `verifyPassword` de `AuthContext`, `.env.example`, `CLAUDE.md`, `LANZAMIENTO.md`/`ESTADO.md`, comentario de `lib/db`, texto de las listas de los checks si cambió algo.
4. **F7-d (con tu OK):** migración que borra `admin_pins` + limpieza de `lib/db`, `supabase-types` y README, con los tres checks.
5. **F7-e (con tu OK, la haces tú):** quitar `ADMIN_ACCESS_CODE` de Render.

Cada commit se revierte solo con `git revert`, en orden inverso. Se hace push y se verifica el despliegue de Render (línea Deployed commit) entre F7-b1 y F7-b2.

## 5. Pruebas
**Antes de cada commit:** `pnpm run typecheck` (librerías, app, paneles y scripts), build del servidor, `expo export` de Android, `check:pressed-opacity`, `check:community-comments`, las 68 pruebas del candado, y (F7-b2) comprobar que `codegen` es idempotente (segunda corrida sin cambios).

**Servidor local (F7-b1), con cuentas y cajas desechables:**
1. Las **11 rutas eliminadas responden 404** (con sesión válida de cada rol, con sesión + una cabecera `X-Admin-Session` cualquiera, y sin sesión), y `POST /admin/dash-link` sigue respondiendo.
2. **El servidor arranca sin `ADMIN_ACCESS_CODE`** (se inicia con la variable quitada del entorno; `healthz` ok y las rutas de moderación y de `dash-link` responden).
3. Un grep final: ninguna aparición de `adminToken`, `pinHash`, `X-Admin-Session`, `ADMIN_ACCESS_CODE`, `requireAdminAccess` ni `adminPinsTable` en el código (salvo la tabla hasta F7-d y los documentos históricos).

**Producción, tras el push de F7-b1 y la línea Deployed commit de Render:** la matriz completa con cuentas y cajas desechables y sin tocar datos reales — moderación (59), `dash-link` (18, incluido el segundo uso del enlace y el límite), `check:community-comments` (15), la matriz de contratos de F3 (28 + 8 del alumno) — más las 11 rutas respondiendo 404 en `api.wodplace.cl`.

**Teléfono (Pía), checklist corta tras F7-b1:** (1) Administrador → PIN → el panel abre; (2) en Comunidad, borrar una publicación y un comentario de prueba; (3) en el panel: "Reportes de Comunidad", "Aceptaciones de contratos" y el nombre del box siguen funcionando (usan Supabase directo, no el servidor eliminado); (4) línea fija de Comunidad: el comentario se ve para el autor, para otro alumno y para el administrador.

## 6. Riesgos y decisiones
- Regenerar el cliente reescribe archivos con otro fin de línea: se controla con `git add` explícito y `--ignore-cr-at-eol`.
- Si alguien guardó una copia antigua de la app, las 11 rutas darán 404 y el panel no abriría con el PIN antiguo; no hay tales copias (confirmado por Pía).
- **Decisiones para Pía (propuesta entre paréntesis):** ¿renombrar `adminAccess.ts` a `panelAccess.ts` y `admin.ts` a `dashLink.ts` (sí)? ¿dejar la ruta como `/admin/dash-link` aunque ya no tenga nada que ver con un token (sí; renombrarla obliga a coordinar app y servidor para un beneficio solo estético)? ¿hacer F7-d y F7-e justo después de verificar F7-b1/b2/b3 (sí, pero cada una con su OK)?

## Resultado del grep sobre HEAD (404281d) pedido por Pía, y logs de Render
- **Logs de Render (24 h, que Pía revisó):** 2 llamadas a `POST /api/admin/pin/status` (14:17 UTC, las dos de Pía con la versión anterior de la app, antes de reiniciar Metro con `-c`) y 4 a `POST /api/admin/dash-link` (200, su cuenta; la ruta que se queda).
- **Grep con `git grep` sobre HEAD, en wodplace, box-admin, super-admin, mockup-sandbox, scripts, workers y api-client:** ninguna llamada viva a las 11 rutas. Lo único que aparece son (a) las definiciones de los hooks sin uso `useAdminBoxName` y `useAdminSocialReports` (`lib/api-client-react/src/social.ts`, que nadie importa), (b) el código generado de `pin/*` y `contract-acceptances` (`lib/api-client-react/src/generated/api.ts`), sin ningún llamador de los hooks `getAdminPinStatus`, `setupAdminPin`, `verifyAdminPin`, `createAdminSession`, `listAdminContractAcceptances` y `ackContractAcceptances` ni de sus versiones `use…`, y (c) `/admin/users` de `check-community-comments.ts`, que es la API de administración de Supabase Auth.

## Alcance real de F7-b1 (lo hecho el 2026-10-26)
Solo el servidor, un commit, reversible con `git revert`: se eliminan las 11 rutas, `adminToken.ts`, `pinHash.ts` y las piezas del token de `adminAccess.ts`; queda `POST /admin/dash-link`. **No** se renombra nada, **no** se toca la especificación ni el cliente generado (F7-b2), **no** se toca `ADMIN_ACCESS_CODE` en Render ni la tabla `admin_pins` (F7-d y F7-e, solo con OK de Pía).
