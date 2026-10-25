# Plan combinado: F3 (Aceptaciones), F4 (nombre del box), F5a (Acuerdo de Plataforma: ver y estado) y F6 (quitar "Más" de la app)

Escrito para Pía, 2026-10-25. **Solo plan, sin código; espero tu OK.** Orden decidido por Pía: **F3, F4, F5a y F6 al final de esas tres; después F2, F7, F5b (la guardia del Acuerdo en el panel, con migración) y F9.** La compuerta del Acuerdo en el botón "Administrador" de la app se queda hasta F5b.

## 1. Inventario exacto de "Más" en la app
- **Dónde está:** en el menú lateral del perfil (`profile.tsx`, lista `NAV_ITEMS`, ítem `more`, icono de grilla). Se muestra **solo** si la cuenta tiene el ítem "Administrador" (rol `box_admin` o `super_admin` que ya aceptó el Acuerdo). **Un alumno no lo ve. Un coach tampoco** (los coaches reciben el ítem "Coach", no "Administrador", y no ven "Más").
- **A qué lleva:** a la pantalla `/more` (`more.tsx`, paleta oscura). Si no hay token de administrador en memoria, la pantalla redirige a `/admin-login` (PIN).
- **Qué contiene (4 bloques, todos de administración):** (1) "Ver Acuerdo de Plataforma" (abre `/platform-agreement`); (2) "Nombre del Box" (editar); (3) "Reportes de moderación" (lista y resolver; **ya está en el panel desde F1**); (4) "Aceptaciones de contrato" (lista, "Marcar como vistas").
- **¿Algo que NO sea de administración y use un alumno o un coach? No.** Ningún bloque ni el ítem lo usa un alumno o un coach: sin token no se entra y el ítem no existe para ellos. (Lo único compartido es la pantalla `/platform-agreement`, que sigue existiendo para la compuerta y no se toca.)
- **Referencias a `more`:** el ítem y su filtro en `profile.tsx`, la pantalla registrada en `_layout.tsx`, un comentario en `admin-dashboard.tsx`, y los ganchos de `api-client-react` que solo usa esta pantalla (`useAdminBoxName`, `useAdminSocialReports`, y los generados de aceptaciones).

## 2. Cada función: destino, consultas, reglas de la base, roles, migración y estado vacío
| Función | Destino en el panel | Consultas (siempre filtradas por el box seleccionado) | Reglas de la base (RLS) | Quién la ve | ¿Migración? | Vacía se ve |
|---|---|---|---|---|---|---|
| **F3 — Aceptaciones de contrato** | Nueva entrada **"Aceptaciones de contratos"** en Más → Configuración, bajo "Contratos". La **LISTA muestra solo quién aceptó, qué documento y versión, y cuándo** (y si ya se marcó visto); el contacto de emergencia y los datos del apoderado de un menor NO van en la lista: están en la ficha del miembro | La lista usa la función `box_contract_acceptances_list(box)` (devuelve solo esas columnas); "Marcar como vistas" = `UPDATE seen_by_owner_at` del box | **Lectura de la tabla:** pasa de "staff" (incluía a los coaches) a administrador del box, dueño y super admin; la función verifica el mismo rol por dentro. **El alumno no se ve afectado:** nunca tuvo política propia; su aceptación, el aviso de Inicio y el bloqueo de reservas salen del servidor | Dueño, administrador del box y super admin (decisión de Pía). Coach y alumno: no | **Sí, APLICADA el 2026-10-25** (`20261025140000_contract_acceptances_lectura_solo_admin.sql` + reversa): política y función; probada en ROLLBACK (29 de 29), en producción (28 de 28 por rol y box, y 8 de 8 del alumno y las reservas antes y después) | "Nadie ha aceptado los contratos todavía." |
| **F4 — Nombre del box** | Campo "Nombre del box" en Más → Configuración (la pantalla de Ajustes que ya existe) | `UPDATE boxes SET name` por id del box (2 a 60 caracteres, sin espacios al borde) | **Ya existe** y la probé: el administrador del box cambia el nombre; cambiar `owner_user_id`, `status` o borrar el box da 42501 (permiso denegado por columna); coach, alumno y administrador de otro box: 0 filas | Administrador del box, dueño y super admin pueden editar; el coach no ve el campo | **No** | No aplica (siempre hay nombre) |
| **F5a — Acuerdo de Plataforma: ver y estado** | Tarjeta "Acuerdo de Plataforma" dentro de **Contratos** (hoy solo del dueño): estado "Aceptado el ... (versión ...)" o "Pendiente", y botón "Ver el Acuerdo" | Se usa el servidor que el panel ya consulta (`apiFetch`): `GET /auth/whoami` (da el id de WODPLACE de la cuenta) → `GET /platform-agreement?userId=` (estado y documento) → `GET /contracts/signed-url?slug=platform-agreement` (enlace de ~5 minutos al PDF) | Del servidor: sesión de Supabase y que el `userId` sea el de esa cuenta (`assertOwnsAccount`); el documento solo se entrega a quien corresponde. Es solo lectura | Dueño (y super admin: "No aplica, cuenta de plataforma"). El administrador que no es dueño no ve Contratos, así que no la ve | **No** | "Pendiente" con el texto "Acéptalo desde la app" (la aceptación se queda en la app hasta F5b) |
| **Reportes de moderación** | **Ya hecho en F1** | — | — | — | — | — |

