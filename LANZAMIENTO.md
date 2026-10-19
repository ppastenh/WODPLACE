# LANZAMIENTO.md

Consolidado priorizado de todo lo que falta para publicar WODPLACE en Android. Hecho leyendo `ESTADO.md` completo y el código real — nada de esto está aplicado, es solo el plan. Se actualiza junto con `ESTADO.md` a medida que se avanza.

**Esfuerzo:** en "sesiones de trabajo" tuyas y mías juntos (no horas de reloj) — una sesión típica de este proyecto. Es una estimación, no una promesa.

**Prioridad de costo (2026-10-18):** por ahora no se paga nada (cuenta de Google Play, plan Pro de Supabase, plan de pago de Render). Todo lo que se puede preparar sin costo va primero; lo que cuesta dinero queda junto al final, con el costo verificado.

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

Esto NO sustituye el respaldo automático de un plan pagado — es mejor que nada, pero depende de que nadie se olvide de hacerlo. Es la razón principal por la que el Plan Pro de Supabase está primero en la lista de "cuando haya presupuesto" más abajo.

### Riesgos que quedan mientras se usan los planes gratis
- **Sin respaldo automático** (mitigado parcialmente, manual, como arriba).
- **Límite de 30 correos/hora** en Supabase Auth (confirmación de cuenta, recuperación de contraseña) — con pocos usuarios no debería notarse, pero un pico de registros (por ejemplo, el día del lanzamiento si hay difusión) podría topar el límite y dejar a alguien sin su correo de confirmación a tiempo.
- **Render, servicio gratis se "duerme"** tras 15 minutos sin tráfico (confirmado en `render.com/docs/free`, revisado 2026-10-18) y tarda sobre un minuto en despertar — el primer request de cada rato de inactividad se ve lento. No es un error, pero sí una mala primera impresión si pasa justo en el peor momento (alguien probando la app por primera vez).
- **Sin límite de sesiones concurrentes ni bloqueo de contraseñas filtradas** (ambos exclusivos del plan Pro de Supabase) — superficie de seguridad algo mayor, aunque no bloqueante para un lanzamiento acotado.

---

## A — Imprescindible para lanzar, sin costo

Todo lo de aquí se puede preparar o terminar sin gastar dinero.

