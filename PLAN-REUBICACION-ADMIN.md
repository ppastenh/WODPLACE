# Plan (v2): sacar las listas y ajustes de administración de "Más" y llevarlos al panel del box

**Solo plan. No se implementa nada hasta cerrar el incidente** (push, matriz en producción y apagado del interruptor). Escrito para Pía. Revisado en el código y en la base real el 2026-10-23. Esta versión incorpora tus respuestas: el panel se sigue abriendo dentro de la app; la moderación se queda en la publicación; "Mensajes a WODPLACE" ya existe.

## 1. Cómo funciona hoy "Ayuda y soporte" del panel (solo lectura)

**Lo que ve el administrador (box-admin, Más → "¿Necesitas ayuda? Escríbenos", archivo `more/reports.tsx`)**
- Un cuadro de texto (obligatorio) y "Adjuntar captura (opcional)". Un botón **Enviar reporte** (desactivado si el texto está vacío). Abajo, "Mis reportes anteriores" con fecha y estado Pendiente/Resuelto (solo los suyos).
- Texto de la pantalla: "Le llega directo al equipo de WODPLACE, no es visible para tus atletas". (Ojo: usa voseo, "Reportá", "Contanos": va contra la regla de tuteo del proyecto.)

**A dónde va cada reporte**
- Directo desde el navegador a la tabla **`support_reports`** de Supabase. **No pasa por el servidor, no usa Resend, no hay correo a info@ ni notificación de ningún tipo.** La captura se sube al almacenamiento `wodplace-uploads` (carpeta `support/<id del administrador>/`), que es **público**: cualquiera con el enlace la ve.
- Datos que se guardan: id del administrador, **su correo**, id del box, el texto, el enlace de la captura, fecha. No guarda nombre ni teléfono. Un reporte puede traer datos personales de alumnos si el administrador los escribe o aparecen en la captura.

**Límites contra abuso: prácticamente ninguno**
- Sin límite de envíos, sin límite de largo del texto, sin trigger. El límite de 8 MB de la captura se revisa solo en el navegador; el almacenamiento no tiene límite de tamaño ni de tipo de archivo. La política de subida solo exige ser administrador de algún box y que la carpeta sea `support/`.
- La política de inserción no comprueba que el `box_id` enviado sea el box del administrador (un administrador podría rotular su reporte con otro box).

**Quién lo lee del lado de WODPLACE**
- Super admin tiene la pestaña **Soporte** (`super-admin/support.tsx`): lista todos los reportes de todos los boxes, separados en pendientes y resueltos, con nombre del box, correo, fecha, texto y captura, y un botón **Marcar como resuelto** (guarda quién y cuándo).
- No tiene contador ni aviso: hay que abrir la pestaña para enterarse. Hoy la tabla está **vacía (0 reportes)**.
- RLS: el administrador inserta y lee solo los suyos; solo super admin lee todos y resuelve.

## 2. Estructura propuesta del panel de box (con tus cambios)

**Comunidad** (junto a Avisos y WOD del día):
- **Reportes de Comunidad**: publicaciones y comentarios reportados; ver el texto, resolver el reporte, borrar la publicación o el comentario. Sin sección "Moderación" aparte. La campana de la app apunta aquí.

**Ayuda y soporte** se divide en dos bandejas:
| Nombre propuesto | Qué es | Quién escribe → quién lee |
|---|---|---|
| **Buzón de alumnos** | Problemas o consultas de los alumnos al administrador de su box (función NUEVA, ver F9) | Alumno → administrador o dueño de ese box |
| **Contactar a WODPLACE** | La función que existe hoy (`support_reports`) | Administrador → equipo de WODPLACE; la bandeja de lectura vive solo en super admin |

**Nombres decididos por Pía (2026-10-23):** **"Buzón de alumnos"** (de los alumnos al administrador o dueño) y **"Contactar a WODPLACE"** (del administrador al equipo; en super admin su bandeja se puede llamar **"Bandeja de soporte"**). Aparte: la ruta actual del panel se llama `reports`, lo que se confunde con "Reportes de Comunidad"; al reordenar conviene renombrarla (`soporte`).

## 3. El PIN: opciones (sin decidir)

Hoy el PIN (6 dígitos, 5 intentos y 15 minutos de bloqueo) es el paso que **emite el token de administrador**: es una autorización, y el incidente mostró que no debe serlo (la sesión y el rol ya la dan).