## 3. F4 — el nombre del box tiene UN solo origen: `boxes.name`
- **Hoy hay dos lugares:** `boxes.name` (el real) y `box_settings` clave `box_name` (la ruta del servidor que usa "Más"). **La clave de `box_settings` no tiene ninguna fila** (hasta el arreglo del incidente esa ruta daba siempre 500) y **solo la lee la propia pantalla "Más"**: ninguna otra pantalla la usa.
- **Lo que lee la app hoy:** el nombre sale de `boxes.name` en todos lados (Home, Comunidad, Plan, "tu próxima clase"), a través del endpoint `my-box`. Por eso editar el nombre en "Más" nunca habría cambiado lo que ve un alumno.
- **Decisión propuesta:** el origen único es `boxes.name`; el campo del panel lo edita; `box_settings.box_name` queda sin uso (no hay datos que migrar) y se elimina junto con la ruta en F7. La app no necesita cambios para ver el nombre nuevo.

## 4. F6 — qué se elimina de la app y qué no
- **Se elimina:** la pantalla `more.tsx`; el ítem "Más" del menú y su filtro en `profile.tsx`; su registro en `_layout.tsx`; el comentario obsoleto de `admin-dashboard.tsx`; los textos de esa pantalla ("Herramientas de administración que todavía no están en el panel completo", etc.); los ganchos de `api-client-react` que solo ella usa (los generados quedan hasta F7 porque dependen de las rutas del servidor).
- **NO se toca:** la compuerta del Acuerdo (`platform-agreement.tsx` y la lógica de `getAdminNavItem`); el PIN (`admin-login`); el botón "Administrador" del menú; el panel dentro de la app (`admin-dashboard`, con enlace de un solo uso); las opciones de moderar en la publicación (F2).
- **Cómo llega el administrador al panel después:** menú → "Administrador" → PIN → panel dentro de la app → Más del panel → Aceptaciones, Ajustes, Contratos, Reportes de Comunidad. Un administrador que antes iba a "Más" de la app ahora va por el panel (un paso más, con todo ahí).
- **Versiones de la app que ya tengan el ítem:** siguen mostrando "Más" y esa pantalla seguirá funcionando mientras existan las rutas del servidor (hasta F7). Hoy la app solo está en tu teléfono (sin usuarios reales). **Regla:** F7 (eliminar las rutas) se hace solo cuando todas las instalaciones tengan la versión sin "Más"; si no, quien la abra vería errores. F6 llega a tu teléfono cuando instales la versión nueva (hoy sin actualización automática).

## 5. Orden de commits, pruebas y checklist
**Un commit por parte; F6 siempre al final y solo después de verificar F3, F4 y F5a en producción y en tu teléfono.**
1. **F3-a** migración de `contract_acceptances` (propuesta → `migrations/` con reversa, chequeos `check:super-admin-inlining` y `check:security-definer-grants`, se aplica con tu OK y se prueba en producción).
2. **F3-b** pantalla "Aceptaciones de contratos" (consultas, ruta, entrada del menú, `routeTree.gen.ts`).
3. **F3-c** campana: contratos sin ver filtrados por box, filas que abren la pantalla (hoy la consulta no filtra por box).
4. **F4** campo "Nombre del box" en Ajustes.
5. **F5a** tarjeta "Acuerdo de Plataforma" en Contratos.
6. **(verificación en producción y en tu teléfono de 1 a 5)**
7. **F6** app: quitar "Más" (un solo commit).
Despliegue: el panel se verifica con `wrangler deployments list --name box-admin` y por comportamiento (como en F1). F6 no se despliega por push: llega con la próxima versión de la app.

