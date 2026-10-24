# LANZAMIENTO.md

Consolidado priorizado de todo lo que falta para publicar WODPLACE en Android. Hecho leyendo `ESTADO.md` completo y el código real — nada de esto está aplicado, es solo el plan. Se actualiza junto con `ESTADO.md` a medida que se avanza.

**Esfuerzo:** en "sesiones de trabajo" tuyas y mías juntos (no horas de reloj) — una sesión típica de este proyecto. Es una estimación, no una promesa.

**Orden de fondo (decidido 2026-10-21):** todo lo que no cuesta dinero y no depende de un tercero (abogado, Google, Apple) va **ahora**. Los pagos, los temas legales (que Pía investiga ella misma, sin prioridad por ahora) y la protección contra contraseñas filtradas quedan agrupados en la **Etapa final**, al final de este documento, cada uno con su propio plazo de espera — no porque sean lo último en importancia, sino porque tienen un tiempo de trámite que no se acelera trabajando más rápido.

---

## REACTIVAR EL SEGUNDO FACTOR (bloquea el primer usuario real)

**ESTADO ACTUAL: APAGADO** desde el 2026-10-23 a las 00:27:53 hora de Chile (03:27:53 UTC) por decisión de Pía, con registro `app_settings_audit` id 2 (`true` → `false`). Verificado: con el interruptor apagado una cuenta super admin desechable con sesión SIN segundo factor ahora pasa `is_super_admin()` y el servidor le entrega token de panel (con el interruptor encendido ambas cosas eran `false`/403); los factores y roles quedaron IDÉNTICOS antes y después (`pasten.hueche+super` conserva sus 2 factores TOTP verificados; `pasten.hueche@gmail.com` tiene 1 factor TOTP **sin verificar**, creado el 2026-10-23 01:35, que no se tocó). La cuenta diaria real no se probó con su sesión (regla: nunca generar accesos de cuentas reales de Pía); la prueba se hizo con una cuenta desechable equivalente.

**Decisión de Pía (2026-10-23):** el segundo factor del super admin (`require_aal2_for_super_admin`) se apaga por ahora para trabajar sin ingresar códigos todo el rato. No hay boxes ni cuentas de otras personas. Se apaga SOLO después de que Pía confirme que el arreglo del incidente quedó verificado en producción con el interruptor encendido. El apagado se hace con su registro en `app_settings_audit`, sin borrar ni tocar los factores ni el rol de ninguna cuenta, y se comprueba que la cuenta diaria entra al panel de super admin sin código y que la cuenta `+super` conserva sus 2 factores.

**Regla: NO se invita ni se registra a ninguna persona real mientras el interruptor esté apagado.**

Antes de invitar al primer usuario real, en este orden:
1. Encender el interruptor (`require_aal2_for_super_admin = true`), con su registro en `app_settings_audit`.
2. Comprobar que `+super` entra con CADA uno de los 2 factores.
3. Comprobar el aviso de la cuenta diaria (debe avisar que necesita segundo factor).
4. Anotar en el gestor de contraseñas de Pía qué entrada de 2FAS corresponde a cada factor.
5. Decidir si se quita el rol `super_admin` de la cuenta diaria (queda como dueña/box_admin normal).
6. Correr la regresión completa con el interruptor encendido: la matriz de rol y box del incidente (`incidente-*@wodplace.test`) y los checks `check:super-admin-inlining` y `check:security-definer-grants`.

## OBLIGATORIO antes de usuarios reales — seguridad de cuentas y registro de accesos

Ambos ítems nacen del incidente de seguridad del 2026-10-22/23. Ninguno está implementado; se decide y se aprueba cada uno antes de tocar nada. **Mientras no estén resueltos, no se invita ni se registra a ninguna persona real.**

