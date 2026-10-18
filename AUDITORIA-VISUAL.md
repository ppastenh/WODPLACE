# AUDITORIA-VISUAL.md

Auditoría de diseño/UI de solo lectura del monorepo WODPLACEtes (2026-10-18) — `artifacts/wodplace` (app Expo/React Native del alumno), `artifacts/box-admin` y `artifacts/super-admin` (paneles web, React + TanStack Router + Tailwind/shadcn). Todo lo siguiente se verificó leyendo archivos reales y con grep/wc, no son impresiones. No se aplicó ningún cambio de código al hacer esta auditoría — es la base para decidir qué tokens y componentes crear (ver `LANZAMIENTO.md`, ítem B3).

## 1. Inventario de pantallas

**wodplace** (`artifacts/wodplace/app/**`): 38 archivos .tsx/.ts de ruta Expo Router.
`+not-found.tsx`, `_layout.tsx`, `active-contracts.tsx`, `admin-dashboard.tsx`, `admin-login.tsx`, `auth-callback.tsx`, `box-detail.tsx`, `box-details.tsx`, `box-waiting.tsx`, `calendar.tsx`, `choose-view.tsx`, `community.tsx`, `create-box.tsx`, `forgot-password.tsx`, `home.tsx`, `index.tsx`, `login-password.tsx`, `login.tsx`, `medallas.tsx`, `member/[id].tsx`, `more.tsx`, `notifications.tsx`, `personal-data.tsx`, `plan.tsx`, `platform-agreement.tsx`, `profile.tsx`, `register-google.tsx`, `register.tsx`, `reset-password.tsx`, `rm/_layout.tsx`, `rm/history.tsx`, `rm/index.tsx`, `rm/movement/[id].tsx`, `rm/record.tsx`, `rm/settings/index.tsx`, `rm/settings/plates.tsx`, `wod/history.tsx`, `wod/index.tsx`.

Nota: `box-detail.tsx` y `box-details.tsx` coexisten como archivos distintos — vale la pena confirmar si es duplicación accidental o dos pantallas con propósito distinto antes de tocar nada.