| Opción | Cómo funciona | Pros | Contras |
|---|---|---|---|
| **A. Candado local del teléfono** (sin autorización) | Se conserva el PIN, pero guardado solo en el teléfono: se pide al abrir el área de administración o tras unos minutos sin uso. El servidor no lo valida y no hay token. | Protege si el teléfono queda desbloqueado o prestado; los administradores ya conocen el PIN; no depende del servidor | Solo protege la pantalla (la sesión sigue abierta); si se reinstala, se pierde y hay que crearlo de nuevo; código local que mantener |
| **B. Retirarlo** | Se elimina el PIN y las 4 rutas `/admin/pin/*`; la sesión de Supabase y el rol bastan | Menos código y menos superficie; menos fricción; sin tabla `admin_pins` que cuidar | Un teléfono desbloqueado da acceso inmediato al panel; el bloqueo de pantalla del teléfono pasa a ser la única barrera |
| **C. Biometría del sistema en vez de PIN propio** | Al abrir el panel, la app pide huella o rostro del sistema | No guarda ningún PIN; es lo que los usuarios esperan en el móvil | Requiere una dependencia nativa nueva (necesita tu aprobación y una nueva versión de la app); no hay equivalente en el navegador |

### Qué implicaría retirar el PIN del servidor y dejar un candado local opcional (solo con lo que ya existe en la app)
La app ya tiene `expo-secure-store` (guarda la sesión cifrada) y `expo-local-authentication` (ya la usa `admin-login` para huella o rostro): **no hace falta ninguna librería nativa nueva ni una versión nativa nueva de la app** por esa parte.
- **Servidor:** se eliminan las 4 rutas `/admin/pin/{status,setup,verify,session}`, sus esquemas en `api-spec`/`api-zod` y los hooks generados de `api-client-react` (hay que regenerar el código). La tabla `admin_pins` queda sin uso y no se borra sin tu OK. Ya no hay bloqueo de 15 minutos del lado del servidor ni "olvidé mi PIN" por servidor.
- **Candado local:** opcional, se activa desde la app. Un PIN guardado como hash con sal en SecureStore (clave nueva, no toca la de la sesión) y/o la huella o el rostro que ya se usan; contador local de intentos y bloqueo temporal; se pide al abrir el panel dentro de la app y tras unos minutos en segundo plano.
- **Qué protege:** solo la pantalla, ante un teléfono desbloqueado o prestado. **No autoriza nada**: la sesión de Supabase, el rol y el box siguen siendo lo único que decide en el servidor.
- **Límites:** vive solo en el teléfono (si se reinstala o se borran los datos, se pierde y se crea de nuevo; "olvidé mi PIN" = volver a iniciar sesión con la contraseña); si el teléfono está rooteado no es una barrera fuerte; no existe en la versión web (SecureStore no funciona ahí). Los PIN actuales no se migran: cada administrador crea el candado si lo quiere.
- **Pruebas:** del hash, del contador y del bloqueo temporal (pruebas locales y en teléfono); no necesita matriz de rol y box porque no autoriza.
- **Orden:** va después de F2 (cuando `dash-link` y la moderación ya no usan token) y puede hacerse junto con F7.

En cualquier opción el PIN deja de emitir tokens. La tabla `admin_pins` no se borra sin tu OK.

## 4. Evaluación de `POST /admin/dash-link` (se mantiene)

Genera un enlace de un solo uso que entra al panel sin segunda contraseña. Hoy ya exige sesión verificada, token de la misma cuenta y rol de panel. Endurecimientos que recomiendo (todos chicos, con prueba por rol):
1. **Atarlo a la sesión, no al PIN:** exigir sesión + rol de administración de box (no solo "staff"), sin token de administrador (así sobrevive cuando se elimine el token).
2. **Generar el enlace para la propia cuenta verificada** (por id de Supabase), no por coincidencia de correo entre `wodplace_users` y `profiles`, que es el eslabón débil del puente actual.
3. **Super admin:** para el destino "super" exigir `isSuperAdminAuthorized` (aal2 cuando el interruptor está encendido); hoy basta tener el rol (el panel igual exige aal2 al entrar, pero el enlace no debería ofrecerse).
4. **Límite de uso:** máximo unos 10 enlaces por minuto por cuenta.
5. **Vigencia corta** del enlace en la configuración de Supabase Auth (el valor por defecto es 1 hora).
El log ya no escribe el token del enlace.

## 5. Inventario y destino de cada función

