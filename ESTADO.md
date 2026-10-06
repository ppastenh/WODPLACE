# ESTADO.md

Estado de trabajo de WODPLACEtes. Se actualiza al terminar cada tarea — ver `CLAUDE.md` para las reglas de trabajo y los datos fijos del proyecto.

## Hecho recientemente

- Rediseño visual del Home de `wodplace` (varias rondas): encabezado reordenado y compacto, "Próxima clase" como tarjeta protagonista, frase motivacional como banner horizontal, grilla de estadísticas con íconos en círculo, escala tipográfica central (`constants/typography.ts`), barra inferior con el botón "Agendar" de vuelta a su círculo elevado pero con las etiquetas alineadas con los otros 4, tono de cobre más oscuro para texto chico sobre fondo claro (`colors.navActiveTextSmall`). Commit `577b04e`.
- Función completa de cumpleaños: tarjeta propia de "¡Feliz cumpleaños!" en Home, "Hoy" en la lista de "Próximos cumpleaños", cálculo de "hoy" en hora de Chile (servidor y cliente), 29 de febrero tratado como 1 de marzo en años no bisiestos, el propio usuario ya no aparece en su propia lista. Autorización de cumpleaños de menores: casilla opcional en el flujo de contrato, endpoint self-service que solo puede retirar (nunca otorgar), interruptor en la ficha del miembro en box-admin (solo admins del box). Tabla nueva `birthday_visibility_consents` con RLS admin-only acotada al box. Commit `577b04e`, desplegado y verificado en producción (`api.wodplace.cl`) y revisado por Pía en el teléfono y en box-admin.
- Botón "Aceptado" de Contratos Activos: el checkbox de cada documento ya no se da por marcado solo porque el documento ya se había leído antes — ahora exige el toque en esta sesión. Mensaje explícito "Para continuar, falta: ..." en vez de un botón desactivado sin explicación. Commit `84950bd`, revisado por Pía en el teléfono.
- Hueco de permisos en `contract_acceptances`: un coach podía antes reescribir cualquier columna de una fila de aceptación de contrato (no solo "visto"). Corregido: solo admins del box pueden actualizar, y solo pueden cambiar `seen_by_owner_at` — cualquier otro cambio es rechazado por la base de datos. Commit `336b10c` (solo migración SQL, ya aplicada; no requiere despliegue de ningún servicio).
- `CLAUDE.md` y `ESTADO.md` creados, integrando lo que ya existía en `replit.md` (que se mantiene, sin borrar nada).

## En curso

- Nada pendiente de esta tanda de trabajo — las 4 tareas de hoy (cumpleaños, botón de contratos, hueco de coaches, estos dos archivos) quedaron commiteadas y enviadas a `chore/expo-sdk-57`.

## Pendientes

- Escala tipográfica y de espaciado centralizada: hoy solo existe para `home.tsx`, no para el resto de las pantallas de `wodplace`.
- Modo oscuro: el hook `useColors()` ya soporta una clave `dark` en `constants/colors.ts`, pero esa clave no existe — todo cae siempre a la paleta clara.
- Estados de carga en Home: ninguna query tiene esqueleto/skeleton; las tarjetas aparecen de golpe cuando llega cada respuesta, con salto de layout.
- Consistencia de íconos en círculo ("iconBadge"): aplicada a las tarjetas de estadísticas y Medallas, pero no a "Aviso Importante" ni "WOD de hoy" (agregarlo ahí aumentaría el alto de esas tarjetas — quedó sin aplicar a propósito, avisado en su momento).

## Bloqueados

- **Login con Apple**: sigue completamente simulado (`AuthContext.tsx`) — necesita una cuenta de Apple Developer pagada antes de poder implementarse de verdad.
- **Documentos legales**: el texto de la casilla de autorización de cumpleaños de menores (y el texto informativo que la acompaña) es un borrador — pendiente de revisión por un abogado antes de publicarlo como definitivo.
- Ley 21.719 (protección de datos, Chile) entra en pleno efecto el 1 de diciembre de 2026 — faltan la política de privacidad propia de la app y el autoservicio de derechos ARCO (ver/corregir/eliminar los propios datos). No iniciado.

## Datos de prueba por limpiar

Ninguno pendiente. Las 4 cuentas `revision.*@wodplace.test` y la cuenta `pasten.hueche+menor1@gmail.com` (creada por Pía para probar el flujo de contrato de un menor) ya se borraron por completo — Auth, `wodplace_users`, `box_members`, `contract_acceptances`, `contract_read_progress` y `birthday_visibility_consents` — y se confirmó que la cuenta real de Pía no se tocó.

## Decisiones tomadas (no reabrir sin avisar)

- 29 de febrero: un cumpleaños en esa fecha se trata como 1 de marzo en años no bisiestos.
- Menores en "Próximos cumpleaños": aparecen SOLO con autorización del apoderado, mostrando solo el primer nombre y día/mes — nunca edad ni año. Reemplaza la decisión anterior (exclusión total de menores).
- La autorización de cumpleaños se puede otorgar solo de dos formas: la casilla del apoderado al aceptar el contrato por primera vez (nunca en una re-aceptación posterior), o un admin del box desde box-admin (nunca un coach). El endpoint self-service del propio alumno solo puede retirarla, nunca otorgarla.
- Botón "Agendar" de la barra inferior: vuelve a su círculo elevado (no queda al mismo nivel que los otros 4), pero las etiquetas de los 5 íconos quedan alineadas entre sí.
- En Contratos Activos, "leído" nunca cuenta como "aceptado": cada casilla exige un toque explícito en la sesión actual.
- Las fechas de nacimiento de cuentas de prueba para revisar cumpleaños se siembran siempre el mismo día de la revisión (relativas al día real en Chile), nunca con anticipación — quedan desactualizadas de un día para el otro.