| # | Ítem | Severidad | Esfuerzo | Estado |
|---|---|---|---|---|
| L1 | **Toma previa de cuenta (pre-account takeover): `/auth/register` crea cuentas ya confirmadas sin verificar el correo.** Diseño detallado de la opción recomendada (crear sin confirmar y verificar con código de 6 dígitos; alumnos por invitación; Google; Resend; pruebas y plan de prueba con dos cuentas de Pía) en `DISENO-SEGURIDAD-CUENTAS.md`, sin aplicar. | **ALTA** (acceso persistente a la cuenta y a los datos personales de la víctima, incluidos contacto de emergencia y datos de menores) | **Medio**: 1 a 2 sesiones, más configurar un envío de correo propio (SMTP/Resend) | Sin aplicar |
| L2 | **Registro de seguridad propio (inicios de sesión, cambios de rol, emisión de tokens de panel, y altas, canjes y borrados de invitaciones).** `auth.audit_log_entries` está vacía y los Auth Logs del panel duran 1 hora en Free. **Borrar o cancelar una invitación hoy no deja ningún registro** (confirmado en el caso keiravie), y el `super_admin_audit_log` actual lo puede falsificar cualquier administrador de box. Diseño completo en `DISENO-SEGURIDAD-CUENTAS.md` (no aprobado, sin migración). | **MEDIA-ALTA** (sin esto no se puede investigar el próximo incidente) | **Medio**: 1 sesión (tabla + 3 disparadores + escritura desde el servidor), más aprobación de la migración | Sin aplicar |

### L1 — Toma previa de cuenta

**Qué pasa hoy (probado en producción con una cuenta `@wodplace.test` desechable):** `POST /auth/register` no pide sesión ni verificación de correo. Crea la cuenta con `email_confirm: true`, queda confirmada al instante (`email_confirmed_at` = hora de creación) y se puede entrar con correo y contraseña sin haber verificado nada. Un segundo registro con el mismo correo responde 409 "Ya existe una cuenta con ese email.".

**Escenario:** una persona registra el correo de otra (`victima@gmail.com`) con una contraseña propia. Más tarde la víctima entra con Google (correo verificado por Google).

**Qué dice la documentación vigente de Supabase** ([Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)): "Supabase Auth automatically links identities with the same email address to a single user" y exige correos únicos. Advierte que vincular a un correo sin verificar "could lead to pre-account takeover attacks", y que al vincular una identidad nueva Supabase "will remove any other unconfirmed identities linked to an existing user". La página no dice qué pasa con la contraseña. Además no existe un interruptor de proyecto para apagar la vinculación automática (es el comportamiento de la plataforma; sí hay uno para la vinculación manual).

**Conclusión:** como nuestro registro marca el correo como confirmado sin verificarlo, la cuenta del atacante cuenta como "confirmada" y **la identidad de Google de la víctima se vincularía a esa misma cuenta; la contraseña del atacante seguiría valiendo** (no hay nada en la plataforma ni en nuestro código que la borre). **No pude probar este último paso** porque requiere iniciar sesión con una cuenta real de Google de otra persona; lo anterior es análisis de la documentación más lo que sí probé (cuenta confirmada sin verificar, y que una cuenta creada con Google queda con una sola identidad `google` aunque después tenga contraseña, como la de keiravie). Antes de aplicar la mitigación conviene repetir la prueba completa con dos cuentas de Google propias de Pía.

**Mitigaciones (en orden de recomendación; sin aplicar):**
1. **Verificar el correo antes de confirmar** (recomendada): crear la cuenta sin confirmar (`email_confirm: false`), enviar un código o enlace, y no dejar usar la cuenta hasta verificarlo. Por la regla de la documentación, una cuenta sin confirmar pierde su identidad de correo si luego se vincula Google. Requiere pantalla de "revisa tu correo", reenvío con límite y un envío de correo propio (el de Supabase por defecto es muy limitado).
2. **Impedir la vinculación a una cuenta cuyo correo nunca se verificó:** guardar en `wodplace_users` la fecha de verificación del correo; si una cuenta con `email_verified_at` vacío aparece con una segunda identidad (Google), el servidor la trata como sospechosa.
3. **Obligar a cambiar la contraseña al vincular:** en ese mismo caso (y en `/auth/whoami`), el servidor pone una contraseña aleatoria con la API de administración y cierra todas las sesiones, de modo que la contraseña del atacante deja de servir.
4. **Opción de producto:** registro solo con Google (sin contraseña), lo que elimina el problema de raíz pero cambia la experiencia.
5. Complemento: mensaje de error genérico en el ingreso y en el registro, para no revelar si un correo existe (hoy "No encontramos una cuenta con ese email." y "Ya existe una cuenta con ese email.").

### L2 — Registro de seguridad

