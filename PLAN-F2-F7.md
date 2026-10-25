# Plan F2 (moderación sin token) y esbozo de F7 (candado local con PIN)

Fecha: 2026-10-25. Solo plan: no se ha tocado código. Espera el OK de Pía.

## Decisión de Pía sobre el PIN (2026-10-25)

Se mantiene un **candado LOCAL con PIN**: guardado cifrado solo en el teléfono (SecureStore), sin servidor, y **no autoriza nada** (la sesión, el rol y el box siguen siendo lo único que decide en el servidor). Sirve para el caso de prestar el teléfono con la app abierta.

Reglas propuestas (a afinar):
1. Se pide **cada vez que se abre el panel desde el menú** y **tras un tiempo en segundo plano** (propuesta: 2 minutos).
2. **5 errores seguidos → espera creciente, nunca bloqueo permanente** (propuesta: 30 s, 1 min, 5 min, 15 min y luego 30 min como tope). El contador se guarda en SecureStore para que cerrar la app no lo reinicie.
3. **"Olvidé mi PIN" = cerrar sesión y volver a entrar**; al volver a abrir el panel se crea un PIN nuevo. Se **elimina la pantalla de contraseña de respaldo**.
4. **Huella o rostro como atajo opcional** (la app ya usa `expo-local-authentication`); el PIN siempre queda como respaldo.
5. El PIN del servidor (tabla `admin_pins`) **no se reutiliza** y se retira después, con OK de Pía.

Preguntas chicas para afinar (con mi propuesta): ¿2 minutos en segundo plano? ¿PIN de 6 dígitos como hoy? ¿La creación del PIN es obligatoria la primera vez que se abre el panel (propuesta: sí, es el sentido del candado)? ¿Una cuenta distinta en el mismo teléfono tiene su propio candado (propuesta: sí, la clave incluye el id de la cuenta)?

---

# F2 — Moderación dentro de la publicación, sin token ni PIN

## 1. Qué hace hoy cada acción

| Acción | Ruta del servidor | Quién la ve en la app | Quién la puede hacer hoy |
|---|---|---|---|
| Borrar una publicación | `DELETE /social/posts/:id` | Menú "⋯" de la publicación, "Eliminar publicación" (`community.tsx`) | El autor (con sesión). Un administrador ajeno solo si manda **además** el token del PIN (`X-Admin-Session`): administrador o dueño del mismo box, o super admin autorizado. Coach con token: 403 |
| Borrar un comentario | `DELETE /social/posts/:id/comments/:commentId` | Botón de basurero en cada comentario | Igual que arriba |
| Borrar un comentario de un aviso del box | `DELETE /box-memberships/announcements/:id/comments/:commentId` (`boxes.ts`) | Igual, en los comentarios de avisos | Igual que arriba |
| Bloquear al autor | `POST /admin/users/:userId/block` (exige token + rol de administración; el box sale del token) | Menú "⋯", "Bloquear autor" | Administrador o dueño de ese box, super admin autorizado. Solo marca al autor en `blocked_users`: **sus publicaciones dejan de salir en el feed del box** |
| Desbloquear | `DELETE /admin/users/:userId/block` | **No hay pantalla en la app ni en el panel** | Solo por la ruta (nadie la llama hoy). `blocked_users` tiene 0 filas |

En la interfaz, la app muestra las opciones de moderación solo si hay token en memoria (o sea, tras pasar por el PIN) **y** el rol es `box_admin` o `super_admin`. Hoy un administrador que no pasó por el PIN no ve nada de esto.

## 2. Cómo quedaría cada una (sesión + rol + box, sin token ni PIN)

Una función única del servidor, `moderador(req, boxId)`, que reutiliza lo que ya existe (`resolveSupabaseUser` + `resolvePanelAccess`): la sesión verificada da la cuenta (y el aal), el rol sale de `user_roles`/dueño del box, y el box es el **de la publicación o comentario**, nunca uno que mande el cliente. Regla: puede moderar si es el autor, o si administra ese box (administrador o dueño), o si es super admin autorizado (aal2 cuando el interruptor está encendido). Un coach no modera.

