# F1 — "Reportes de Comunidad" en el panel de box (SOLO PLAN, sin código)

Escrito para Pía, 2026-10-24. Primera fase de `PLAN-REUBICACION-ADMIN.md` (orden decidido: F1, F3, F4, F2, F6, F7, luego F5 y F9). **No se escribe código hasta tu OK.** La moderación EN la publicación (borrar y bloquear al autor) se queda en la app por ahora.

## 1. Qué es y qué no es
- **Es:** una lista, en el panel del box, de las publicaciones que los alumnos reportaron, con el texto de la publicación a la vista, para que el administrador descarte el reporte o elimine la publicación con conocimiento.
- **No es (en F1):** bloquear al autor (sigue en la publicación, en la app: la tabla `blocked_users` no tiene reglas para el panel); ningún cambio en la app del alumno ni nueva versión de la app. **Comentarios reportables: NO** (decisión de Pía, 2026-10-24: lo pedido son reportes de PUBLICACIONES; hoy solo se pueden reportar publicaciones). Queda anotado como **idea futura, después del lanzamiento**, sin migración ni cambio de la app, y fuera del alcance de F2.

## 2. Dónde va en el panel
- **Sección:** Más → grupo **Comunidad**, junto a "Avisos" y "WOD del día" (hoy ese grupo tiene esos dos). Nueva entrada **"Reportes de Comunidad"** (icono de bandera), ruta `/more/reportes-comunidad`. Con un contador de pendientes en la entrada.
- **Quién ve la entrada:** administrador del box, dueño y super admin (los que hoy ya ven la lista en la campana: `isAdmin`). El **coach no la ve** (hoy tampoco la ve).
- Pantalla con el encabezado estándar del panel y botón de volver, dos pestañas: **Pendientes** y **Resueltos** (últimos 30 días).

## 3. Qué ve y qué puede hacer cada rol
| Rol | Ve la entrada | Ve los reportes de su box | Descartar | Eliminar publicación | Reportes de otros boxes |
|---|---|---|---|---|---|
| **Dueño** (con su fila `box_admin`, que "aprobar box" ya crea) | Sí | Sí | Sí | Sí | No |
| **Administrador del box** | Sí | Sí | Sí | Sí | No |
| **Coach** | No (se oculta) | No. **Antes de la migración de F1** la base SÍ le dejaba leer `social_reports` (política de lectura para "staff"); con la migración, la base se lo niega | No (la base lo rechaza) | No (la base lo rechaza) | No |
| **Alumno / autor de la publicación** | No existe para ellos | No | No | No | No |
| **Super admin** (con el interruptor aal2 como esté) | Sí | Solo el box que tiene seleccionado en el panel | Sí | Sí | Solo si cambia de box |

## 4. Qué datos se muestran (y cuáles no)
- **De cada reporte:** motivo (Spam / Contenido inapropiado / Otro motivo), quién reportó (nombre) y cuándo, y la foto adjunta del reporte si la hay.
- **De la publicación reportada:** el texto completo, sus fotos, nombre del autor y fecha, y si ya fue eliminada. Si la misma publicación tiene varios reportes, se agrupan ("3 reportes").
- **No se muestra:** correo ni teléfono de nadie, fecha de nacimiento ni edad (nunca, y menos de menores), ni datos del dispositivo. La tabla de reportes no los contiene.
- **Acciones:** **Descartar reporte** (lo marca resuelto; la publicación queda) y **Eliminar publicación y resolver** (borrado lógico de la publicación, que desaparece del feed, y cierra todos los reportes de esa publicación). Ambas piden confirmación. Un texto fijo avisa: "Para bloquear al autor, hazlo desde la publicación en la app".

