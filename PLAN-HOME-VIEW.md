# Plan — Home con datos inventados (opción B): `HomeView` + pantalla solo de desarrollo

Fecha: 2026-10-27. **Solo plan, sin código. Espera el OK de Pía.**

## 1. Idea
Separar de `app/home.tsx` lo que se DIBUJA (el contenido del `ScrollView`) de lo que se CALCULA (consultas, hooks, reglas). Lo que se dibuja pasa a un componente `HomeView` que recibe un objeto de datos y los eventos; `HomeScreen` sigue calculando todo igual y se lo entrega. Una pantalla solo de desarrollo le entrega a ese mismo `HomeView` datos inventados, para ver cada estado sin tocar la base de datos.

## 2. Qué se extrae de `home.tsx` (traslado puro, sin cambios visibles)
- **A `components/home/HomeView.tsx`:** todo el contenido del `ScrollView`, desde la cabecera ("Hola, …") hasta "Próximos cumpleaños" (unas 600 líneas de JSX), **más los estilos que usa** (`StyleSheet` de esas secciones) y los pequeños ayudantes puramente visuales (`HeaderPattern`, `BoxLogoImage`, iniciales y etiqueta de cumpleaños).
- **Se queda en `HomeScreen`:** las consultas y hooks (plan, medallas, PR, WOD, avisos, contratos, cumpleaños, sesión), `AppHeader` con la campana, el menú lateral, los modales (unirse a un box, popup del aviso, alerta de "box aprobado") y las reglas (qué PR rota hoy, cuál es la próxima clase, etc.).
- **Cómo queda `HomeScreen`:** `const data = useHomeViewData()` (el mismo código de hoy, solo reunido en un hook al principio del archivo) y `<HomeView data={data} events={…} />` dentro del `ScrollView` actual.
- **Un cambio chico fuera de `home.tsx`:** `AppHeader` lee la cantidad de notificaciones sin leer directo del contexto; para mostrar el estado "sin notificaciones" en la pantalla de desarrollo se le agrega una propiedad opcional `unreadCount` que, si no se pasa, usa el contexto como hoy (sin efecto en la app real).

## 3. El objeto de datos (`HomeViewData`) y los eventos
```
HomeViewData {
  userName, userRank                      // saludo y "Tu nivel"
  ownBirthdayToday                        // tarjeta ¡Feliz cumpleaños!
  box: { name, photoUrl | null } | null   // cabecera
  hasBoxMembership: true | false | null   // false = tarjeta "Unirte a un box"; null = cargando
  planNotice: { classesRemaining | null, daysUntilRenewal | null } | null   // aviso de plan por vencer
  nextClass: { state: 'loading' | 'invite' | 'booked', booked?: { chip, type, coach, durationLabel, level } }
  quote                                   // frase del día
  pendingContract: boolean                // "Aviso Importante" de contrato
  pinnedAviso: { title, body | null, imageUrl | null } | null
  wod: { name, description, registered } | null
  planView                                // resultado de planProgressView (none | loading | unlimited | classes)
  streakDays
  featuredPr: { liftName, weightKg } | null
  medals: { unlocked, total, recent: { id, icon, name } | null }
  birthdays: { name, month, day, daysUntil }[]
}
HomeViewEvents { onJoinBox, onOpenCalendar, onOpenContracts, onOpenWod, onOpenRm, onOpenProfileData, onOpenMedals, onShareQuote }
```
Los textos del dibujo (por ejemplo "Tu próxima clase", "Plan ilimitado") siguen dentro de `HomeView`: los datos traen valores, no frases.

## 4. Estados con su chip (pantalla `app/dev-home.tsx`)
Base: "alumna típica" (con box, sin reserva, sin plan). Los chips se agrupan; dentro de un grupo se elige uno, y los grupos se combinan:
- **Cumpleaños:** `Cumpleaños hoy` · `Sin cumpleaños` · `Lista de cumpleaños` (con uno "Hoy").
- **Box:** `Sin box` · `Con box` · `Nombre de box largo` · `Sin logo (inicial)`.
- **Próxima clase:** `Cargando` · `Sin clase / invitación` · `Con reserva sin coach` · `Con reserva con coach`.
- **Contrato:** `Contrato pendiente` · `Sin contrato pendiente`.
- **Aviso fijo:** `Aviso con imagen` · `Aviso sin imagen` · `Sin aviso`.
- **Plan:** `Plan por vencer` (≤2 clases y ≤7 días) · `Plan ilimitado` · `Plan con clases` · `Sin plan` · `Cargando plan`.
- **WOD:** `WOD registrado` · `WOD sin registrar` · `Sin WOD`.
- **PR:** `PR vacío` · `PR con marca`.
- **Racha:** `Racha 0` · `Racha 12`.
- **Medallas:** `Medallas 0` · `Medallas varias`.
- **Campana:** `Sin notificaciones` · `3 sin leer`.
- **Extra:** `Mis datos reales`, que usa el mismo `useHomeViewData()` de la Home verdadera (ver 6).
La entrada del menú lateral y la pantalla existen solo con `__DEV__` (igual que la galería de componentes); en una build de producción la pantalla redirige a Inicio.

## 5. La prueba de que el traslado es puro
1. **Commit 1 (solo el traslado, sin pantalla de desarrollo):** `git diff --color-moved=dimmed-zebra --color-moved-ws=allow-indentation-change` mostrará el JSX y los estilos como bloques movidos sin cambios; lo único distinto son las líneas de `const { … } = data` al inicio de `HomeView`, que dan a las variables **los mismos nombres de hoy** para que el JSX quede idéntico.
2. Una comparación automática: un script normaliza (sin espacios ni indentación) el bloque de JSX y los estilos antes y después, y comprueba que son iguales; se entrega junto al commit.
3. Typecheck de todo el monorepo, `expo export` de Android y las pruebas de lógica ya existentes (17 de Inicio y 68 del candado).
4. `check:pressed-opacity`: sus entradas están ligadas al archivo `app/home.tsx`; al mover los estilos las tengo que **re-apuntar a `components/home/HomeView.tsx`** (mismos textos y mismas cantidades). **Es una modificación de esa lista, así que la hago solo con tu OK explícito** y sin agregar entradas nuevas.
5. **Commit 2:** la pantalla de desarrollo y el chip de cada estado (sin tocar `HomeView`).

## 6. Cómo verificarás en tu teléfono que Home real queda idéntica
1. **Antes de empezar** (en el commit actual): captura de tu Home real, de arriba abajo, en dos estados: sin reserva y con una clase reservada (la cancelas después).
2. **Después del traslado:** las mismas dos capturas, en el mismo orden; las comparamos una sobre otra (deben ser iguales, píxel por píxel salvo la hora).
3. En la pantalla de desarrollo, el chip `Mis datos reales` dibuja con `HomeView` **tus datos reales** con el mismo cálculo de la Home verdadera: debe verse igual que la Home real en ese momento. Si no, el traslado cambió algo.
4. Recorres los chips y confirmas cada estado.

## 7. Esfuerzo, riesgo y reversa
- 1 a 1,5 sesiones. Riesgo bajo: cero cambios en servidor y en base de datos; el único punto delicado es mover estilos (por eso la comparación automática y las capturas). Cada commit se revierte con `git revert`.
- Lo que desbloquea: ver y probar cualquier estado de Inicio (incluidos los que no se pueden armar con datos reales: error de carga, nombre de box largo, cumpleaños hoy) sin crear ni borrar nada en Mi Box.