| # | Qué es | Esfuerzo | Depende de ti | Depende de mí |
|---|---|---|---|---|
| A1 | ~~Sondeo anti-pausa de Supabase~~ — **HECHO (2026-10-19)**, ver "Mitigaciones" arriba y `ESTADO.md`. | — | — | — |
| A2 | **Rutina de respaldo manual** (ver "Mitigaciones" arriba) — definir la frecuencia y dejarla funcionando una primera vez juntos. | 0,5 sesión | Elegir dónde vas a guardar los archivos, confirmar la frecuencia | Generar el primer respaldo de prueba y dejarte las instrucciones escritas |
| A3 | **Documentos legales.** (a) Texto de autorización de cumpleaños de menores: borrador, pendiente de tu abogado. (b) Ley 21.719 (entra en vigor el 1 de diciembre de 2026): falta política de privacidad propia y autoservicio de derechos ARCO (ver/corregir/eliminar los propios datos) — no iniciado. | 2-3 sesiones (una vez con los textos) | Conseguir revisión legal de (a) y el texto de (b); decidir el alcance de ARCO (¿pantalla en la app, o un correo a `info@wodplace.cl` basta para partir?) | Construir la pantalla/flujo de ARCO, integrar los textos finales |
| A4 | **Build de producción de EAS.** Hoy solo existe el perfil `development` en `eas.json`. Falta: perfil `production` apuntando a las URLs reales; variables `EXPO_PUBLIC_*` en EAS; firma de la app (keystore) generada y resguardada. Se puede dejar listo sin tener aún la cuenta de Google Play — solo para subir a la tienda se necesita esa cuenta. | 1 sesión | Nada, salvo aprobar | Configurar perfil + variables, generar y probar el build |
| A5 | **`expo-updates` activado.** Ya evaluado (1.000 usuarios activos/mes gratis, alcanza para el lanzamiento) — falta aplicarlo de verdad al build de producción. | 0,5 sesión | Aprobar | Aplicar y probar que una actualización OTA llega a un dispositivo real |
| A6 | **Sentry con diseño de privacidad previo.** Tiene un plan gratuito propio (volumen limitado, alcanza para el lanzamiento) — no es uno de los costos que estás posponiendo. No se integra "prender y listo": antes hay que decidir qué datos NUNCA deben salir del teléfono (nombre/email/teléfono de un miembro). | 1 sesión | Aprobar el diseño de privacidad | Diseñarlo y aplicarlo |
| A7 | **Sondeo de red excesivo (polling de la app).** Diseño ya aprobado (notificaciones cada 60s solo en primer plano, `staleTime` más largo, invalidación inmediata tras acciones, pausa real en segundo plano) — sin aplicar. Reduce el riesgo del servidor gratuito de Render con varios alumnos a la vez, y gasta menos batería/datos de tu lado. | 1-2 sesiones | Aprobar antes de aplicar (toca varias pantallas) | Aplicar y correr la matriz de pruebas ya definida |
| A8 | **Textos de correo de Supabase Auth (confirmación de cuenta, recuperación de contraseña).** Hoy en inglés, con el diseño por defecto de Supabase — primera impresión real de cualquier persona que se registre. | 0,5 sesión | Pegar el texto final en el panel de Supabase (o dame el visto bueno y te doy el texto para pegar) | Redactar el texto en español chileno neutro, con la marca |
| A9 | **Limpieza previa al lanzamiento.** Plan ya diseñado (4 pasos: respaldo, definir contigo qué significa "como nuevo", mostrarte la lista completa antes de borrar, borrado + verificación). No se ejecuta sin tu pedido explícito. | 1 sesión | Decidir qué se conserva de tus boxes/cuentas de prueba, dar el OK final | Ejecutar y verificar |
| A11 | **`main` está 162 commits atrás de la rama de trabajo (`chore/expo-sdk-57`).** Confirmado el 2026-10-19 al revisar dónde poner el workflow anti-pausa de Supabase: la rama por defecto del repo (`ppastenh/WODPLACE`) es `main`, pero no tiene nada de lo construido en meses (S3-B, S4, esta misma ronda visual, etc.) ni ningún archivo `.github/workflows`. Lo que de verdad está en producción hoy (api-server en Render, box-admin/super-admin en Cloudflare) se despliega siempre desde `chore/expo-sdk-57` — confirmado de forma empírica, viendo que cada push a esa rama disparó un despliegue real en las últimas semanas — nunca desde `main`. Antes de publicar de verdad conviene que la rama por defecto y lo que se despliega sean la misma rama (evita que alguien clone el repo y vea un código viejo por defecto, y deja `main` disponible para automatizaciones de GitHub que solo corren ahí). | 0,5 sesión (hacer `main` igual a `chore/expo-sdk-57`, o renombrar) | Decidir y aprobar el momento (es un cambio de rama, no reversible tan fácil) | Ejecutarlo con cuidado y confirmar que Render/Cloudflare sigan apuntando a la rama correcta después |
| A10 | **Preparar la ficha de Google Play** (textos, capturas, descripción, ícono, cuestionario de clasificación de contenido, declaración de permisos usados) — se puede escribir y armar todo esto sin tener aún la cuenta pagada; solo *subirla* requiere la cuenta (ver más abajo). | 1 sesión | Decidir textos/capturas | Confirmar el nivel de API que pide Android, armar la ficha técnica, revisar permisos declarados |

---

## Al final, cuando haya presupuesto

Costos verificados hoy (2026-10-18) en la fuente oficial de cada uno — revisa el link antes de pagar, por si cambiaron.