- **Borrar publicación / comentario / comentario de aviso:** misma ruta; la cuenta sale de la sesión (ya no del token) y se decide por autor o `moderador`. Si llega la cabecera `X-Admin-Session`, **se ignora** (así las versiones antiguas siguen funcionando y el token deja de conceder nada).
- **Bloquear autor:** ruta nueva `POST /social/posts/:id/block-author`. No recibe el id del usuario: el servidor toma al autor de **esa publicación** y su box, y exige que el llamador administre ese box. Es más estricta que la actual (no se puede bloquear a alguien que no escribió ahí) y no pide `boxId` al cliente. No se puede bloquear a uno mismo.
- **Desbloquear:** `DELETE /social/users/:userId/block?boxId=` con la misma regla, para no dejar un bloqueo sin salida. Sin pantalla por ahora (propuesta: una lista de bloqueados en el panel, más adelante, como fase aparte).
- Las rutas antiguas `/admin/users/:userId/block` siguen en pie, con token, hasta F7 (para las versiones antiguas).

## 3. Bloqueo de autores: ¿servidor o políticas por box?

**Recomiendo que se quede en el servidor, con comprobación de rol y box, SIN migración.**
- El único que lee `blocked_users` es el servidor (el feed, con la conexión de servicio que omite RLS). Ni la app ni el panel la leen directo.
- "RLS activada y cero políticas" es lo más cerrado posible; agregar políticas por box abre una superficie nueva sin beneficio, y las reglas de permisos de base necesitan relevamiento y tu aprobación.
- Si más adelante el panel necesita listar o desbloquear, se resuelve entonces con una ruta del servidor o una función `SECURITY DEFINER` (migración aparte).

Dos cosas que descubrí y que no cambian la recomendación (para que decidas):
1. **La llave primaria es solo `user_id`**: una persona solo puede estar bloqueada en un box a la vez, y si ya lo estaba en otro, el bloqueo nuevo no se guarda pero la ruta responde "ok". Hoy cada persona pertenece a un box, así que el riesgo es bajo. Si algún día hay personas en varios boxes, hace falta una migración chica (llave `box_id + user_id`).
2. **"Bloquear" solo oculta sus publicaciones del feed del box.** No le impide publicar ni comentar, no oculta sus comentarios y sus publicaciones siguen apareciendo en su perfil. Si esperabas que bloquear también impida publicar o comentar, es un cambio aparte (también sin migración).

## 4. Qué cambia en la app y qué se elimina

- `community.tsx`: se quita el import de `getAdminToken` y la propiedad `adminCode` de los 3 componentes y de la pantalla. La opción de moderar se muestra según el rol (`box_admin` o `super_admin` en `adminStatus.roles`, como hoy, **sin exigir token**); el servidor es quien decide de verdad. El bloqueo pasa a llamar a la ruta nueva con el id de la publicación.
- Hooks (`lib/api-client-react/src/social.ts`): `deletePost`, `deleteComment` (publicaciones y avisos) y `blockUser` dejan de recibir `adminCode` y de mandar `X-Admin-Session`.
- Se elimina de la app: el uso del token en la Comunidad (la pieza `adminSession.ts` sigue hasta F7 porque la usan `admin-login` y `admin-dashboard`).
- Verificar antes: que un dueño sin fila `box_admin` aparezca con el rol que la app usa para mostrar el menú (la migración propuesta `20261024_dueno_siempre_box_admin.sql` sigue sin aplicar; si no se aplica, el servidor igual lo reconoce como dueño, pero la app podría no mostrarle el menú).

## 5. Versiones antiguas de la app

- Borrar publicaciones y comentarios: **siguen funcionando** (el servidor ignora el token y usa la sesión; no depende de que la app mande o no el `userId`).
- Bloquear autor: la app antigua llama a la ruta vieja, que queda con token hasta F7; ahí deja de funcionar ("No se pudo bloquear").
- Entrar al área de administración con el PIN del servidor: sigue igual hasta F7; cuando F7 retire las rutas `/admin/pin/*`, una versión antigua **ya no podrá abrir el panel** hasta actualizarse. Pregunta para ti: ¿hay personas con versiones antiguas aparte de tus teléfonos de prueba? Si no, F7 no necesita período de convivencia.

## 6. Matriz de pruebas (producción, cuentas y cajas desechables, sin tocar datos reales)

Rutas: borrar publicación ajena, borrar comentario ajeno, borrar comentario de aviso ajeno, bloquear autor. Todo con datos desechables, limpiados al final.

