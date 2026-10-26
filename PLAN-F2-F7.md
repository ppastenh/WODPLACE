# Plan F2 (moderación sin token) y esbozo de F7 (candado local con PIN)

Fecha: 2026-10-25. Solo plan: no se ha tocado código. Espera el OK de Pía.

## Decisión de Pía sobre el PIN (2026-10-25)

> **Prevalece la sección "F7-a (versión final)" al final de este documento.** Corrige un hueco de este texto inicial: "Olvidé mi PIN = cerrar sesión y volver a entrar" no basta; crear un PIN nuevo exige la verificación del propio teléfono. También fija: desde el 6.º error cada fallo sube un escalón, PIN fáciles rechazados, teléfono sin bloqueo de pantalla solo con aviso, y web sin candado.

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


---

# F7-a (versión final, revisada por Pía el 2026-10-25): candado local con PIN

Contexto: F2a, F2b y F2c ya quitaron el token de la moderación y de `dash-link`. Hoy la app todavía pide el PIN del servidor en `admin-login.tsx` y guarda un token en memoria (`lib/adminSession.ts`) que `admin-dashboard.tsx` exige para abrir el panel. F7-a reemplaza esa puerta por el candado local, sin tocar el servidor (eso es F7-b, que tendrá su propio plan con el inventario por grep de cada ruta `/admin/*` y cada hook a eliminar).

## 0. CORRECCIÓN DE DISEÑO OBLIGATORIA (Pía, 2026-10-25)
**El hueco:** "Olvidé mi PIN = cerrar sesión y volver a entrar" se salta el candado justo en el caso para el que existe: con el teléfono prestado y desbloqueado, volver a entrar con Google es un toque (la cuenta ya está en el teléfono), y quien lo haga podría crear un PIN nuevo y entrar al panel.

**La corrección:** crear o reemplazar el PIN (la primera vez y después de "Olvidé mi PIN") **exige la autenticación del propio dispositivo** (huella, rostro o el desbloqueo del teléfono, con respaldo de la credencial del dispositivo) **cuando el teléfono tiene bloqueo de pantalla**. Si no lo tiene, se avisa que el candado es débil y se permite. Cerrar sesión ya no basta: el PIN nuevo también la exige.

Cómo se aplica:
- La verificación se pide **al tocar "Guardar PIN"** (después de escribir y repetir el PIN), no al entrar a la pantalla, y vale para **una sola operación**: no queda un permiso que otra acción pueda reutilizar.
- En la lógica, crear el PIN primero valida formato y fuerza (sin pedir nada al sistema), luego mira el nivel de seguridad del teléfono, y solo si la verificación sale bien escribe el registro. Si se cancela o falla, el almacenamiento queda intacto.
- La función de crear **se niega si ya existe un registro** (legible o no): no hay "reemplazar" por esa vía; el único camino para borrar es cerrar sesión (o "Olvidé mi PIN", que cierra sesión), y el nuevo PIN vuelve a exigir la verificación del dispositivo.
- El atajo de huella para **entrar** (no para crear) usa solo biometría, **sin** respaldo de credencial del teléfono: así quien conozca el código del teléfono (por ejemplo, alguien de la familia) no abre el panel con él. Para **crear** sí se acepta la credencial del dispositivo, porque quien no tiene biometría la necesita.