| Ítem | Costo | Fuente oficial (revisada 2026-10-18) | Para qué sirve |
|---|---|---|---|
| **Cuenta de Google Play Console** | US$25 **único**, no se repite | [support.google.com — registro de Play Console](https://support.google.com/googleplay/android-developer/answer/6112435): *"There is a US$25 one-time registration fee"* | Obligatoria para publicar en Android — sin esto no se puede subir ninguna versión, ni siquiera en pruebas internas |
| **Supabase Pro** | US$25/mes, incluye US$10/mes de crédito de cómputo (cubre una instancia Micro) | [supabase.com/pricing](https://supabase.com/pricing): *"Pro plan starts at $25/month"*, *"$10 compute credits included"* | Respaldos automáticos reales, sin pausa por inactividad, límite de correos de Auth más alto, bloqueo de contraseñas filtradas, límite de sesiones |
| **Render, plan pagado (Starter)** | ~US$7/mes (cifra de varias fuentes de terceros fechadas 2026; la página oficial `render.com/pricing` no mostró el monto al revisarla el 2026-10-18 porque lo carga con JavaScript — **confirmar ahí mismo antes de pagar**) | — (sin confirmación oficial directa) | Que la API no se "duerma" tras 15 minutos sin tráfico (confirmado que sí pasa en el plan gratis, en `render.com/docs/free`) |

**Total estimado primer mes si se toman los tres juntos:** US$25 (único) + US$25 + ~US$7 ≈ **US$57**. Los meses siguientes, sin la cuenta de Google Play (que no se repite): ~US$32/mes (US$25 + ~US$7), o solo US$25/mes si se deja Render en el plan gratis y se vive con el "despertar" lento.

**Sugerencia de orden cuando decidas pagar:** primero la cuenta de Google Play (es la única que bloquea publicar, y el trámite de verificación de identidad puede tardar días — conviene partirlo apenas se decida, en paralelo a lo demás); después Supabase Pro (por el respaldo automático, el riesgo más serio de la lista); Render de último y es el más postergable de los tres (la mitigación del "despertar lento" es solo una mala primera impresión, no pérdida de datos).

---

## B — Importante, puede ir poco después del lanzamiento

| # | Qué es | Esfuerzo | Depende de ti | Depende de mí |
|---|---|---|---|---|
| B1 | **Fase B de roles (B2 a B6): administrador, dueño, traspaso de box.** Diseño aprobado, sin empezar — quitarse el rol de administrador, proteger al dueño de quitarse sin ceder antes, reactivar "Invitar administrador", traspaso de box con PIN, recuperación del dueño por super admin. | 3-4 sesiones | Aprobar antes de aplicar (toca permisos) | Construir y probar cada sub-fase |
| B2 | **Fase C: contratos por rol.** Esperando los textos legales de coach/administrador (compromiso de confidencialidad/staff) — el Acuerdo de Plataforma pasa a ser solo del dueño. Diseño ya aprobado. | 2 sesiones (una vez con los textos) | Conseguir los textos legales de coach/administrador | Construir, con la misma lógica de versionado ya usada en los contratos de alumno |
| B3 | **Auditoría visual + tokens de diseño.** Hoy la escala tipográfica/espaciado centralizada solo existe en `home.tsx` — el resto de la app no la usa. Revisar inconsistencias antes de seguir agregando pantallas. *(Ver la auditoría de solo lectura ya entregada aparte, con los hallazgos concretos.)* | 2-3 sesiones | Nada, salvo revisar el resultado | Auditar y aplicar tokens compartidos |
| B4 | **CAPTCHA en registro.** Decidido para después del lanzamiento a propósito — hoy el límite de 120 registros/15min por IP es la única defensa de volumen, suficiente para empezar pero no para un bot dedicado. | 1-2 sesiones | Aprobar el proveedor (hCaptcha/Turnstile) | Integrar en la app y activar en Supabase (afecta a todos los clientes a la vez, hay que coordinarlo) |
| B5 | **WOD del día con una cuenta en más de un box.** Hoy usa "la membresía más reciente" — si el WOD de hoy está en el OTRO box, no aparece. No es un bug, es una limitación conocida del diseño actual (sin concepto de "box activo" elegible, como ya existe en super-admin). | 1-2 sesiones | Decidir si vale la pena el rediseño antes o después de tener varios boxes reales | Diseñar e implementar "box activo" |
| B6 | **Permiso `files_manage` de coach**, huérfano desde Fase B1 (nada lo revisa). Candidato a eliminar del catálogo. | 0,25 sesión | Nada | Eliminarlo |
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
| C7 | **Login con Apple.** Simulado hoy, oculto detrás de `__DEV__` — necesita una cuenta de Apple Developer pagada. **No bloquea el lanzamiento en Android** — solo importa si/cuando se lance en iOS. | — | Decidir si/cuándo se paga la cuenta de Apple | Implementar cuando corresponda |
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

---

## Orden sugerido

1. **A1 y A2 (mitigaciones sin costo)** — primero de todo, porque reducen el riesgo más serio (perder datos reales) mientras se sigue en planes gratis.
2. **A3 (documentos legales)** — empieza en paralelo, depende de tu abogado y tiene su propio tiempo de espera.
3. **A4-A6 (build de producción, updates, Sentry)** y **A9 (limpieza)** — técnico, se puede hacer todo sin la cuenta de Google Play.
4. **A7 (sondeo de red) y A8 (correos)** — rápidos, en cualquier momento antes del build final.
5. **A10 (ficha de Play, preparación)** — se escribe y arma sin costo; queda lista para el día que se pague la cuenta.
6. **Cuando decidas pagar:** Google Play → Supabase Pro → Render, en ese orden (ver la tabla de costos arriba).
7. **Grupo B**, después del lanzamiento, en el orden que prefieras.