| Quién | Antes (hoy, sin token) | Antes (hoy, con token del PIN) | Después de F2 (solo sesión) |
|---|---|---|---|
| Autor (su propio contenido) | OK | OK | OK |
| Alumno del mismo box, no autor | 403 | 403 | 403 |
| Coach del mismo box | 403 | 403 | 403 |
| Administrador del mismo box | **403** | OK | **OK** |
| Dueño del mismo box | **403** | OK | **OK** |
| Administrador de otro box | 403 | 403 | 403 |
| Super admin, interruptor apagado | 403 | OK (según token) | OK |
| Super admin, interruptor encendido, aal1 | 403 | 403 | 403 |
| Super admin, interruptor encendido, aal2 | 403 | OK | OK |
| Sin sesión | 401 | 401 | 401 |
| Alumno con un `X-Admin-Session` ajeno o falso | — | — | 403 (el token no concede nada) |

Bloquear autor, además: no se puede bloquear a uno mismo (400), ni a alguien que no es autor de esa publicación (404), ni desde una publicación de otro box (403); el administrador de otro box no puede desbloquear (0 filas). Más: el feed oculta al autor bloqueado solo en ese box; versiones antiguas (con cabecera) siguen borrando.

**Checklist corta para tu teléfono:** (1) con tu cuenta de administrador, sin entrar al área de administración ni poner PIN, abre una publicación ajena de una cuenta de prueba, borra la publicación y confirma que desaparece; (2) borra un comentario ajeno; (3) bloquea al autor de prueba y confirma que sus publicaciones ya no salen en el feed; (4) con una cuenta de alumno normal, confirma que no aparecen "Eliminar" ni "Bloquear" en publicaciones ajenas.

## 7. Cómo F2 deja a F7 listo

Después de F2 el token deja de usarse para moderar. Quedan estos consumidores: `POST /admin/dash-link` (se pasa a sesión + rol, **fase F2b, commit propio**, con los endurecimientos de la sección 4 de `PLAN-REUBICACION-ADMIN.md`), las 4 rutas `/admin/pin/*`, `/admin/social/reports*`, `/admin/contract-acceptances*` y `/admin/settings/box-name` (estas tres últimas solo las usaba `more.tsx`, ya eliminada, y las versiones antiguas). Con F2 y F2b hechas, F7 es solo eliminar y crear el candado local.

Orden de commits de F2: **F2a** servidor (rutas con sesión + rol + box, ruta nueva de bloqueo; typecheck, matriz, `check:super-admin-inlining` no aplica porque no hay migración), **F2b** `dash-link` por sesión, **F2c** app (`community.tsx` y hooks).

---

# Esbozo de F7 — eliminar el token y las rutas `/admin/*`, y crear el candado local

**Se elimina**
- Servidor: las rutas `/admin/pin/{status,setup,verify,session}`, `/admin/social/reports*`, `/admin/contract-acceptances*`, `/admin/settings/box-name` y las rutas antiguas de bloqueo; `adminToken.ts` (firma y verificación del token), `pinHash.ts`, la cabecera `X-Admin-Session` y de `adminAccess.ts` lo que dependía del token (`resolveAdminAccess`, `requireAdminAccess`, `canManageBox`, `manageScope`, `boxForNewToken`; se conserva `resolvePanelAccess`, que es la base de F2).
- Especificación y cliente: los esquemas de `api-spec`/`api-zod` y los hooks generados de esas rutas (`useAdminPin*`, `useListAdminContractAcceptances`, `useAckContractAcceptances`) más `useAdminBoxName` y `useAdminSocialReports` (ya sin uso desde F6); se regenera el código.
- App: `lib/adminSession.ts`, la limpieza del token en `AuthContext`, las partes de `admin-login.tsx` que hablan con el PIN del servidor y **la pantalla de contraseña de respaldo**, y el encabezado `X-Admin-Session` de `admin-dashboard.tsx`. Se ajusta `check-pressed-opacity` si desaparece algún botón de la lista.
- Con tu OK, aparte: la tabla `admin_pins` (migración) y la variable `ADMIN_ACCESS_CODE` en Render (era el secreto de firma del token; verificar que nada más la use).