**box-admin** (`artifacts/box-admin/src/routes/**`): 26 archivos (24 rutas .tsx + 1 README.md + `__root.tsx`).
`auth.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `index.tsx`, `_authenticated/route.tsx`, `_authenticated/claim-invite.tsx`, `_authenticated/_admin.tsx`, y bajo `_admin/`: `dashboard.tsx`, `classes.tsx`, `class-detail.$id.tsx`, `members.tsx`, `member-detail.$id.tsx`, `member-profile.$id.tsx`, `finances.tsx`, y bajo `more/`: `index.tsx`, `coaches.tsx`, `files.tsx`, `invites.tsx`, `my-profile.tsx`, `notifications.tsx`, `plans.tsx`, `reports.tsx`, `settings.tsx`, `wod.tsx`.

**super-admin** (`artifacts/super-admin/src/routes/**`): 15 archivos.
`auth.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `index.tsx`, `__root.tsx`, `super-admin.tsx` (contiene el gate de aal2, ver sección 6), y bajo `super-admin/`: `admins.tsx`, `agreements.tsx`, `audit.tsx`, `boxes.tsx`, `boxes.$boxId.tsx`, `index.tsx`, `settings.tsx`, `support.tsx`.

## 2. Tokens y escalas

- **wodplace**: colores en `constants/colors.ts` (95 líneas) y `constants/darkColors.ts` (79 líneas), consumidos vía el hook `hooks/useColors.ts` (no importando `colors.ts` directo). 49 archivos (app + components) usan `useColors()` — es el patrón dominante y consistente. El propio comentario del hook dice: *"Falls back to the light palette when no dark key is defined... the scaffold ships light-only by default... When a sibling web artifact's dark tokens are synced into a `dark` key, this hook will automatically switch"* — es decir, `darkColors.ts` existe pero **no está enchufado** a `colors.ts` como clave `dark`, por lo que el modo oscuro del hook no se activa aún en wodplace (queda como mejora C5 en `LANZAMIENTO.md`, no se toca en esta ronda).
- Tipografía: `constants/typography.ts` (18 líneas) exporta `FONT_SIZE` (xs 11 → hero 26). El comentario de cabecera dice: *"Shared font-size scale for Home's cards... Not yet adopted by other screens (see home.tsx for the only consumer today)"*. Confirmado por grep: **solo `app/home.tsx`** importa `constants/typography` (1 de 38 pantallas).
- No existe archivo de "spacing" dedicado en wodplace.
- **box-admin / super-admin**: no usan `tailwind.config.js` (Tailwind v4 vía CSS). Tokens viven en `src/styles.css` de cada app, con `@theme inline` definiendo `--radius-sm/md/lg/xl/2xl/3xl` derivados de una sola variable `--radius` (box-admin: `--radius: 1rem`; super-admin: `--radius: 0.875rem` — valores base distintos entre las dos apps), y variables de color shadcn estándar con `--primary: #c79a6b` igual en ambas. box-admin añade comentario explícito: *"WODPLACE dark palette — same tokens as artifacts/wodplace's RM module (constants/darkColors.ts)"* — es decir, box-admin ya sincronizó a mano sus tokens con `darkColors.ts`, pero esa sincronía no viajó de vuelta al hook `useColors` de wodplace.

## 3. Componentes reutilizables y duplicados

**wodplace** (`components/**`, 34 archivos): `AppButton.tsx` (único botón "oficial"), `AppHeader.tsx`, `Avatar.tsx`, `ClassCard.tsx` (incluye `AgendadoBadge`/`EndedBadge` internos — no hay componente `Badge` genérico), `BottomSheet.tsx`, `BottomNavBar.tsx`, `SegmentedControl.tsx`, `SideDrawer.tsx`, `PinField.tsx`, `MedalBadge.tsx`, `PostsGrid.tsx`, `JoinBoxCard.tsx`/`JoinBoxModal.tsx`, modales puntuales (`AnnouncementModal`, `AttendeesModal`, `BirthdateModal`, `CancelConfirmModal`, `EditPhraseModal`, `PhoneModal`), `ErrorBoundary.tsx`/`ErrorFallback.tsx`, más el submódulo `components/rm/*` (9 archivos propios del módulo RM). **No existe un componente `Card` genérico ni `EmptyState` genérico ni `Input` genérico** — cada pantalla construye su propia tarjeta/input con `View` + estilos.

Duplicación de botones: `Pressable` aparece en **49 archivos, 369 ocurrencias** fuera del propio `AppButton.tsx`. `AppButton` como componente solo se importa/usa en **24 archivos**. `TouchableOpacity`: 0 usos (ya migrado a `Pressable` en todas partes). Hay una proporción alta de botones "hechos a mano" con `Pressable` crudo en pantallas (p. ej. `active-contracts.tsx`, `admin-dashboard.tsx`, `calendar.tsx`, `community.tsx`, `medallas.tsx`, `notifications.tsx`, `register.tsx`, todo `rm/*`) en vez de pasar por `AppButton`.

**box-admin** (`src/components/ui/**`, shadcn completo: 53 archivos — `button.tsx`, `card.tsx`, `badge.tsx`, `dialog.tsx`, `sheet.tsx`, `skeleton.tsx`, `input.tsx`, etc.) vs `src/components/admin/**` (7 archivos hechos a mano: `AdminShell.tsx`, `BookClassSheet.tsx`, `BottomNav.tsx`, `ClassQuickView.tsx`, `MetricCard.tsx`, `MobileHeader.tsx`, `NotificationsBell.tsx`, `ActivatingStaffAccess.tsx`).
`<button` crudo (no `ui/button`) aparece en **18 archivos** de `routes/` y `components/admin/` (ej. `auth.tsx`, `classes.tsx`, `dashboard.tsx`, `finances.tsx`, `members.tsx`, casi todos los `more/*.tsx`, `__root.tsx`, `BookClassSheet.tsx`, `NotificationsBell.tsx`). El import de `components/ui/button` aparece en **20 archivos**. Es decir, casi tantas pantallas usan botón crudo como pantallas que usan el `Button` de shadcn — mezcla real, no aislada.

**super-admin**: mismo set shadcn completo (49 archivos `ui/*`) + solo 5 componentes a mano (`AdminHeader.tsx`, `AdminTabs.tsx`, `MfaChallengeScreen.tsx`, `MfaEnrollmentFlow.tsx`, `StatCard.tsx`).
`<button` crudo: **6 archivos** (`agreements.tsx`, `audit.tsx`, `__root.tsx`, `AdminHeader.tsx`, `MfaChallengeScreen.tsx`, `ui/sidebar.tsx` — este último es del propio shadcn, no cuenta como "a mano"). Import de `ui/button`: **15 archivos**. Proporción de mezcla mucho menor que box-admin.

## 4. Inconsistencias de contraste / íconos / radios / botones / estados

- **Contraste (patrón `opacity: pressed ? X : 1`)**: el patrón que causó los bugs ya corregidos en `SideDrawer`/`admin-login` ya no aparece en esos dos archivos (confirmado: `SideDrawer.tsx` solo usa `opacity: backdropOpacity.value` de un fondo animado, no relacionado con el botón; `admin-login.tsx` no tiene ningún `opacity` hoy). Pero el mismo patrón **sigue sin tocar en otros 12 archivos, 16 ocurrencias**:
  - `app/rm/index.tsx:369`, `app/rm/record.tsx:323,348`
  - `components/AppButton.tsx:82` (opacidad del propio botón "oficial", probablemente ya calibrada a propósito)
  - `components/AppHeader.tsx:75,83`, `components/Avatar.tsx:42`, `components/ClassCard.tsx:79,145`, `components/ErrorFallback.tsx:62,85,127`, `components/PostsGrid.tsx:35`, `components/rm/PercentSlider.tsx:69,85`, `components/rm/PlatePalette.tsx:98`, `components/rm/RmHeader.tsx:34`.
  - Valores van de 0.6 a 0.9 — varios (`0.6` en `AppHeader`, `ClassCard`, `RmHeader`) son iguales al valor que causó el bug de contraste original en `SideDrawer`/`admin-login`.
- **Íconos**: sin mezcla dentro de cada app. wodplace usa exclusivamente `@expo/vector-icons` (49 archivos, 0 usos de `lucide-react-native` o `react-native-vector-icons`). box-admin usa exclusivamente `lucide-react` (46 archivos, 0 `react-icons`/`@heroicons`). super-admin igual, `lucide-react` (34 archivos). Consistente, sin hallazgo aquí.
- **Radios de borde**:
  - wodplace: `borderRadius:` numérico tiene **más de 20 valores distintos sueltos** (1, 2, 3, 4, 6, 7, 8, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 26, 32, 36, 44, y 999 para "circular" — 22 ocurrencias, razonable como atajo de "redondo total"). No hay una escala declarada en código; son literales repetidos pantalla por pantalla.
  - box-admin: clases `rounded-*` con conteos: `rounded-full` 143, `rounded-2xl` 87, `rounded-3xl` 51, `rounded-xl` 43, `rounded-md` 39, `rounded-sm` 19, `rounded-lg` 15, más variantes direccionales — escala acotada (nombres estándar Tailwind/shadcn ligados a `--radius`), consistente.
  - super-admin: mismo patrón (`rounded-full` 63, `rounded-md` 42, `rounded-2xl` 42, `rounded-sm` 19, `rounded-lg` 9, `rounded-xl` 8, `rounded-3xl` 3) — también consistente vía Tailwind.
  - Conclusión: las dos apps web (Tailwind) están bien; wodplace (RN) es el único lugar sin escala real de radios.
- **Botones**: ver sección 3 — `AppButton` en 24 archivos vs `Pressable` crudo en 49 archivos/369 ocurrencias en wodplace; en box-admin casi 1:1 entre `<button` crudo (18) y `ui/button` (20).
- **Estados de carga/vacío**: wodplace usa `ActivityIndicator` en 21 archivos, `isLoading` en 15, **`Skeleton`: 0 archivos** (no existe componente skeleton en wodplace, solo spinner). Textos de vacío ("No hay…", "Aún no…", "Todavía no…") aparecen sueltos, escritos a mano, en 17 archivos distintos (`active-contracts.tsx`, `box-detail.tsx`, `box-waiting.tsx`, `calendar.tsx`, `community.tsx`, `home.tsx`, `login.tsx`, `member/[id].tsx`, `more.tsx`, `notifications.tsx`, `plan.tsx`, `platform-agreement.tsx`, `profile.tsx`, `rm/history.tsx`, `wod/history.tsx`, `wod/index.tsx`, `JoinBoxCard.tsx`) y **no existe un componente `EmptyState` reutilizable**.
  box-admin: `isLoading`/`isPending` en 16 archivos de rutas, `Skeleton` de shadcn **0 usos reales** (el componente existe en `ui/skeleton.tsx` pero nadie lo importa en rutas), `Loader2`/`animate-spin` en 1 archivo. super-admin: `isLoading`/`isPending` en 8 archivos, 0 `Skeleton`, 0 `animate-spin`. No hay convención de loading compartida en ninguna de las tres apps.

## 5. Pantallas que mezclan presentación con lógica (tamaño como indicador proxy)

**wodplace** (`app/**`, top por líneas):
1. `app/community.tsx` — 1583 líneas (la más grande de toda la app; incluye lógica de subida de archivos vía `expo-file-system/legacy`)
2. `app/home.tsx` — 1280 líneas (única consumidora de `typography.ts`, concentra lógica de feed + tarjetas + cumpleaños + etc.)
3. `app/active-contracts.tsx` — 788 líneas
4. `app/rm/record.tsx` — 576 líneas
5. `app/admin-login.tsx` — 546 líneas
6. `app/rm/index.tsx` — 509 líneas
7. `app/profile.tsx` — 414 líneas
8. `app/calendar.tsx` — 395 líneas

**box-admin** (`src/routes/**`):
1. `_admin/members.tsx` — 1262 líneas
2. `_admin/member-detail.$id.tsx` — 957 líneas
3. `_admin/classes.tsx` — 767 líneas
4. `_admin/dashboard.tsx` — 536 líneas
5. `_admin/more/plans.tsx` — 501 líneas
6. `_admin/more/coaches.tsx` — 489 líneas
7. `_admin/class-detail.$id.tsx` — 418 líneas
8. `_admin/more/files.tsx` — 388 líneas

**super-admin** (`src/routes/**`):
1. `super-admin/boxes.tsx` — 507 líneas
2. `super-admin/boxes.$boxId.tsx` — 246 líneas
3. `super-admin/admins.tsx` — 221 líneas
4. `super-admin/agreements.tsx` — 176 líneas
5. `super-admin/support.tsx` — 173 líneas
6. `reset-password.tsx` — 141 líneas
7. `super-admin/settings.tsx` — 132 líneas
8. `super-admin/audit.tsx` / `__root.tsx` — 124 líneas cada uno

No hay separación sistemática en hooks/`*.logic.ts` en ninguna de las tres apps — fetching, estado y JSX viven en el mismo archivo de pantalla en los casos de mayor tamaño.

## 6. Fronteras que no se tocan

- `ESTADO.md` documenta en detalle la feature de seguridad recién desplegada y extremadamente sensible: MFA/aal2 obligatorio para super admin (`require_aal2_for_super_admin`, encendido en producción el 2026-10-18). El documento marca explícitamente partes como "no se toca": *"la rama de dueño/box_admin/coach nunca se toca"*, con RLS en 9+ tablas, funciones canónicas (`isBoxOwnerOrSuperAdmin`, `isAnyStaff`, `isBoxAdminOrSuperAdmin`, `loadStatus`), y un script de verificación (`artifacts/api-server/scripts/verify-aal2-enforcement.ts`).
- **`artifacts/super-admin/src/routes/super-admin.tsx`** (120 líneas) contiene literalmente la compuerta de UI de ese sistema: importa `getAssuranceLevel, isAal2Enforced, listFactors` de `@/lib/mfa`, maneja un estado `MfaGate = "loading" | "ok" | "challenge" | "no-factor-blocked"` y envuelve el `Outlet` (el render de toda la sección super-admin) — lógica de seguridad y JSX de presentación están en el mismo archivo, a propósito. El comentario en el código dice: *"Compuerta de aal2, por encima del Outlet -- nunca cambia nada para una cuenta sin factores inscritos salvo que el interruptor global esté encendido"*. **No debe tocarse en una limpieza visual** — cualquier refactor de presentación en ese archivo debe dejar intacta la máquina de estados del gate.
- No se encontraron comentarios "no tocar"/"do not touch" literales en código de componentes. Hay 3 referencias a `expo-file-system/legacy` (`community.tsx`, `profile.tsx` — API legacy de Expo, no del dominio del producto), un comentario de "legacy accounts" en `app/wod/index.tsx:37` (rango de ranking para cuentas antiguas) y "legacy admin-settable fallback" en `box-admin/src/routes/_authenticated/_admin/members.tsx:102` (campo `photo_url`) — ninguno bloqueante para UI, pero ese último conviene no tocarlo sin revisar su write-path.

## 7. Pruebas existentes

**Cero archivos de test en todo el monorepo.** Búsqueda de `*.test.*`, `*.spec.*` y carpetas `__tests__` en `artifacts/wodplace`, `artifacts/box-admin`, `artifacts/super-admin` y `artifacts/api-server` (excluyendo `node_modules`): 0 resultados en las cuatro apps. No hay tests unitarios de lógica, ni de componentes de UI, ni de API. Toda verificación hasta ahora (según `ESTADO.md`) fue manual con cuentas desechables en producción — cualquier unificación de tokens/componentes no tiene red de pruebas automatizada que la respalde hoy.

---

## Propuesta

**(a) Tokens mínimos a crear**
1. En wodplace: enganchar `darkColors.ts` como clave `dark` dentro de `colors.ts` para que `useColors()` realmente alterne tema (hoy cae siempre a light) — queda para la mejora C5 de `LANZAMIENTO.md`, no en la primera ronda.
2. Promover `constants/typography.ts` (`FONT_SIZE`) de "solo home.tsx" a escala global, y añadirle un companion de `SPACING` (hoy inexistente).
3. Una escala de `RADIUS` para wodplace (hoy 20+ valores sueltos) espejando los `--radius-sm/md/lg/xl/2xl/3xl` que box-admin/super-admin ya tienen vía Tailwind.
4. Unificar el valor base `--radius` entre box-admin (1rem) y super-admin (0.875rem) si se quiere que ambos paneles admin se vean como una familia (no evaluado en esta ronda).

**(b) Componentes base a unificar primero**
1. wodplace: migrar los 369 usos de `Pressable` crudo fuera de `AppButton` (49 archivos) — empezando por los que ya tienen el patrón de opacidad de contraste sin corregir.
2. wodplace: crear `EmptyState` y `Badge` genéricos — hoy 17 pantallas redactan su propio "No hay…" y los badges viven acoplados dentro de `ClassCard.tsx`.
3. box-admin: cerrar la brecha de `<button` crudo (18 archivos) vs `ui/button` (20 archivos).
4. Adoptar `ui/skeleton.tsx` de shadcn en box-admin/super-admin (existe, 0 usos reales) en vez de que cada ruta decida su propio loading.

**(c) Orden de pantallas a revisar por impacto** (más usuarios / más repetidas primero)
1. `wodplace/app/home.tsx` (pantalla de aterrizaje de cada sesión del alumno, única usuaria real de `typography.ts`)
2. `wodplace/app/community.tsx` (la más grande, uso diario)
3. `wodplace/components/ClassCard.tsx` + `BottomNavBar.tsx` + `AppHeader.tsx` (se repiten en casi todas las pantallas)
4. `wodplace/app/calendar.tsx` y `app/more.tsx` (navegación frecuente)
5. `box-admin/_admin/members.tsx` (pantalla más usada por admins del box) y `_admin/dashboard.tsx`
6. `box-admin/components/admin/BottomNav.tsx` / `MobileHeader.tsx` / `AdminShell.tsx` (shell repetido en todas las rutas admin)
7. `super-admin/super-admin/boxes.tsx` (la más grande y de más uso en ese panel) — sin tocar `super-admin.tsx` más allá de ajustes puramente visuales que no muevan la máquina de estados.
8. Dejar para el final (o no tocar) cualquier archivo con lógica RLS/aal2 inline (`super-admin.tsx`, los 4 helpers de `api-server` citados en `ESTADO.md`) — frontera de seguridad recién validada en producción, no superficie de este trabajo visual.
