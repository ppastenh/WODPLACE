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
- El caso peligroso desaparece porque ya no existen cuentas confirmadas sin verificar. Una cuenta pendiente (sin verificar) cuyo dueño real entra con Google: la documentación dice que Supabase **elimina las identidades sin confirmar** de esa cuenta al vincular; como defensa adicional, `/auth/whoami` detecta "cuenta con identidad de correo sin `email_verified_at` y con identidad de Google" y entonces pone una **contraseña aleatoria con la API de administración y cierra todas las sesiones** (la contraseña del atacante deja de servir). Hay que probarlo con cuentas reales de Pía antes de confiar (ver el plan de prueba).

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

## L2 — Diseño del registro de seguridad (`security_events`)

### Qué se registra
| Evento | Cómo se captura | Datos |
|---|---|---|
| Inicio de sesión (y cierre) | Disparador sobre `auth.sessions` (hay que comprobar que el proyecto permita disparadores en el esquema `auth`; ya existen sobre `auth.users`) | usuario, IP parcial, agente, aal, método (correo/Google) |
| Alta, cambio y baja de **roles** | Disparador sobre `user_roles` | quién (usuario de la sesión), a quién, rol, box |
| Alta, **canje y borrado de invitaciones** (staff y alumnos) | Disparadores sobre `admin_invites` y `member_invites` (INSERT, UPDATE de `used_at`, DELETE) | quién, invitación (sin el código), rol, box, correo destinatario parcial |
| **Emisión y uso de tokens de panel**, y denegaciones 401/403 en rutas de administración | El servidor, en `/admin/pin/*` y en el control de acceso de administración | cuenta, box, resultado, ruta |
| Cambios del interruptor aal2 y otros ajustes | Ya existe `app_settings_audit`; se une en la vista | clave, valor anterior y nuevo |
| Cambios de factores MFA | Disparador sobre `auth.mfa_factors` | usuario, tipo, estado |
| Acciones de super admin | Hoy `super_admin_audit_log` (ver abajo) | actor, acción, objetivo |
| Borrados de moderación (publicaciones/comentarios), bloqueos | El servidor, en las rutas que ya protegen por box | quién, qué, box |

### Dónde y cómo se evita que se manipule o se llene
- **Tabla nueva `security_events`**, de **solo agregar**: RLS activado; **sin** políticas de UPDATE ni DELETE; se quitan esos privilegios (y TRUNCATE) a `anon` y `authenticated`; solo escriben disparadores `SECURITY DEFINER` y el servidor con la conexión de servicio. **Nadie escribe directo desde el navegador.**
- **Hallazgo sobre la tabla que ya existe:** `super_admin_audit_log` (13 filas) deja insertar a **cualquier administrador de box** (política `user_is_any_box_admin()`) y el `actor_email` lo manda el navegador, o sea **se puede falsificar**; además registra solo algunas acciones (por ejemplo sí registró el 23-oct a las 01:44:04 que `+super` otorgó el rol a keiravie, pero **no** registra borrar o cancelar invitaciones). Propuesta: el nuevo registro la reemplaza para lo crítico, y las acciones de super admin pasan a escribirse con disparadores (no desde el navegador).
- **Cadena de hashes:** cada fila guarda el hash de la anterior; un exportado mensual permite detectar borrados o ediciones (la manipulación con la conexión de servicio no se puede impedir, sí detectar).
- **Que no se llene:** un tope de tamaño por campo (los detalles son JSON de pocos campos, sin cuerpos de mensajes ni datos personales), agrupar eventos repetidos idénticos (por ejemplo, 200 denegaciones iguales en un minuto = 1 fila con contador), límite por tipo y por hora con alerta si se supera (señal de ataque), y particionado por mes para borrar por retención sin recorrer la tabla.
- **No se guardan:** contraseñas, tokens, códigos de invitación completos, textos de mensajes, fechas de nacimiento ni edades de menores; IP solo parcial (o con hash con sal rotativa).

### Quién lo lee
Solo **super admin** (política de lectura con `is_super_admin()`, con aal2 cuando el interruptor esté encendido), mediante una pantalla de solo lectura en super-admin con filtros por cuenta, tipo y fecha. El dueño de un box podría ver más adelante solo los eventos de su box (cambios de roles e invitaciones), sin IP.

### Retención
24 meses en la base; exportación mensual a un archivo fuera de la base (por ejemplo, almacenamiento privado) con su hash; borrado por partición vencida. Complementos que NO reemplazan este registro: pasar a Supabase Pro (7 días de Auth Logs frente a 1 hora en Free) y, si se quiere, Log Drains (Pro, US$60 por drain al mes).

### Pruebas y migración
Migración revisable con reversa, chequeos `check:super-admin-inlining` y `check:security-definer-grants`; pruebas con transacciones con rollback de que `anon`/`authenticated` no pueden insertar, editar ni borrar; prueba de que cada evento de la tabla se genera (crear/cambiar/borrar un rol, una invitación, un factor, iniciar sesión); prueba de carga del agrupamiento. **No se aplica nada hasta que Pía apruebe el diseño y la migración.**