### Otros caminos que se saltarían el candado, y cómo quedan cubiertos
| Camino | Cómo queda |
|---|---|
| Cerrar sesión + Google + crear PIN nuevo | **Cubierto** por la corrección: crear PIN exige la verificación del dispositivo. |
| Abrir el panel por un enlace profundo o con "atrás" sin pasar por el PIN | `admin-dashboard` exige un permiso de entrada en memoria, de un solo uso, que solo concede el candado; sin permiso redirige a `admin-login`. Prueba en F7-a2. |
| Matar la app para reiniciar el contador de errores | **Cubierto**: el contador vive en SecureStore y el intento se suma antes de comparar. |
| Retroceder el reloj para saltarse la espera | **Cubierto**: hora más alta vista; con el reloj atrás la espera no avanza (la salida es "Olvidé mi PIN"). Adelantar el reloj sí acorta la espera: no se puede evitar sin servidor. |
| Dos intentos simultáneos para esquivar el contador | **Cubierto**: los intentos se atienden en cola. |
| Registro dañado o ilegible para forzar "crear PIN" | **Cubierto**: ilegible nunca ofrece crear; solo reintentar u "Olvidé mi PIN". |
| Atajo de huella con el código del teléfono | **Cubierto**: el atajo es solo biometría. |
| Teléfono sin bloqueo de pantalla (crear PIN sin verificación) | **No se puede cubrir**: se avisa que el candado es débil y se permite (decisión de Pía). |
| Sesión de la WebView del panel que sigue guardada | La WebView solo se abre desde `admin-dashboard`, detrás del permiso; el panel se vuelve a abrir con un enlace nuevo (`dash-link`), que pide la sesión de la app. |
| Vista previa del panel en el selector de apps del teléfono | **No cubierto** en F7-a (opción futura: ocultar el contenido en el selector con `FLAG_SECURE`; requiere decisión y posiblemente un cambio nativo). |
| Teléfono con root, o copiar el registro para adivinar el PIN sin conexión | **No cubierto**: el PIN tiene un millón de combinaciones; lo protegen SecureStore y el contador. |
| Usar la app como la dueña en vista de alumno con el teléfono abierto | Fuera de alcance del candado (no es el panel). |

## 1. Dependencias y compilación del teléfono (verificado)
- `expo-crypto ~57.0.3` y `expo-local-authentication ~57.0.2` ya están en `artifacts/wodplace/package.json`, junto con `expo-secure-store ~57.0.4`. **No se agrega ninguna dependencia.**
- Compilaciones de desarrollo de EAS (Android, perfil `development`): 2026-10-02 (commit 9e69958), 2026-10-14 14:35 UTC (c52ad55) y **la última, 2026-10-14 16:30 UTC (0beb9ac)**. En ese commit ya estaban `expo-crypto`, `expo-local-authentication` y `expo-dev-client`. `expo-secure-store` y su plugin se agregaron al código después (commit 25fbd53), pero ESTADO.md registra que esa compilación se probó en el teléfono con la sesión cifrada, así que se hizo con esos cambios en el árbol de trabajo.
- Pruebas en vivo de que los módulos están en el teléfono: `expo-crypto` lo usa el cifrado de la sesión (`secureSessionCrypto.ts`), `expo-secure-store` guarda la clave de la sesión y `expo-local-authentication` lo importa `admin-login.tsx` (el panel con PIN se probó el 14-oct). Las funciones que se usarán (`getEnrolledLevelAsync`, `authenticateAsync` con `disableDeviceFallback`, `digestStringAsync`, `getRandomValues`) existen en las versiones instaladas, y el módulo declara los permisos de Android que necesita.
- Desde esa compilación no se agregó ningún paquete nativo nuevo a `package.json`. Límite: no puedo inspeccionar el APK instalado en el teléfono; si Pía instaló otra compilación, el chequeo en el teléfono es abrir el panel actual (que ya importa `expo-local-authentication`).
- iPhone: no hay compilación de iOS. Para Face ID habría que agregar el texto de permiso (`NSFaceIDUsageDescription`) con el plugin de `expo-local-authentication` y compilar de nuevo: **queda anotado para cuando exista una compilación de iOS, no ahora**.

## 2. Piezas
1. **`lib/adminLockLogic.ts` (F7-a1, lógica pura):** reglas, escalera de esperas, contador, formato y validación del registro, fuerza del PIN, verificación del dispositivo para crear, atajo biométrico, bloqueo por segundo plano. Recibe todo lo externo por parámetros (almacenamiento, reloj, hash, azar, verificación del dispositivo), por eso se prueba en el computador sin teléfono.
2. **`lib/adminLock.ts` (F7-a2):** conecta la lógica a SecureStore (clave `wodplace.adminLock.<id de la cuenta>`), `expo-crypto` y `expo-local-authentication`.
3. **`lib/adminUnlock.ts` (F7-a2, reemplaza `adminSession.ts`):** permiso de entrada en memoria, de un solo uso.
4. **`components/AdminLockPrompt.tsx` (F7-a2):** las pantallas de abajo.