**Matriz de pruebas por rol y box (dos boxes, cuentas desechables; resultado ESPERADO escrito antes; las filas reales de Mi Box no se tocan — hoy hay 3 aceptaciones, 2 sin ver):**
| Caso | Esperado |
|---|---|
| F3 · listar aceptaciones del box: dueño (con fila `box_admin`), administrador del mismo box | Ven las de su box (y el nombre del alumno) |
| F3 · administrador/dueño de OTRO box pide ese box | Lista vacía |
| F3 · coach del mismo box, alumno, autor | Lista vacía y sin error (ya probado con la migración propuesta: 18 de 18) |
| F3 · super admin con el interruptor apagado / encendido con aal1 / con aal2 | Ve / no ve / ve |
| F3 · marcar como vistas: administrador del box | Marca solo las de su box (1 fila en la prueba) |
| F3 · marcar como vistas: coach, alumno, administrador de otro box | 0 filas |
| F3 · lista vacía | "Nadie ha aceptado los contratos todavía." |
| F4 · cambiar nombre: dueño, administrador del mismo box, super admin | 1 fila; la app lo muestra |
| F4 · cambiar nombre: coach, alumno, administrador de otro box | 0 filas |
| F4 · cambiar dueño/estado o borrar el box (administrador) | 42501 |
| F4 · nombre vacío, 1 carácter o más de 60 | El panel lo rechaza antes de enviar |
| F5a · dueño: estado y enlace al PDF | Estado correcto; el enlace abre el PDF |
| F5a · pedir el estado de OTRA cuenta (`userId` ajeno) | 403 |
| F5a · alumno/coach pidiendo el documento | Sin acceso (404 o "exento") |
| Regresión | Matrices del incidente y de F1 siguen pasando; la campana de coach/administrador/super admin carga con 200 |

**Checklist corta para tu teléfono (cuando F3, F4 y F5a estén desplegados):** (1) menú → Administrador → PIN → Más → "Aceptaciones de contratos": ves las 3 reales; **no pulses "Marcar como vistas"** (hay 2 sin ver reales). (2) Más → Configuración: el campo "Nombre del box" muestra "Mi Box"; no lo cambies (o cámbialo y devuélvelo). (3) Más → Contratos: la tarjeta del Acuerdo dice si está aceptado y "Ver el Acuerdo" abre el PDF. (4) La campana abre las aceptaciones sin ver. Y, tras instalar la versión de F6: el menú ya no tiene "Más" y "Administrador" sigue funcionando.

## 6. Decisiones de Pía (2026-10-25) y lo que queda
1. **Migración de F3 primero: APLICADA** (condición cumplida: el alumno sigue leyendo su propia aceptación — sale del servidor — y las reservas y el aviso de Inicio siguen igual; medido antes y después con datos desechables).
2. **Quién ve "Aceptaciones":** dueño, administrador del box y super admin. **La lista** solo muestra quién aceptó, documento y versión, y cuándo.
3. **F5a:** tarjeta del Acuerdo de solo lectura.
4. **F6 NO se hace hasta que Pía diga que verificó las tres funciones en el panel.**

## 7. Riesgos que quedan
1. **Migración de F3 (lectura solo de administradores):** igual que en F1; la propuesta está probada y espera tu OK. ¿La aplico primero, antes de la pantalla?
2. **Quién ve "Aceptaciones":** propongo dueño, administrador del box y super admin (como hacía "Más" de la app), aunque la página "Contratos" sea solo del dueño. ¿De acuerdo, o solo el dueño?
3. **Acuerdo en F5a:** solo lectura (estado y ver el PDF). Aceptarlo sigue en la app hasta F5b. ¿De acuerdo?
4. **Datos sensibles:** contacto de emergencia y datos del apoderado de menores se muestran solo a administradores; nunca edad ni fecha de nacimiento.
5. **Sin registro de auditoría** de quién marcó "visto" (lo cubre L2 más adelante).
