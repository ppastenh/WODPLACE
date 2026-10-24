# Diseño: L1 (toma previa de cuenta) y L2 (registro de seguridad)

**Solo diseño. No se aplica nada.** Escrito para Pía, 2026-10-23. Complementa los ítems L1, L2 y L3 de `LANZAMIENTO.md`. La decisión de cuál mitigación se aplica es de Pía.

---

## L1 — Opción recomendada: crear la cuenta SIN confirmar y verificar el correo antes de dejarla entrar

### Qué hay hoy (comprobado)
- `POST /auth/register` (api-server) crea la cuenta con `admin.createUser({ email_confirm: true })`: queda confirmada al instante, sin verificar que la persona controla el correo. Responde 409 "Ya existe una cuenta con ese email." si el correo ya está (revela existencia).
- El correo ya sale por **SMTP propio con Resend** (dominio `wodplace.cl` verificado, remitente `no-responder@wodplace.cl`; funciona, confirmado por Pía). El panel del box ya exige confirmación de correo (decisión de Pía), así que la confirmación de correo está **activada en el proyecto**: la app la salta solo porque el servidor crea el usuario con la API de administración.
- Google: `signInWithOAuth` en la app, y luego `/auth/complete-profile`.

### Cómo cambia `POST /auth/register`
1. El servidor deja de usar `admin.createUser(email_confirm: true)`. Crea la cuenta **sin confirmar** (con `signUp` del cliente público o `createUser` con `email_confirm: false` y envío del código), con la contraseña elegida, y Supabase manda el correo de confirmación por el SMTP propio.
2. La respuesta es **siempre la misma** ("Te enviamos un código a tu correo"), exista o no el correo. Si el correo ya tiene una cuenta confirmada, no se crea nada y se manda un correo distinto ("ya tienes una cuenta: entra o recupera tu contraseña"). Así desaparece también la revelación de existencia del registro.
3. Se crea la fila de `wodplace_users` en estado **pendiente** (con `auth_user_id`), sin acceso a nada hasta que el correo se verifique. Las rutas del servidor ya rechazan una sesión que no existe: sin confirmar, Supabase no entrega sesión.
4. El alumno escribe en la app el **código de 6 dígitos** del correo (en vez de un enlace: los enlaces profundos en Android son frágiles, ya hay trampas conocidas con Chrome y Samsung Internet). La app llama a `verifyOtp` y recién ahí obtiene sesión y sigue con el perfil.
5. **Limpieza:** las cuentas pendientes que no se verifican en 24 horas se borran (tarea programada), de modo que alguien no pueda "reservar" un correo ajeno ni llenar la base.

### Alumnos por invitación (el código personal ya llega al correo)
- Hoy el correo de invitación trae un **código personal** y dice "ve a Unirse a un box e ingresa el código". Ese código solo llega a la bandeja del invitado: **canjearlo prueba que controla el correo**.
- Diseño: si el código se ingresa **al registrarse** (antes de crear la cuenta), el servidor valida que el código existe, es vigente y que el correo de la invitación coincide con el del registro, y crea la cuenta **ya verificada** (sin segundo código). Es el mismo principio que ya usa la invitación de staff (el correo de la invitación debe coincidir con el de la sesión).
- Si la persona se registra primero sin código y canjea después, la cuenta ya tuvo que verificarse con el código del correo: el canje no cambia nada.
- Regla: **nunca** marcar un correo como verificado por canjear un código que no estaba atado a ese mismo correo.

### Inicio de sesión con Google
- Google entrega el correo ya verificado. Si ya existe una cuenta **confirmada** con ese correo, Supabase vincula la identidad (comportamiento de la plataforma, sin interruptor): es seguro porque ese correo sí se verificó.
- Una cuenta **sin confirmar** con ese correo: según el código de Supabase, al llegar el login de Google se borran sus identidades sin confirmar y **se pone su contraseña en nulo**, y la cuenta queda confirmada. Esa protección ya existe y se activa sola cuando las cuentas nacen sin confirmar. **Por eso se RETIRA la "defensa extra" a medida** que figuraba en la versión anterior de este diseño (cambiar la contraseña y cerrar sesiones desde `/auth/whoami`): no se construye nada propio salvo que la prueba lo demuestre necesario. Detalle, fuentes y prueba en `COMPARATIVA-L1-VERIFICACION-CORREO.md`.