El registro guarda: versión, sal, hash, vueltas, intentos fallidos consecutivos, "no antes de" (hora absoluta), hora más alta vista, si la huella está activada y si se creó en modo débil (sin bloqueo de pantalla). No se expone el contador a la interfaz.

## 3. Reglas
- PIN de **6 dígitos**; creación obligatoria la primera vez; un candado por cuenta.
- Se pide **cada vez** que se abre el panel desde el menú, y tras **2 minutos** en segundo plano (si el reloj retrocedió, se bloquea: falla hacia lo seguro).
- **Errores:** los 5 primeros no tienen espera. Desde el 5.º error seguido: **30 s**; 6.º: **1 min**; 7.º: **5 min**; 8.º: **15 min**; 9.º en adelante: **30 min (tope)**. Cada fallo posterior al 5.º sube un escalón. Un PIN correcto reinicia todo. El intento se suma **antes** de comparar. Nunca es un bloqueo permanente.
- **PIN fáciles rechazados** ("Elige un PIN menos fácil de adivinar."): un solo dígito repetido (000000), secuencias ascendentes o descendentes de 1 en 1 (123456, 654321, 890123), y patrones que se repiten cada 2 o 3 dígitos (121212, 123123, 112112).
- **Hash:** sal aleatoria propia + SHA-256 repetido **1000 veces** con `expo-crypto`; comparación sin atajos. Medido en el teléfono de Pía (ver "Medición del hash" más abajo).
- **Teléfono sin bloqueo de pantalla:** solo se avisa; no se niega la entrada; no se ofrece la huella.
- **Web:** sin candado.

## 4. Pantallas y textos (tuteo)
1. **Crear PIN** (primera vez, obligatorio). Título "Crea tu PIN del panel". Texto: "Es un candado de este teléfono: protege el panel si alguien usa tu teléfono con la app abierta. No reemplaza tu contraseña." Campos "Elige un PIN de 6 dígitos" y "Repite tu PIN". Botón "Guardar PIN". Al tocarlo aparece la verificación del teléfono con el título "Confirma que eres tú" y el texto "Para guardar tu PIN del panel".
   - Errores del PIN: "El PIN debe tener 6 dígitos." · "Los PIN no coinciden." · "Elige un PIN menos fácil de adivinar." · "No se pudo guardar el PIN en este teléfono. Reintenta."
   - **Si cancelas la verificación:** "Cancelaste la verificación. Para guardar tu PIN debes confirmar que eres tú con tu huella, tu rostro o el desbloqueo de este teléfono." (botón "Reintentar")
   - **Si la verificación falla:** "No pudimos confirmar que eres tú. Reintenta." (botón "Reintentar")
   - **Si el sistema te bloquea por demasiados intentos:** "Hiciste demasiados intentos. Usa el desbloqueo de tu teléfono o vuelve a intentarlo en un rato."
   - **Si el teléfono no puede verificar en este momento:** "Este teléfono no puede verificar tu identidad ahora. Reintenta más tarde."
   - **Aviso si el teléfono no tiene bloqueo de pantalla** (no impide guardar): "Este teléfono no tiene bloqueo de pantalla, así que no podemos confirmar que eres tú. El candado es débil: quien use tu teléfono podría crear su propio PIN. Te recomendamos activar un bloqueo de pantalla en los ajustes del teléfono."
2. **Activar huella o rostro** (después de crear el PIN, solo si el teléfono tiene biometría configurada). "¿Quieres entrar con tu huella o tu rostro?" Botones "Activar" y "Ahora no".
3. **Ingresar PIN.** Título "Ingresa tu PIN", subtítulo "Panel de administración". Error: "PIN incorrecto. Te quedan N intentos antes de una espera." Enlaces "Usar huella o rostro" (si está activada) y "Olvidé mi PIN".
4. **Espera.** "Demasiados intentos. Vuelve a intentar en m:ss." Al terminar vuelve a "Ingresar PIN".
5. **Bloqueo tras 2 minutos en segundo plano** (superposición sobre el panel, que queda detrás sin perder su estado). "Panel bloqueado. Ingresa tu PIN para continuar."
6. **Olvidé mi PIN.** "¿Olvidaste tu PIN?" · "Para crear uno nuevo debes cerrar sesión, volver a entrar y confirmar que eres tú con el desbloqueo de tu teléfono. Al cerrar sesión se borra el PIN de este teléfono." Botones "Cerrar sesión" y "Cancelar".
7. **PIN ilegible.** "No pudimos leer el PIN guardado en este teléfono." con "Reintentar" y "Olvidé mi PIN". Si el registro no se puede leer, **no** se ofrece crear un PIN nuevo.