| Función (hoy en la app) | Destino | ¿Ya existe en el panel? | ¿RLS la protege por box? | Qué falta | Rutas del servidor |
|---|---|---|---|---|---|
| Lista de **Reportes** de Comunidad (listar, resolver) | Panel → Comunidad → Reportes de Comunidad | No (la campana ya lee la tabla) | **Sí** (leer: staff del box; resolver: administrador del box) | Pantalla nueva | `GET /admin/social/reports`, `PATCH .../resolve`: **se pueden eliminar** |
| **Borrar publicación/comentario** y **bloquear autor** | **Se quedan en la publicación** (app), para administradores y dueños | — | Borrar: **sí** (política UPDATE por box). Bloquear: **no** (`blocked_users` sin políticas) | Rutas protegidas por sesión + rol + box, sin token de administrador (hoy exigen `X-Admin-Session`); migración de políticas para `blocked_users` si se hiciera también desde el panel | `DELETE /social/posts...`, `POST/DELETE /admin/users/:id/block`: **se mantienen**, sin token |
| **Aceptación de contratos** (lista, marcar vistas) | Panel → Contratos | La campana ya lee la tabla; falta la lista | **Sí** | Pantalla nueva | `GET /admin/contract-acceptances`, `POST .../ack`: **se pueden eliminar** |
| **Nombre del Box** | Panel → Ajustes (por box) | Hay pantalla de ajustes | **Sí** (`box_settings` por box) | Un solo origen del nombre (propongo `boxes.name`) | `PUT /admin/settings/box-name`, `GET /settings/box-name`: **se pueden eliminar** |
| **Acuerdo de Plataforma** (ver y aceptar) | Panel → Contratos del dueño | Super admin tiene `agreements.tsx`; falta la vista del dueño | Parcial: hoy solo super admin lee las aceptaciones | Política para que el dueño vea la suya + guardia en el servidor del panel (sección 6) | `/platform-agreement/*` (con sesión): se mantienen |
| Abrir el panel dentro de la app | **Se mantiene** (WebView con enlace de un solo uso) | Sí | — | Endurecer `dash-link` (sección 4) | `POST /admin/dash-link`: **se mantiene** |
| PIN | Sección 3 | — | — | Decisión | `/admin/pin/*`: depende de la decisión |

**Cuando todo lo anterior esté hecho**, el token de administrador (`X-Admin-Session`, `adminToken.ts`, `adminAccess.ts` con su verificación de token) deja de usarse y se elimina; queda solo "sesión + rol + box".

## 6. Cómo se exigiría el Acuerdo de Plataforma en el servidor del panel
1. En la ruta protegida del panel (`_authenticated/_admin`), una comprobación **en el servidor** (Cloudflare Workers) lee con la sesión del usuario si es dueño o `box_admin` y si aceptó la versión vigente (`platform_agreement_acceptances` + `platform_agreement_document_versions`). Si no, redirige a "Acuerdo de Plataforma" y no carga el resto.
2. La aceptación sigue pasando por el servidor de la API (`/platform-agreement/accept`, atado a la sesión y a la versión vigente con hash).
3. Falta una política de lectura para que el dueño vea **su propia** aceptación (hoy solo super admin): migración chica, con tu aprobación aparte.
4. Opcional y más fuerte, más adelante: una función de base `has_accepted_current_platform_agreement()` usada en las políticas de las tablas sensibles.

## 7. Fases (cada una con commits revertibles y pruebas por rol y box)
Pruebas de cada fase: cuentas desechables en dos boxes (dueño, administrador del box, administrador de otro box, coach, alumno, y super admin sin y con segundo factor), resultado esperado escrito antes, y repetidas en producción. Reversa: revertir los commits de la fase (cada fase se despliega por separado).

| Fase | Contenido | Depende de | Migración de base |
|---|---|---|---|
| **F0** (hecha en código) | Arreglo del incidente | — | No |
| **F0b** | Push, matriz en producción con el interruptor encendido, apagado del interruptor | Tu OK | No |
| **F1** | Panel: sección **Comunidad → Reportes de Comunidad** (lista, resolver, borrar publicación/comentario por RLS); la campana de la app apunta ahí | F0b | No |
| **F2** | **Moderación en la publicación sin token**: borrar y bloquear protegidos por sesión + rol + box (reemplaza `X-Admin-Session` en esas rutas); incluye endurecer `dash-link` (sección 4, puntos 1 a 4) | F0b | No |
| **F3** | Panel: **Contratos → Aceptaciones** (lista y marcar vistas) | F0b | No |
| **F4** | Panel: **Ajustes → nombre del box** con un solo origen | F0b | No (solo cambio de uso) |
| **F5** | Panel: **Contratos del dueño** con Acuerdo de Plataforma y guardia en el servidor del panel | F0b | **Sí**: política de lectura propia (con tu aprobación aparte) |
| **F6** | App: quitar de "Más" las funciones de administración (queda el acceso al panel dentro de la app); quitar el token de la app | F1, F3, F4, F5 | No |
| **F7** | Servidor: eliminar `/admin/social/reports*`, `/admin/contract-acceptances*`, `/admin/settings/box-name`, y el token de administrador; aplicar la decisión del PIN | F6 | No |
| **F8 — Endurecimiento de soporte (ANTES de usuarios reales)** | Ver sección 7b. Incluye dividir Ayuda y soporte en "Contactar a WODPLACE" (lo que existe, renombrado) y "Buzón de alumnos" (vacío hasta F9), y contador/aviso de pendientes en la bandeja de super admin | F1 | **Sí**: límites, políticas y bucket (con tu aprobación aparte) |
| **F9** | **Mensajes de alumnos** (sección 8) | F8 | **Sí**: tabla nueva con RLS (con tu aprobación aparte) |