### SMTP propio con Resend: límites, costo, ajustes
- **Resend** ([precios](https://resend.com/pricing)): Free = 3.000 correos al mes y **100 por día**, 3 dominios; Pro US$20 al mes = 50.000 al mes, sin límite diario; excedente US$0,90 por 1.000 (solo en planes pagados con "pago por uso" activado).
- **Supabase** ([SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [límites](https://supabase.com/docs/guides/auth/rate-limits)): con SMTP propio el límite por defecto es **30 correos por hora** en el proyecto (se sube en Auth → Rate Limits); el servicio por defecto de Supabase (2 por hora, solo a miembros del equipo) ya no se usa. Enfriamiento por usuario de **60 segundos** entre registros, recuperaciones y reenvíos (configurable); límite por IP de 30 peticiones cada 5 minutos en `/signup`, `/recover`, `/resend`, `/otp`.
- **Ajustes a hacer:** plantilla "Confirm signup" en español con el código (`{{ .Token }}`), vencimiento del código (por defecto 1 hora), subir el límite horario a un valor que cubra un día de inscripciones, y pasar a Resend Pro cuando se acerque a 100 correos por día (un solo box difícilmente lo alcanza; varios boxes sí).
- **Abuso (bombardeo de correos a terceros):** límite por IP (ya existe `registerRateLimiter`), enfriamiento por correo de 60 s, máximo 3 envíos por correo y día, y CAPTCHA después del lanzamiento (ya anotado).

### La experiencia de la persona
Registro → pantalla "Revisa tu correo: te enviamos un código de 6 dígitos" con campo de código, botón "Reenviar" (60 s de espera, tope 3), enlace "Usar otro correo" y aviso de revisar spam → al verificar, entra y completa el perfil como hoy. Si nunca llega: "¿Ya tienes cuenta? Entra con Google o recupera tu contraseña". Alumnos invitados: un solo paso (código de invitación + registro), sin segundo código. Costo para el usuario: un paso extra solo en el registro con correo y contraseña; Google no cambia.

### Riesgos
1. Correos que no llegan (spam o dominio): mitigación = dominio verificado ya existente, texto claro, reenvío.
2. Personas que abandonan en el paso del código: mitigación = el código dura 1 hora y el reenvío es simple.
3. Cuentas ya creadas con el sistema actual quedan confirmadas: no se tocan (hoy son solo las de Pía y de prueba).
4. Cambio de plantilla/ajustes en Supabase es configuración fuera del repositorio: anotarlo en `ESTADO.md` con fecha.
5. Una app instalada con el flujo antiguo recibiría la respuesta nueva: se versiona la ruta o se bloquea la versión vieja.
6. La respuesta idéntica oculta si el correo existe, pero el flujo "email primero" de la pantalla de ingreso (`checkEmailExists` decide si va a contraseña o a registro) sigue revelando existencia; resolverlo exige una pantalla única (correo y contraseña a la vez, o código por correo). Queda como decisión aparte.

### Pruebas (por fase)
Registro sin sesión hasta verificar; código incorrecto, vencido y reutilizado; reenvío (60 s, tope 3); mismo correo dos veces da la misma respuesta; correo ya confirmado recibe el aviso y no se duplica la fila; invitación con código válido, vencido y de otro correo; Google con cuenta confirmada, Google con cuenta pendiente (el caso del ataque), cuenta pendiente que caduca a las 24 h; límites por IP/correo; matriz de rol y box del incidente (debe seguir pasando).

### Plan de prueba del escenario COMPLETO con dos cuentas de Pía (antes de aplicar la mitigación, con el código actual)
**Objetivo:** confirmar de punta a punta que la toma previa funciona hoy. Se necesitan: la **víctima** = una cuenta de Google real de Pía que **todavía no tenga cuenta en WODPLACE**, y el **atacante** = solo la pantalla de registro de la app (el atacante no necesita cuenta propia ni acceso al correo de la víctima).
- **Qué cuenta borrar antes:** ninguna, si Pía tiene **otra** cuenta de Google sin cuenta en WODPLACE (recomendado: se usa como víctima). Si la víctima tiene que ser `piak.pastenh@gmail.com`, hay que borrar antes su cuenta de WODPLACE (la cuenta de Supabase, su fila de `wodplace_users` y sus filas dependientes: membresía de Mi Box, reservas, récords, logros, ajustes); yo lo haría con el OK de Pía y ella volvería a unirse a Mi Box con el código después. El correo `+alias` de Gmail no sirve como víctima porque Google no inicia sesión con un alias.
- **Qué hace Pía a mano (en el teléfono):** (1) cerrar sesión. (2) Pantalla de registro: escribir el correo de la víctima y una contraseña "del atacante", completar el registro; cerrar sesión. (3) "Continuar con Google" con la cuenta de la víctima. (4) Cerrar sesión. (5) Ingresar con el correo de la víctima y la contraseña "del atacante". **Resultado que prueba el ataque:** si el paso 5 entra, la contraseña del atacante sigue valiendo sobre la cuenta a la que la víctima entró con Google.
- **Qué compruebo yo (solo lectura) después de cada paso:** cuántas cuentas hay con ese correo, sus identidades (`email`, `google`), si el correo figura confirmado y cuándo, si tiene contraseña, y las sesiones.
- **Al terminar:** borro la cuenta de prueba (con el OK de Pía) y anoto el resultado en `LANZAMIENTO.md`.
- **Repetir con la mitigación aplicada** para comprobar que el paso 5 ya no entra y que el paso 2 no deja usar la cuenta hasta verificar.

---

## L2 — Registro de seguridad MÍNIMO (versión simplificada, 2026-10-24)

Una sola tabla donde **nadie pueda actualizar ni borrar filas**, escrita **solo por el servidor y por disparadores**, **legible solo por super admin**, con **retención simple**. Sin hashes encadenados ni particiones por ahora (quedan como mejora futura). No se aplica nada hasta que Pía apruebe el diseño y la migración.

### La tabla `security_events`
`id`, `created_at` (la pone la base), `event_type`, `actor_user_id` (quién), `target_user_id` (a quién, si aplica), `box_id`, `ip_parcial`, `detail` (JSON corto, con tope de tamaño). RLS activado; política de lectura solo `is_super_admin()`; **sin** política de INSERT/UPDATE/DELETE para `authenticated`; se quitan a `anon` y `authenticated` todos los privilegios salvo SELECT (que RLS limita). Escriben únicamente los disparadores (`SECURITY DEFINER`) y el servidor con su conexión. El navegador nunca escribe. **No se guardan** contraseñas, tokens, códigos de invitación, textos de mensajes, fechas de nacimiento ni edades.

### Eventos y de dónde salen
| Evento | De dónde sale | Costo / comentario |
|---|---|---|
| **Cambios de rol** (alta, cambio, baja) | Disparador sobre `user_roles` | Bajo: tabla casi estática (8 filas hoy) |
| **Invitaciones: alta, canje, borrado** (staff y alumnos) | Disparadores sobre `admin_invites` y `member_invites` (INSERT, UPDATE de `used_at`, DELETE) | Bajo. Cubre el hueco de hoy: **borrar o cancelar una invitación no deja registro** |
| **Emisión de tokens de panel** y denegaciones (401/403) en rutas de administración | El servidor (`/admin/pin/*` y `adminAccess`) | Bajo; se agrupan denegaciones repetidas para que no llenen la tabla |
| **Acciones de super admin** | Hoy `super_admin_audit_log` (ver su propuesta de endurecimiento aparte); en `security_events` se enlazan o se migran | Ninguno si se mantiene la tabla actual |
| **Cambios de factores de segundo factor** | Disparador sobre `auth.mfa_factors` | Bajo |
| **Cambios del interruptor aal2** | Ya existe `app_settings_audit` | Ninguno |
| ~~Inicios de sesión~~ | **FUERA de esta versión (decisión de Pía, 2026-10-24).** No se crea ningún disparador sobre `auth.sessions` por ahora | Queda como **pendiente a evaluar**: la opción sería un disparador `AFTER INSERT` sobre `auth.sessions` (comprobado que se puede crear), con el riesgo de que Supabase cambie columnas de esa tabla en una actualización. Alternativas: la columna `last_sign_in_at` (solo el último inicio) o Supabase Pro con Log Drains |

### Que no se llene ni se manipule (versión mínima)
Tope de tamaño del JSON, agrupar eventos repetidos idénticos (denegaciones), y que **nadie con sesión pueda escribir ni modificar** (privilegios y RLS). La manipulación con la conexión de servicio (el dueño de la base) no se puede impedir, solo detectar; eso es la mejora futura de hashes encadenados.

### Quién lo lee
Solo super admin, con una pantalla de solo lectura en super-admin (filtros por cuenta, tipo y fecha).

### Retención simple
24 meses; un borrado programado mensual de lo más antiguo (con la conexión de servicio, nunca desde un usuario). Exportación a un archivo fuera de la base queda como mejora futura.

### Pruebas y migración
Migración revisable con reversa; `check:super-admin-inlining` y `check:security-definer-grants`; pruebas con transacciones con ROLLBACK de que `anon`/`authenticated` no pueden insertar, actualizar ni borrar y de que solo super admin lee; prueba de que cada evento de la tabla se genera. **No se aplica nada hasta que Pía apruebe el diseño y la migración.**

### Endurecimiento aparte de `super_admin_audit_log` (propuesta lista, no aplicada)
SQL, reversa y pruebas en `supabase/propuestas/` (`20261024_super_admin_audit_log_solo_super_admin.sql` y su `.reversa.sql`): INSERT solo con `is_super_admin()`, actor/id/fecha tomados de la sesión por un disparador, y solo SELECT/INSERT para `authenticated`. Probada en una transacción con ROLLBACK (21 casos, incluida la reversa idéntica al original).