## 5. Qué pasa al cerrar sesión
- Cerrar sesión a propósito (menú) **borra el candado de esa cuenta** y el permiso de entrada. Los candados de otras cuentas en el mismo teléfono no se tocan.
- Al volver a entrar y abrir el panel, se crea un PIN nuevo (pantalla 1) y **eso exige la verificación del teléfono** (sección 0).
- Si la sesión se cierra sola (vence o se revoca), el candado **se conserva**: la misma cuenta sigue con su PIN. Solo "Cerrar sesión" a propósito y "Olvidé mi PIN" lo borran.
- Quien tenga el teléfono abierto puede cerrar sesión, pero no obtiene el panel: para volver a entrar necesita la contraseña o Google, y para crear el PIN necesita la verificación del teléfono.

## 6. Teléfono sin bloqueo de pantalla
- Se detecta con el nivel de seguridad del sistema (`getEnrolledLevelAsync`: ninguno / PIN, patrón o contraseña / biométrico).
- Android: el almacenamiento seguro funciona igual (clave en el Keystore). iPhone: el Keychain guarda sin protección extra. No se usa la opción de exigir autenticación del sistema al leer.
- La app no lo bloquea: muestra el aviso de la pantalla 1, marca el registro como débil y no ofrece la huella. El candado es una capa de comodidad y no puede obligar a proteger el teléfono.

## 7. Orden de commits (cada uno revertible)
1. **F7-a1:** `adminLockLogic.ts` + pruebas automáticas, sin conectar a ninguna pantalla. **Se puede empezar ya.**
2. **F7-a2:** `adminLock.ts`, `adminUnlock.ts`, `AdminLockPrompt.tsx`; `admin-login.tsx`, `admin-dashboard.tsx` y `AuthContext.tsx` pasan al candado; se retira `adminSession.ts`. **Solo cuando Pía lo apruebe.** Typecheck, `expo export` de Android, `check:pressed-opacity`.
3. **F7-b** (plan aparte): eliminar rutas `/admin/*`, token y hooks, con inventario por grep.

## 8. Cómo se ejecutan las pruebas automáticas (sin agregar dependencias)
El repositorio no tiene corredor de pruebas y no se agrega uno. Se usa el corredor **integrado en Node 24** (`node:test` y `node:assert`) ejecutado con `tsx`, que ya es dependencia de `scripts/`:
- Archivo `scripts/src/test-admin-lock.ts`; comando `pnpm --filter @workspace/scripts test:admin-lock` (que ejecuta `tsx --test`).
- La lógica no importa nada de React Native ni de Expo, así que corre en Node. Almacenamiento, reloj, azar, hash y verificación del dispositivo se reemplazan por versiones falsas en la prueba (un "reinicio" se simula creando de nuevo el módulo sobre el mismo almacenamiento falso).
- `scripts/tsconfig.json` pasa a `rootDir` en la raíz del repositorio e incluye ese único archivo de la app, para poder revisar sus tipos; no cambia nada más.