**¿Cuándo podría empezar F1?** Apenas el incidente esté cerrado (F0b), porque F1 no necesita cambios de base de datos: las reglas de lectura y de resolución por box ya existen. Estimación: 1 sesión de trabajo más 1 de pruebas por rol y box. F2 y F3 pueden ir en paralelo a F1 si lo prefieres.

## 7b. F8 — Endurecimiento de "Contactar a WODPLACE" (support_reports), antes de usuarios reales
Hoy: bucket de capturas **público**, sin límites, validaciones solo en el navegador (sección 1). Cambios:
1. **Bucket de capturas privado con URLs firmadas** (vigencia corta, p. ej. 10 minutos, generadas solo para super admin al abrir el reporte y para el autor al ver el suyo). Hoy una captura puede mostrar datos personales y cualquiera con el enlace la ve. Las capturas ya subidas (hoy 0 reportes) se migran o se descartan.
2. **Envío por una ruta del servidor** (sesión + rol), no directo desde el navegador, para poder aplicar todo lo siguiente donde no se puede saltar.
3. **Límites de envíos:** por administrador (p. ej. 5 por hora y 10 por día), **por box y por día** (p. ej. 20) y un tope global de pendientes por box; rechazo de textos idénticos repetidos.
4. **Largo máximo del texto** (p. ej. 2.000 caracteres) verificado en el servidor y con restricción en la base.
5. **Tipo y tamaño de la captura verificados en el servidor:** solo imágenes (JPEG, PNG, WebP), máximo 5 MB, verificando el contenido del archivo y no solo la extensión o el tipo que declara el navegador; carpeta fijada por el servidor (no la elige el cliente).
6. **Validar que quien envía es administrador de ese box:** el `box_id` lo pone el servidor desde el rol del que envía (hoy lo manda el navegador y la política no lo comprueba).
7. **Textos en tuteo** en la pantalla del panel y en el resto de las pantallas de soporte ("Reporta", "Cuéntanos", etc.; hoy hay voseo).
8. Pruebas: matriz por rol y box (administrador del box, de otro box, coach, alumno, sin sesión), pruebas de límites (el envío N+1 falla) y de archivos (tipo falso, tamaño excedido, captura de otro usuario).

## 8. F9 — Diseño mínimo de "Buzón de alumnos" (solo diseño)
- **Formulario en la app del alumno** (Perfil o Más → "Escribir a mi box"): categoría (Reserva o clase, Pago o plan, Mi cuenta, Problema con la app, Otro) y texto de hasta 1.000 caracteres. Sin adjuntos en la primera versión.
- **Tabla nueva** `student_messages` por box: id, `box_id`, id del alumno, categoría, texto, estado (nuevo, leído, resuelto), fecha, quién lo leyó/resolvió y cuándo. RLS desde el primer día: el alumno inserta solo en el box del que es miembro y ve solo los suyos; el administrador y el dueño de ese box los ven y cambian el estado; el coach no, y super admin no los lee (es conversación de un box con sus alumnos).
- **Cómo se envía:** por una ruta del servidor con sesión (`assertOwnsAccount`) y no directo desde el teléfono, para aplicar los límites.
- **Notificación al administrador:** aparece en la campana del panel (junto a los otros avisos) y como notificación de la app al dueño. Sin correo en la primera versión.
- **Límite contra abuso:** máximo 3 mensajes por alumno por hora y 10 por día, restricción de largo en la base, rechazo de mensajes idénticos repetidos, y bloqueo para alumnos bloqueados en ese box.
- **Qué se guarda:** categoría, texto, id del alumno, box, fechas y estado. **Qué NO se guarda:** edad ni fecha de nacimiento (nunca se muestra la de un menor), teléfono, correo (el administrador ve el nombre del alumno, no su correo), ubicación ni datos del dispositivo.
- **Privacidad:** solo los lee el administrador o dueño de ese box; se borran si el alumno elimina su cuenta; retención sugerida de 12 meses; el aviso a la campana no incluye el texto del mensaje.
- **Fuera de la primera versión:** respuestas dentro de la app, adjuntos, chat.

## 9. Riesgos
- Las apps ya instaladas con el protocolo antiguo del token dejan de poder moderar hasta actualizarse (ya ocurre con el arreglo del incidente). F2 lo resuelve de fondo.
- F5, F8 y F9 tocan permisos de base: según las reglas del proyecto, relevamiento aparte y tu aprobación antes de aplicar.
- Mientras exista el área de administración en la app, la matriz de rol y box del incidente debe seguir pasando.