**Qué hay hoy y qué dice la documentación:**
- `auth.audit_log_entries`: **vacía** (0 filas) en este proyecto. La documentación vigente no la menciona; los registros de Auth ahora se consultan en el panel de Supabase (Logs, tipo Auth).
- **Retención de los Auth Logs del panel** ([Pricing](https://supabase.com/pricing)): **Free, 1 hora**; **Pro, 7 días**; Team, 28 días; Enterprise, incluido. Los demás registros (API y base de datos): Free 1 día, Pro 7, Team 28, Enterprise 90. La página de [logs](https://supabase.com/docs/guides/telemetry/logs) solo dice que "retention depends on your pricing plan".
- **Exportar:** [Log Drains](https://supabase.com/docs/guides/telemetry/log-drains) está disponible solo en Pro, Team y Enterprise (no en Free); incluye los logs de Auth y envía a Datadog, Loki, Amazon S3, Sentry, Axiom, Syslog, OpenTelemetry o un endpoint propio. Precio de lista: US$60 por drain al mes más uso. En Free solo se puede consultar y descargar a mano desde el panel, dentro de esa hora.
- **¿Se puede activar la tabla?** No encontré en la documentación una opción de proyecto para volver a llenar `auth.audit_log_entries`; hay que asumir que no está disponible a nivel de plataforma. Confirmarlo con el soporte de Supabase si se quisiera.
- Logs de Render (API): 7 días en Hobby, 14 en Professional, 30 en Scale.

**Registro de seguridad mínimo propuesto (propio, no depende del plan):** una tabla `security_events` de solo agregar (RLS: solo super admin lee; sin UPDATE ni DELETE; el servidor y los disparadores insertan) con fecha, tipo, usuario, box, IP parcial, agente y detalle sin datos sensibles. Eventos:
1. **Inicios de sesión:** disparador sobre `auth.sessions` (usuario, IP, agente, aal) — hay que comprobar que el proyecto permita ese disparador, como ya existe sobre `auth.users`.
2. **Cambios de rol:** disparador sobre `user_roles` (alta, baja, cambio; quién lo hizo si se puede saber) y sobre `admin_invites` (crear, usar, borrar).
3. **Tokens de panel:** el servidor registra cada emisión (`/admin/pin/*`) y cada denegación 401/403 en rutas de administración, con la cuenta y el box.
4. **Cambios del interruptor aal2:** ya existe `app_settings_audit`; se incluye en la vista.
- Retención 24 meses; exportación mensual a un archivo fuera de la base; vista de lectura en super-admin. Pasar a Pro (7 días de Auth Logs y posibilidad de Log Drains) complementa pero no reemplaza este registro propio.

### L3 (menor, junto con L1) — Cuentas de Google que intentan entrar con correo y contraseña
- **Qué ve hoy el usuario** (código de `login-password` y `AuthContext.login`): si el correo no existe, "No encontramos una cuenta con ese email."; si existe pero se creó con Google y nunca tuvo contraseña, Supabase responde "credenciales inválidas" y la app muestra "Contraseña incorrecta." (engañoso, y los dos mensajes distintos revelan si la cuenta existe).
- **Texto de ayuda propuesto** (fijo, siempre visible bajo el campo de contraseña, sin revelar si la cuenta existe): "Si creaste tu cuenta con Google, entra con Google. También puedes crear una contraseña con «Olvidé mi contraseña»." Y un solo mensaje de error para ambos casos: "Correo o contraseña incorrectos."
- **Qué pasa con las identidades al recuperar la contraseña** (comprobado en la cuenta `keiravie`): la cuenta sigue con **una sola identidad (`google`)** y simplemente pasa a tener también contraseña. Ambos métodos de ingreso funcionan sobre la misma cuenta y no se crea una segunda cuenta.

## Ahora, sin costo

Todo lo de aquí se puede preparar o terminar sin gastar dinero y sin depender de que alguien externo responda.

### Visual
- **B3 — Auditoría visual + tokens de diseño.** Auditoría de solo lectura ya entregada (`AUDITORIA-VISUAL.md`). Segunda ronda (migración de pantallas) en curso, tanda A aplicada (Home, ClassCard, BottomNavBar, AppHeader, Avatar) — ver `ESTADO.md` y `AUDITORIA-VISUAL.md` para el detalle y la Fase 2 (alineación) pendiente de tus capturas anotadas.
- **C4 — Esqueleto de carga en Home.**

### Sondeo de red y pulido técnico
- **A7 — Sondeo de red excesivo (polling de la app).** Diseño ya aprobado, sin aplicar.
- **A8 — Textos de correo de Supabase Auth** en español chileno neutro, con la marca (hoy en inglés, diseño por defecto).
- **C6 — Plantillas de correo de Supabase más allá de las dos de A8** (si hay otras), con diseño/logo.
- **C8 — Mejora menor en `AuthContext`** (re-render de más en `refreshActivationStatus`).
- **C9 — Polling de notificaciones dentro del panel de admin**, sin razón de producto.

### Preparación técnica del build y de las actualizaciones (configurar, sin pagar ni publicar)
- **A4 — Build de producción de EAS.** Perfil `production`, variables `EXPO_PUBLIC_*`, keystore — todo se puede dejar listo sin la cuenta de Google Play; esa cuenta solo hace falta para *subir* el build a la tienda, no para construirlo.
- **A5 — `expo-updates` activado.** Ya evaluado (1.000 usuarios activos/mes gratis, alcanza).
- **A6 — Sentry con diseño de privacidad previo.** Tiene plan gratuito propio — no es uno de los costos pospuestos. Falta decidir qué datos nunca salen del teléfono antes de integrarlo.
- **A10 — Preparar la ficha de Google Play** (textos, capturas, descripción, ícono, cuestionario de clasificación de contenido, permisos declarados) — se escribe y arma sin tener la cuenta pagada; solo *subirla* la necesita.
- **A11 — `main` 162 commits atrás de la rama de trabajo.** Igualar la rama por defecto con lo que de verdad se despliega, antes de publicar de verdad.
- **A9 — Limpieza previa al lanzamiento.** Plan en 4 pasos ya diseñado; no se ejecuta sin tu pedido explícito.

### Respaldo mientras no haya Supabase Pro
- **A2 — Rutina de respaldo manual** (ver "Mitigaciones sin costo" abajo) — la mitigación real mientras no haya respaldo automático. Ver la regla del primer usuario real, en "Etapa final".
- **A1 — Sondeo anti-pausa de Supabase** — ~~HECHO (2026-10-19)~~, ver abajo y `ESTADO.md`.

---

## Mitigaciones sin costo mientras tanto

Mientras se sigue en los planes gratis con usuarios reales, hay dos riesgos concretos y ambos tienen una mitigación gratuita:

### 1. Que el proyecto de Supabase se pause por inactividad
Confirmado en la página oficial de precios (`supabase.com/pricing`, revisada 2026-10-18): **"Free projects are paused after 1 week of inactivity."** Con usuarios reales entrando todos los días esto no debería pasar nunca — pero conviene una red de seguridad que no dependa de que haya tráfico real.

**Mitigación: HECHA y desplegada (2026-10-19).** Worker de Cloudflare `wodplace-keepalive` (código en `workers/keepalive/` del repo), Cron Trigger cada 12 horas, hace una consulta mínima (`app_settings`, siempre vacía, sin datos) y avisa por correo a Pía si deja de correr (healthchecks.io). Ver detalle completo en `ESTADO.md`, "Hecho recientemente".

### 2. Que no haya respaldo de la base ni del almacenamiento
Confirmado en la misma página oficial: **el plan Free no incluye respaldos automáticos** ("Automatic backups aren't included on the Free plan"). Con usuarios reales, no tener ningún respaldo es el riesgo más serio de toda esta lista — un error de mi parte o un incidente en Supabase podría perder datos reales sin forma de recuperarlos.

**Mitigación (gratis, pero manual):** una rutina periódica donde yo genero un volcado de la base (`pg_dump`, con la conexión de servicio que ya uso) y copio los archivos de Storage, y tú los guardas fuera del repositorio (en tu Google Drive o donde prefieras — nunca en GitHub, son datos de personas reales). Instrucciones simples para ti:
1. Yo te aviso cuándo toca (sugiero: una vez por semana mientras haya pocos usuarios; más seguido si crece rápido).
2. Yo genero el archivo y te lo entrego.
3. Tú lo subes a un lugar seguro fuera del repo (Drive, disco externo, lo que ya uses) y me confirmas que quedó guardado.
4. Yo borro mi copia local una vez confirmado.

Esto NO sustituye el respaldo automático de un plan pagado — es mejor que nada, pero depende de que nadie se olvide de hacerlo. **Ver la regla del primer usuario real en "Etapa final" — esta rutina manual es solo el puente hasta que esa regla se dispare.**

### Riesgos que quedan mientras se usan los planes gratis
- **Sin respaldo automático** (mitigado parcialmente, manual, como arriba — hasta que se dispare la regla del primer usuario real).
- **Límite de 30 correos/hora** en Supabase Auth (confirmación de cuenta, recuperación de contraseña) — con pocos usuarios no debería notarse, pero un pico de registros (por ejemplo, el día del lanzamiento si hay difusión) podría topar el límite y dejar a alguien sin su correo de confirmación a tiempo.
- **Render, servicio gratis se "duerme"** tras 15 minutos sin tráfico (confirmado en `render.com/docs/free`, revisado 2026-10-18) y tarda sobre un minuto en despertar — el primer request de cada rato de inactividad se ve lento. No es un error, pero sí una mala primera impresión si pasa justo en el peor momento (alguien probando la app por primera vez).
- **Sin límite de sesiones concurrentes ni bloqueo de contraseñas filtradas** (ambos exclusivos del plan Pro de Supabase) — superficie de seguridad algo mayor, aunque no bloqueante para un lanzamiento acotado. Ver "Etapa final".

---

## Etapa final — pagos, temas legales, y lo que depende de un tercero

**Regla explícita (decidida 2026-10-21): el PRIMER USUARIO REAL (alguien fuera de ti y de las cuentas de prueba, usando la app de verdad) dispara dos cosas de inmediato, aunque sea antes de llegar al final de esta lista:**
1. **La activación del plan Pro de Supabase** (respaldos automáticos reales) — no se espera a tener todo lo demás listo.
2. **Un simulacro de restauración** — probar de verdad que un respaldo se puede restaurar, no solo que existe. Sin esto, un respaldo automático que nunca se probó a restaurar es una falsa sensación de seguridad.

Mientras ese primer usuario real no exista, se sigue con la rutina de respaldo manual (ver arriba) y el resto de esta etapa espera sus propios plazos, no el mío.

| Ítem | Plazo de espera | Qué se prepara sin costo mientras tanto |
|---|---|---|
| **Cuenta de Google Play Console** (US$25 único — ver costo verificado abajo) | Verificación de identidad de Google: puede tardar **días**. Además, según varias fuentes de terceros (no confirmado en una página oficial de Google), **una cuenta personal creada después de noviembre de 2023 necesita una prueba cerrada de al menos 14 días continuos con 12 testers reales antes de poder publicar en producción** — si esto aplica, es otro plazo de **~2 semanas** encima del trámite de la cuenta. Conviene confirmarlo apenas se cree la cuenta, no asumirlo. | A10 (ficha completa) y A4 (build de producción) — ambos listos para subir el día que la cuenta y, si aplica, la prueba cerrada, estén aprobadas. |
| **Cuenta de Apple Developer** (pagada, para login con Apple — C7) | Rápida una vez pagada (normalmente el mismo día a pocos días) — no es la que más demora. **Sin prioridad para el lanzamiento en Android**, solo importa si/cuando se lance en iOS. | Nada que preparar antes — el login con Apple sigue simulado (`__DEV__`) hasta que se pague. |
| **Plan Pro de Supabase** (US$25/mes + crédito de cómputo) | Activación inmediata al pagar — **pero el momento de pagar lo dispara la regla del primer usuario real arriba, no una fecha fija.** | Rutina de respaldo manual (ver "Mitigaciones" arriba) + confirmar con el panel de Supabase, apenas se active, que el simulacro de restauración funciona de verdad. |
| **Plan pagado de Render (Starter, ~US$7/mes, sin confirmar en la fuente oficial — ver tabla de costos abajo)** | Inmediato al pagar, sin plazo de trámite. El más postergable de los tres pagos técnicos. | Nada especial — el Worker anti-pausa ya cubre el riesgo de pausa; este plan solo evita el "despertar lento" y el corte de ~2 minutos en cada despliegue. |
| **Bloqueo de contraseñas filtradas de Supabase** | Viene incluido al activar el plan Pro — mismo plazo que Pro arriba, sin trámite propio. | Nada — depende solo de activar Pro. |
| **Documentos legales** (autorización de cumpleaños de menores, Ley 21.719/política de privacidad + ARCO) | **Pía los investiga ella misma, sin prioridad por ahora** — sin plazo fijo de mi lado. La Ley 21.719 entra en vigor el **1 de diciembre de 2026**, sea cual sea el estado de esto. | Nada de mi parte hasta que Pía traiga el texto o la decisión — queda fuera de mi cola de trabajo por ahora. |

### Costos verificados (2026-10-18, en la fuente oficial de cada uno — revisa el link antes de pagar, por si cambiaron)

| Ítem | Costo | Fuente oficial | Para qué sirve |
|---|---|---|---|
| **Cuenta de Google Play Console** | US$25 **único**, no se repite | [support.google.com — registro de Play Console](https://support.google.com/googleplay/android-developer/answer/6112435): *"There is a US$25 one-time registration fee"* | Obligatoria para publicar en Android — sin esto no se puede subir ninguna versión, ni siquiera en pruebas internas |
| **Supabase Pro** | US$25/mes, incluye US$10/mes de crédito de cómputo (cubre una instancia Micro) | [supabase.com/pricing](https://supabase.com/pricing): *"Pro plan starts at $25/month"*, *"$10 compute credits included"* | Respaldos automáticos reales, sin pausa por inactividad, límite de correos de Auth más alto, bloqueo de contraseñas filtradas, límite de sesiones |
| **Render, plan pagado (Starter)** | ~US$7/mes (cifra de varias fuentes de terceros fechadas 2026; la página oficial `render.com/pricing` no mostró el monto al revisarla el 2026-10-18 porque lo carga con JavaScript — **confirmar ahí mismo antes de pagar**) | — (sin confirmación oficial directa) | Que la API no se "duerma" tras 15 minutos sin tráfico (confirmado que sí pasa en el plan gratis, en `render.com/docs/free`) **y que cada despliegue no deje la API caída un rato** — medido en vivo el 2026-10-19: el despliegue del commit `2b38a3b` empezó a las 15:07:00 UTC y quedó disponible recién a las 15:08:50 UTC, **casi 2 minutos sin servicio** en el plan gratis (sin instancia de respaldo mientras la nueva arranca). Con alumnos reales usando la app, cualquier despliegue futuro tendría ese mismo corte. |

**Total estimado primer mes si se toman los tres juntos:** US$25 (único) + US$25 + ~US$7 ≈ **US$57**. Los meses siguientes, sin la cuenta de Google Play (que no se repite): ~US$32/mes (US$25 + ~US$7), o solo US$25/mes si se deja Render en el plan gratis y se vive con el "despertar" lento.

---

## B — Importante, puede ir poco después del lanzamiento

| # | Qué es | Esfuerzo | Depende de ti | Depende de mí |
|---|---|---|---|---|
| B1 | **Fase B de roles (B2 a B6): administrador, dueño, traspaso de box.** Diseño aprobado, sin empezar — quitarse el rol de administrador, proteger al dueño de quitarse sin ceder antes, reactivar "Invitar administrador", traspaso de box con PIN, recuperación del dueño por super admin. | 3-4 sesiones | Aprobar antes de aplicar (toca permisos) | Construir y probar cada sub-fase |
| B2 | **Fase C: contratos por rol.** Esperando los textos legales de coach/administrador (compromiso de confidencialidad/staff) — el Acuerdo de Plataforma pasa a ser solo del dueño. Diseño ya aprobado. | 2 sesiones (una vez con los textos) | Conseguir los textos legales de coach/administrador | Construir, con la misma lógica de versionado ya usada en los contratos de alumno |
| B3 | **Auditoría visual + tokens de diseño.** Hoy la escala tipográfica/espaciado centralizada solo existe en `home.tsx` — el resto de la app no la usa. Revisar inconsistencias antes de seguir agregando pantallas. *(Ver la auditoría de solo lectura ya entregada aparte, con los hallazgos concretos — ver también "Ahora, sin costo" arriba, en curso.)* | 2-3 sesiones | Nada, salvo revisar el resultado | Auditar y aplicar tokens compartidos |
| B4 | **CAPTCHA en registro.** Decidido para después del lanzamiento a propósito — hoy el límite de 120 registros/15min por IP es la única defensa de volumen, suficiente para empezar pero no para un bot dedicado. | 1-2 sesiones | Aprobar el proveedor (hCaptcha/Turnstile) | Integrar en la app y activar en Supabase (afecta a todos los clientes a la vez, hay que coordinarlo) |
| B5 | **WOD del día con una cuenta en más de un box.** Hoy usa "la membresía más reciente" — si el WOD de hoy está en el OTRO box, no aparece. No es un bug, es una limitación conocida del diseño actual (sin concepto de "box activo" elegible, como ya existe en super-admin). | 1-2 sesiones | Decidir si vale la pena el rediseño antes o después de tener varios boxes reales | Diseñar e implementar "box activo" |
| B6 | **Permiso `files_manage` de coach**, huérfano desde Fase B1 (nada lo revisa). Candidato a eliminar del catálogo. | 0,25 sesión | Nada | Eliminarlo |
| B9 | **Versionado del Acuerdo de Plataforma — fase (d): pantalla en super-admin para subir una versión nueva.** Base de datos y api-server ya listos y probados (paso c, 2026-10-19: `versionId` obligatorio, hash real, aal2 siempre exigido, `FOR UPDATE`). **Postergada a propósito hasta que exista el texto legal definitivo** — no tiene sentido ampliar la superficie (super-admin hablando con api-server por primera vez, `ALLOWED_ORIGINS` en Render, variable de build nueva en super-admin) para subir el mismo texto de prueba una y otra vez. Mientras tanto, si hiciera falta reemplazar el documento antes de que esto exista, ver el procedimiento manual en `ESTADO.md`. | 1 sesión (cuando llegue el texto) | Conseguir el texto legal definitivo del Acuerdo de Plataforma | Construir la pantalla + el cableado de `ALLOWED_ORIGINS`/variable de build, con tu aprobación aparte |
| B8 | **Acotar a `TO authenticated` las políticas RLS que hoy quedan sin restricción de rol (`{public}`) en 10+ tablas** (`boxes`, `payments`, `plans`, `box_settings`, `classes`, `member_invites`, `coaches`, `class_bookings`, `class_sessions`, `member_requests`, entre otras). Hallazgo del 2026-10-19: como se evalúan igual para `anon` que para una sesión real, una función revocada de `anon` puede tirar `401 permission denied for function` en vez de simplemente no aplicarle nada a una petición sin sesión — hoy se evita manteniendo el `EXECUTE` de `anon` abierto en las funciones que esas políticas llaman directo (`user_is_box_admin_or_super_admin`), aunque esa función en sí sea segura de exponer. Acotar las políticas de raíz evitaría depender de eso. | 1-2 sesiones | Aprobar antes de aplicar (toca RLS en 10+ tablas) | Relevamiento completo de cada política, migración y matriz de pruebas |
| B7 | **`box_owner_user_id`/`box_status`: mover su chequeo de la política RLS a un trigger.** Hallazgo del 2026-10-19 (Security Advisor): ninguna de las dos tiene chequeo interno propio, y hoy necesitan `EXECUTE` para `authenticated` porque la política RLS de `UPDATE` sobre `boxes` las llama directo en su `WITH CHECK` (para que un box_admin no pueda cambiar `owner_user_id`/`status` por su cuenta) — eso significa que cualquier cuenta logueada puede leerlas por RPC directo para CUALQUIER box (severidad baja: un uuid interno y un texto de estado, no datos personales). Propuesta: mover ese chequeo "no permitir cambiar esta columna" a un trigger `BEFORE UPDATE` en vez de la política RLS, que no necesita que el rol que hace la consulta tenga `EXECUTE` sobre nada — así se puede revocar `authenticated` de las dos sin romper que un dueño edite su propio box. | 1 sesión | Aprobar antes de aplicar (toca RLS) | Diseñar el trigger, migrar la política, probar en rollback y en vivo |

## C — Mejoras futuras, sin apuro

| # | Qué es | Esfuerzo | Depende de ti | Depende de mí |
|---|---|---|---|---|
| C1 | **RM en Historial: unidad original + conversión, y con/sin barra.** Mostrar "225 lb · 102,1 kg" es solo presentación (el dato ya existe). "Con/sin barra" necesita una columna nueva (nullable) — los RM ya guardados no tendrían ese dato retroactivamente. | 1 sesión | Nada | Agregar la columna + la presentación |
| C2 | **Pantalla muerta de "solicitudes de ingreso" (`member_requests`).** Confirmado remanente real: 0 filas, box-admin tiene pantalla para aprobar/rechazar pero nada en la app de alumno la crea nunca. Candidata a eliminar (o a completar el flujo del lado del alumno, si en algún momento se quiere esa función de verdad). | 0,5 sesión (eliminar) o 2 sesiones (completarla) | Decidir cuál de las dos | Ejecutar la que decidas |
| C3 | **`.gitattributes`** (`* text=auto eol=lf`) para que los archivos generados no se marquen como modificados solo por fin de línea. Cuidado con los scripts de Windows, que necesitan CRLF. | 0,25 sesión | Nada | Aplicar con cuidado, revisando qué cambia de verdad |
| C4 | **Esqueleto de carga en Home** (las tarjetas aparecen de golpe hoy). | 0,5 sesión | Nada | Aplicar |
| C5 | **Modo oscuro de la app general** (falta la clave `dark` en `constants/colors.ts` — hoy solo RM y los paneles de admin tienen paleta oscura). | 2-3 sesiones | Decidir si se quiere para el lanzamiento o después | Construir la paleta y revisar cada pantalla |
| C6 | **Plantillas de correo de Supabase más allá de las dos de A8** (si hay otras, verificación de cambio de correo, etc.) con el diseño/logo de la marca, no solo el texto. | 1 sesión | Aprobar el diseño | Aplicar |
| C7 | **Login con Apple.** Simulado hoy, oculto detrás de `__DEV__` — necesita una cuenta de Apple Developer pagada (ver "Etapa final"). **No bloquea el lanzamiento en Android** — solo importa si/cuando se lance en iOS. | — | Decidir si/cuándo se paga la cuenta de Apple | Implementar cuando corresponda |
| C8 | **Mejora menor en `AuthContext`** (evitar un re-render de más en `refreshActivationStatus` comparando antes de actualizar, igual que ya se hace con `user`). Sin impacto funcional, solo rendimiento fino. | 0,25 sesión | Nada | Aplicar |
| C9 | **Polling de notificaciones también corre dentro del panel de admin** (cada 30s, sin razón de producto mientras se usa el WebView). | 0,25 sesión | Nada | Aplicar |

---

## Ya completo, sin pendientes bloqueantes

- **S3.B (segundo factor para super admin):** completo, interruptor encendido (ver `ESTADO.md`).
- **S4 (seguridad general del servidor — helmet, límites, express):** desplegado; solo falta tu confirmación visual en el teléfono/panel, no bloquea nada.
- **Clases terminadas, rechazadas también en el servidor:** hecho y probado.
- **RM/Historial, el bug de que no aparecía al guardar:** corregido (distinto de C1, que es una mejora de presentación, no un bug).
- **Invitación de staff y de alumno (Fase A, B0/B1a/B1):** completas y en producción.
- **Recuperación de contraseña, correo propio, cumpleaños:** completos.
- **Versionado del Acuerdo de Plataforma, pasos (a)(b)(c):** migraciones, aplicación en firme y aceptar-solo-la-vigente — hechos y verificados en producción. Paso (d) en `B9` arriba.

---

## Orden sugerido

1. **Visual, sondeo de red, pulido y preparación técnica** ("Ahora, sin costo" arriba) — todo en paralelo, sin depender de nadie externo.
2. **Rutina de respaldo manual (A2)** — ya, mientras no haya Pro. Revisar su frecuencia cada vez que crezca el uso real.
3. **Documentos legales** — fuera de mi cola, Pía los trae cuando los tenga.
4. **Primer usuario real** → dispara Supabase Pro + simulacro de restauración (regla de "Etapa final"), sin esperar lo demás.
5. **El resto de "Etapa final"** (Google Play, Apple, Render pagado) — cuando Pía decida, cada uno con su propio plazo de trámite.
6. **Grupo B**, después del lanzamiento, en el orden que prefieras.