**Casos que cubren las pruebas de F7-a1:**
- Crear PIN: con bloqueo de pantalla, **pide la verificación del dispositivo antes de escribir**; si se cancela, falla, hay bloqueo del sistema o no está disponible, **el almacenamiento queda intacto** y el estado devuelto es el correcto; sin bloqueo de pantalla, se permite y el registro queda marcado como débil; crear es una sola operación (cada creación pide su propia verificación); **se niega si ya hay un registro** (legible o no); PIN débil o mal formado se rechaza **sin pedir la verificación**.
- Escalera de esperas: 5 errores → 30 s; 6.º → 1 min; 7.º → 5; 8.º → 15; 9.º y siguientes → 30 min; un PIN correcto reinicia; durante la espera no se prueba el PIN ni se gasta un intento.
- Contador: sobrevive a un "reinicio"; el intento se suma antes de comparar (si el proceso "muere" justo después de sumar, el intento cuenta); dos intentos simultáneos se atienden en cola.
- Reloj: retroceder no acorta la espera; avanzar sí; bloqueo por segundo plano (justo en el límite, antes del límite, con el reloj atrás).
- Registro: ilegible, versión desconocida o campos inválidos → estado "ilegible" sin modificar nada, y no se puede crear encima; aislamiento entre cuentas; borrar solo la cuenta que sale.
- Atajo biométrico: solo si está activado y el teléfono tiene biometría; **usa biometría sin respaldo de credencial**; no cambia el contador; sin biometría no se puede activar.
- Fuerza del PIN: 000000, 111111, 123456, 654321, 890123, 121212, 123123, 112112 rechazados; 135790, 482915 aceptados.
- Hash: misma entrada y misma sal dan el mismo hash; sal distinta, hash distinto; comparación sin atajos.

**No se puede probar sin teléfono (checklist de F7-a2):** SecureStore real, la verificación real del sistema (huella, rostro y credencial del teléfono), el comportamiento en segundo plano y el teléfono sin bloqueo de pantalla.

**Checklist corta de teléfono (F7-a2):** (1) primer ingreso: crear el PIN, confirmar con el desbloqueo del teléfono y entrar; (2) cancelar la verificación: debe verse el mensaje y no guardar nada; (3) cerrar y reabrir el panel desde el menú: pide el PIN cada vez; (4) 2 minutos en segundo plano: vuelve con el candado y el panel detrás; (5) 5 errores: espera de 30 s, y matar la app no la reinicia; (6) activar la huella y entrar con ella; (7) "Olvidé mi PIN": cerrar sesión, volver a entrar con Google y comprobar que **crear el PIN pide la verificación del teléfono**; (8) si hay un teléfono sin bloqueo de pantalla: ver el aviso.

## 9. Riesgos
- Quien tenía PIN del servidor crea uno nuevo la primera vez (no se migran).
- Si se olvida el PIN, la salida es cerrar sesión, volver a entrar y confirmar con el teléfono.
- Con el reloj muy atrasado la espera puede no avanzar hasta que el reloj vuelva a la hora real; la salida es "Olvidé mi PIN".
- En iPhone el Keychain puede conservar el registro al reinstalar; es inofensivo y "Olvidé mi PIN" lo limpia.

---

# Medición del hash del PIN y decisión (2026-10-26)

**Medición en el teléfono de Pía** (modo desarrollo; el JavaScript de desarrollo corre más lento que el de producción, así que las cifras son pesimistas):

| Vueltas | Tiempo |
|---|---|
| 1000 | 774 ms (mín 593, máx 1474) |
| 5000 | 8589 ms |
| 20000 | 29780 ms |
| 50000 | 54280 ms |

Cada vuelta cuesta cerca de 1 ms, casi todo por el cruce al módulo nativo de `expo-crypto`. El valor más alto que baja de 1 segundo es **1000**.

**Decisión de Pía:** se dejan **1000 vueltas** y se **cancela el re-hasheo automático** (subir las vueltas no cambia la seguridad real frente a un PIN de 6 dígitos). La pantalla de medición se borró y no se commiteó.

**Límite honesto:** si alguien obtiene una copia del registro con acceso total al teléfono, un PIN de 6 dígitos (un millón de combinaciones) se adivina sin conexión en segundos, con 1000 vueltas o con 50000. Lo que realmente protege es: SecureStore (Keychain en iPhone, Keystore en Android) que impide leer el registro sin acceso total al teléfono; el contador de errores con espera creciente; y la verificación del teléfono al crear o reemplazar el PIN. El candado no autoriza nada: lo que decide es el servidor.

**Por qué el registro guarda las vueltas:** el número de vueltas va dentro del registro de cada cuenta. Si algún día se agrega un módulo nativo de derivación de claves (por ejemplo PBKDF2 o scrypt, que exige una compilación nueva de la app), se podrá cambiar el método sin invalidar los PIN ya creados.