## 5. Consultas que usa y reglas de la base que las protegen por box
| Acción | Consulta del panel | Regla de la base (RLS) |
|---|---|---|
| Listar pendientes | `social_reports` con la publicación incrustada (`social_posts`), filtrando por `box_id` del box seleccionado y `resolved_at` nulo, más nuevos primero, hasta 50 | `box admin read social_reports`: lectura para staff del box |
| Contador | La misma consulta solo con la cuenta | Igual |
| Listar resueltos | Igual con `resolved_at` no nulo, últimos 30 días | Igual |
| Descartar | `UPDATE social_reports SET resolved_at = ahora` por id y `box_id` | `box admin resolve social_reports`: solo administrador del box o super admin |
| Eliminar publicación | `UPDATE social_posts SET deleted_at = ahora` por id y `box_id`, y luego `UPDATE social_reports SET resolved_at = ahora` de esa publicación | `admin moderate social_posts` y la de reportes: solo administrador del box o super admin |
- **Todas las reglas ya existen: F1 no necesita migración.** El panel además filtra siempre por el box seleccionado (hoy la campana no lo hace: un super admin vería los reportes de todos los boxes mezclados).
- **Invariante a respetar:** la base reconoce al administrador por su fila `box_admin`, no por ser dueño (`boxes.owner_user_id`). "Aprobar box" ya crea esa fila para el dueño; un dueño sin ella vería la lista vacía (probado).

## 6. La campana de la app
- La campana del encabezado nativo de la app **abre el panel dentro de la app** (el cajón de notificaciones del panel), no una pantalla nativa. Por eso F1 **no toca la app ni requiere una versión nueva**.
- Cambio en el panel: en el cajón, la sección "Reportes de comunidad" mantiene el contador y la lista corta, pero **cada fila abre la nueva pantalla** (dentro del mismo panel) y cierra el cajón. Se quita el botón de resolver dentro del cajón: decidir sin ver la publicación no es buen criterio. Además la consulta de la campana se filtra por el box seleccionado.
- La pantalla nativa "Más" de la app (con su propia lista de reportes por el servidor) **sigue funcionando sin cambios** hasta F6 y F7.

## 7. Estados de la pantalla
- **Lista vacía (Pendientes):** icono de visto, "No hay reportes pendientes" y debajo "Cuando un alumno reporte una publicación de tu box, aparecerá aquí." **Resueltos vacío:** "Aún no hay reportes resueltos en los últimos 30 días."
- **Cargando:** tarjetas de esqueleto. **Error:** "No se pudo cargar. Reintentar." **Sin permiso (un coach que entre por el enlace):** "Esta sección es solo para administradores del box."
- Todos los textos en tuteo.

## 8. Matriz de pruebas (dos boxes, cuentas desechables; resultado esperado escrito antes)
**Ya la corrí contra las reglas existentes, sin código nuevo: 28 de 28 correctos** (cuentas desechables en dos boxes, todo borrado). Falta repetirla con el código nuevo y en producción.
| Caso | Esperado |
|---|---|
| Listar box 1: dueño (con fila `box_admin`), administrador del box 1 | Ven el reporte del box 1 con el texto de su publicación |
| Listar box 2: administrador del box 2 | Ve solo el reporte del box 2 |
| Administrador/dueño de OTRO box pide el box 1 (o el 2) | Lista vacía |
| Alumno, autor de la publicación | Lista vacía |
| Super admin con filtro de box / sin filtro | Solo ese box / los de todos los boxes (por eso el panel filtra) |
| Coach | La base le devuelve el reporte (**hallazgo**); la pantalla se lo oculta |
| Descartar: administrador de otro box, coach, alumno, autor, dueño de otro box | 0 filas; el reporte sigue pendiente |
| Descartar: administrador del box | 1 fila; el reporte del otro box no se toca |
| Eliminar publicación: administrador de otro box, coach, alumno, autor por esta vía | 0 filas |
| Eliminar publicación: administrador del box | 1 fila; la del otro box no se toca |
| Eliminar y resolver: cierra todos los reportes de esa publicación | Pendientes del box = 0; aparece en Resueltos |
| Lista vacía y pestaña Resueltos | "Vacío" / 1 resuelto |
| Dueño SIN fila `box_admin` (observación) | Lista vacía: no es un caso real, pero hay que mantener la invariante |
Pruebas del código nuevo (además): el coach no ve la entrada ni entra por el enlace; la campana abre la pantalla; el filtro por box en el cajón; un reporte ya resuelto desde otra pestaña no rompe la pantalla.