**Se crea**
- El candado local: un módulo `lib/adminLock.ts` (PIN con hash y sal en SecureStore, clave por cuenta; contador de errores y espera creciente persistidos; reloj de segundo plano), una pantalla de crear/ingresar PIN con teclado numérico (reutiliza `PinField`) y el atajo de huella o rostro. Se usará el mismo método ya probado para el azar/hash del inicio de sesión (la trampa de `getRandomValues` de Hermes está documentada en `CLAUDE.md`). En la versión web no hay SecureStore: ahí no habría candado (a confirmar).
- Al cerrar sesión se borra el candado de esa cuenta: es lo que hace funcionar "Olvidé mi PIN".

**Orden de commits (uno cada uno)**
1. **F7-a** app: candado local conectado al botón "Administrador" (el panel se abre sin pedir token; el PIN viejo deja de usarse).
2. **F7-b** servidor: eliminar las rutas `/admin/*`, el token y `pinHash.ts`; regenerar spec, zod y cliente.
3. **F7-c** limpieza de código sin uso (hooks, `adminSession.ts`, textos) y de las listas de los checks.
4. **F7-d** (solo con tu OK) migración que borra `admin_pins` y retiro de `ADMIN_ACCESS_CODE` en Render.

**Pruebas**
- Servidor: las rutas eliminadas responden 404; la matriz de F2 y la de `dash-link` siguen pasando; el servidor arranca sin `ADMIN_ACCESS_CODE`.
- Candado: pruebas del hash, del contador, de la espera creciente y de "olvidé mi PIN" (borrado al cerrar sesión), sin necesitar matriz de rol y box porque no autoriza; typecheck, `expo export` y `check:pressed-opacity`.
- Teléfono (checklist corta): crear PIN la primera vez; abrir el panel desde el menú pidiendo PIN; volver tras el tiempo en segundo plano; 5 errores y espera; huella como atajo; cerrar sesión y volver a entrar crea un PIN nuevo.

---

# Decisiones de Pía (2026-10-25) y cómo se evita que reiniciar la app reinicie el contador

**Aprobado:** F2 en el orden F2a servidor, F2b `dash-link`, F2c app (un commit cada uno). Bloqueo en el servidor, sin migración y con la semántica de hoy; pendientes anotados en `ESTADO.md` (llave primaria solo por `user_id`; no hay desbloqueo) y pantalla "Autores bloqueados" en la lista de F5 (y F9). Pregunta abierta: ¿un bloqueado debe poder publicar o comentar? No hay versiones antiguas que cuidar. Candado local: PIN de 6 dígitos, creación obligatoria la primera vez, un candado por cuenta, esperas de 30 s, 1, 5, 15 y 30 min (tope), y se pide **cada vez que se abre el panel desde el menú** además de tras 2 minutos en segundo plano.

**Cómo el contador sobrevive a un reinicio**
1. El contador de errores y la hora hasta la que dura la espera se guardan en **SecureStore** (Keychain en iPhone, Keystore en Android), junto al hash del PIN y cifrados igual. No viven en memoria ni en un archivo común; la interfaz solo puede pedirle al módulo "¿puedo intentar?" y "prueba este PIN", nunca leer ni escribir el contador.
2. **Se suma el intento ANTES de comparar el PIN** y se borra solo si el PIN es correcto. Así, matar la app en medio de un intento no regala un intento gratis.
3. La espera se guarda como una **hora absoluta** ("no antes de las 15:42:10"), no como una cuenta regresiva en memoria; al volver a abrir la app se lee de nuevo y se sigue respetando.
4. Si el reloj del teléfono retrocede (alguien lo cambia para saltarse la espera), se guarda también la **hora más alta vista** y se usa el mayor de los dos valores. Adelantar el reloj sí acorta la espera: no se puede evitar sin servidor, y se acepta porque el candado no autoriza nada (la sesión y el rol siguen decidiendo).
5. El candado de una cuenta se borra al cerrar su sesión (es lo que hace funcionar "Olvidé mi PIN"). Reinstalar la app borra también la sesión; para volver a entrar hace falta la contraseña de la cuenta, así que reinstalar no es un atajo para quien no la tiene.
6. Límite honesto: quien tenga el teléfono rooteado y sepa lo que hace puede vaciar SecureStore; el candado protege contra el teléfono prestado, no contra un ataque con herramientas.