## 9. Decisiones de Pía y hallazgos (2026-10-24)
1. **Comentarios reportables: NO** (ver sección 1). Idea futura posterior al lanzamiento.
2. **Migración del coach: SÍ, dentro de F1 y PRIMERA (antes de la pantalla).** `supabase/propuestas/20261024_social_reports_lectura_solo_admin.sql` + reversa: la lectura de `social_reports` pasa de `user_is_box_staff` a `user_is_box_admin_or_super_admin` (administrador del box, dueño con su fila `box_admin`, o super admin; con el interruptor aal2 encendido, super admin exige aal2). **Quién lee hoy esa tabla (revisado):** la campana del panel (solo si es administrador), el servidor (conexión de servicio, no depende de la política) y nadie más; ninguna función, vista o disparador de la base; ningún flujo de coach o alumno. **Probada en una transacción con ROLLBACK: 18 de 18** (alumno, autora, coach, administrador/dueño del mismo box, administrador de otro box, super admin con el interruptor apagado y encendido con aal1 y aal2; resolver sin cambios; reversa idéntica al original; el reporte real de Mi Box intacto). `check:super-admin-inlining` y `check:security-definer-grants` pasan. **No aplicada: espera tu OK.**
3. **Dueño sin fila `box_admin`: revisado en la base, los 3 boxes existentes (Mi Box, Diag CT Box A y B) tienen la fila de su dueño.** `boxes.owner_user_id` no puede ser nulo. Propuesta para garantizarlo (solo propuesta, no aplicada): (a) un disparador `AFTER INSERT OR UPDATE OF owner_user_id` en `boxes` que crea la fila `box_admin` del dueño si falta (`ON CONFLICT DO NOTHING`), con lo que "aprobar box", crear box y traspaso quedan cubiertos aunque alguien escriba el dueño directo; (b) un disparador en `user_roles` que impide borrar o cambiar la fila `box_admin` de quien es dueño de ese box; (c) un chequeo `check:owner-box-admin` que lista los boxes cuyo dueño no tiene la fila, para la regresión de cada migración.
4. **Fotos adjuntas a los reportes** están en un almacenamiento público (se endurece en F8); en F1 se muestran tal como están.
5. **Sin registro de auditoría** de quién descartó o eliminó: lo cubre L2 más adelante.
6. El comentario obsoleto de `admin-alerts.ts` ("social_reports no tiene box_id"; hoy sí lo tiene) se corrige junto con la campana.

## 10. Orden del código, despliegue, reversa y esfuerzo (después de tu OK a la migración)
**Un commit por parte, en este orden:** (1) la migración del coach (se mueve a `supabase/migrations/`, se corren los dos chequeos, se aplica y se prueba la matriz en producción); (2) la pantalla "Reportes de Comunidad" en box-admin (consultas + ruta + estados + entrada del menú con contador); (3) la campana filtrada por box con filas que abren la pantalla (sin resolver dentro del cajón). Luego la matriz completa repetida con el código nuevo y una nota en `ESTADO.md`.
**Pruebas:** reportes y publicaciones DESECHABLES (ids `inc-...`) en dos boxes desechables; **el reporte real de Mi Box (1 pendiente) no se toca** en ninguna prueba.
**Despliegue del panel (Cloudflare):** se verifica con `wrangler deployments list` y por comportamiento (la ruta nueva responde, el menú muestra la entrada solo a administradores).
**Reversa:** (1) se aplica la reversa de la migración; (2) y (3) se revierten los commits. No hay cambio de la app nativa. **Esfuerzo:** 1 sesión de código y pruebas.
