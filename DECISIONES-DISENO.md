Este archivo manda sobre la memoria de cualquier chat.

# Decisiones de diseño — WODPLACEtes

Cada decisión lleva su fecha y su estado. Lo que no está aquí no está decidido.

## (a) Rediseño desde cero

- **Fecha:** 2026-10-29
- **Estado:** VIGENTE
- **Antecedente:** el modo oscuro "Noche y cobre" (pasos a, b y c, hasta Comunidad, WOD, Plan y Contratos) quedó hecho y DETENIDO; no es la dirección actual. Etiqueta local `punto-antes-del-rediseno` sobre `eaca288`.

## (b) El modo claro actual debe quedar idéntico

- **Fecha:** 2026-10-29
- **Estado:** VIGENTE

## (c) Dirección

- **Fecha:** 2026-10-28 y 2026-10-29
- **Dirección:** sensación "premium y minimalista, elegante, con mucho aire". En Inicio protagonizan "ilustraciones o íconos propios".
- **Estado:** VIGENTE como intención. El concepto visual mostrado en el chat de seguridad está SIN CONFIRMAR.
- **REEMPLAZADA por (k)** (2026-10-30) en cuanto a la dirección de Inicio.

## (d) Descartado: carácter de marca CrossFit

- **Fecha:** 2026-10-28
- **Descartado:** el concepto de "carácter de marca CrossFit" con tipografía condensada y números grandes.

## (e) Fotos de Pexels

- **Tratamiento:** en blanco y negro o teñidas en cobre, siempre con velo oscuro.
- **`clase-piernas.jpg`:** https://www.pexels.com/es-es/foto/barra-negra-685530/ (recortada sin el logo de la zapatilla).
- **`frase-atardecer-cobre.jpg`:** https://www.pexels.com/es-es/foto/amanecer-paisaje-montanas-naturaleza-5669667/
- **Licencia Pexels:** uso comercial y modificación permitidos, sin atribución obligatoria.
- **Estado:** ELEGIDAS, EN PAUSA. No se integran en la dirección actual hasta nueva orden; siguen sin seguimiento en git.
- **ACTIVA** (2026-10-30; ver (o)): `home-banner-anillo.jpg` (Leon Mart, Pexels; sin tratamiento: la foto ya es oscura y cálida). Reemplazó a `clase-piernas.jpg` (era provisional, ver (n); eliminada del proyecto, queda en el historial de git). `frase-atardecer-cobre.jpg` sigue EN PAUSA.

## (f) Lema "Train · Connect · Evolve"

- **Estado:** descartado.

## (g) "Mi Box"

- "Mi Box" es un box ficticio de prueba.

## (h) Contraste mínimo

- 4,5:1 para texto normal.
- 3:1 para íconos y texto grande (24 px o más, o 18,66 px o más en negrita).

## (i) Estado presionado

- Sólido, nunca opacidad.

## (j) Método

- Un cambio a la vez, primero en la pantalla de desarrollo, y se revisa en el teléfono de Pía antes del siguiente.

## (k) Nueva dirección de Inicio

- **Fecha:** 2026-10-30
- **Decisión:** "Nueva dirección de Inicio: barra superior de carbón con logo centrado en Anton, banner fotográfico a todo el ancho con velo oscuro y tarjeta de vidrio (negro 55 a 65 % de opacidad, borde blanco muy sutil) con avatar, nombre del box y saludo, y una superficie crema (#F2E9DB) con esquinas superiores redondeadas para el contenido; menú inferior oscuro con Agenda elevado. Reemplaza el estado de (c); activa la foto clase-piernas.jpg de (e); (b) sigue vigente para Inicio real hasta mi aprobación."
- **Estado:** VIGENTE. Se trabaja SOLO en la pantalla de desarrollo "Estados de Inicio (dev)"; Inicio real no cambia hasta que Pía lo apruebe.

## (l) Ajuste del banner de Inicio

- **Fecha:** 2026-10-30
- **Decisión:** "Ajuste del banner de Inicio: la barra superior (menú, logo y campana) es un bloque sólido de carbón separado de la foto, y el banner empieza debajo de ella; reemplaza lo de la barra 'integrada sin separación' de (k); el banner es un 10 % más alto (foto con velo, medido bajo la barra); el saludo 'Hola, nombre' de la tarjeta de vidrio es más pequeño."
- **Estado:** VIGENTE. Se trabaja SOLO en la pantalla de desarrollo "Estados de Inicio (dev)"; Inicio real no cambia hasta que Pía lo apruebe.

## (m) Detalles del banner de Inicio

- **Fecha:** 2026-10-30
- **Decisión:** "Detalles del banner de Inicio: el alto baja un 5 % (de 202 a unos 192 dp); el borde de la tarjeta de vidrio es de cobre difuminado; el recuadro de cobre de la tarjeta (marcador del logo del box) es un poco transparente hasta que se agregue el logo definitivo, que será sólido; la foto se muestra con menos zoom."
- **Estado:** VIGENTE. Se trabaja SOLO en la pantalla de desarrollo "Estados de Inicio (dev)"; Inicio real no cambia hasta que Pía lo apruebe.

## (n) Foto del banner

- **Fecha:** 2026-10-30
- **Decisión:** "Foto del banner: se usa el recorte a todo el ancho (cover); la foto actual (clase-piernas.jpg) es PROVISIONAL y se cambiará; la nueva se mide en contraste antes de activarla."
- **Estado:** CUMPLIDA Y REEMPLAZADA por (o) (2026-10-30): la foto provisional se cambió por `home-banner-anillo.jpg`; la regla de medir el contraste antes de activar sigue vigente.

## (o) Foto del banner elegida

- **Fecha:** 2026-10-30
- **Decisión:** "Foto del banner: elegida la foto de Leon Mart (Pexels, anillo de gimnasia de madera con correa negra, poca luz) como home-banner-anillo.jpg, recorte a todo el ancho, 192 dp de alto; reemplaza a clase-piernas.jpg; las ilustraciones de línea (discos y barra) y las otras candidatas quedan descartadas por ahora; la foto se puede cambiar midiendo el contraste antes."
- **Estado:** VIGENTE. Se trabaja SOLO en la pantalla de desarrollo "Estados de Inicio (dev)"; Inicio real no cambia hasta que Pía lo apruebe.

## (p) Menú inferior

- **Fecha:** 2026-10-30
- **Decisión:** "Menú inferior: fondo carbón #0D0F10, igual a la barra superior, fijo abajo y extendido bajo la zona del sistema (insets.bottom); cinco opciones (Inicio, Comunidad, Agenda, Progreso y Perfil) con íconos lineales de trazo uniforme (Feather a 22 dp y la pesa de Progreso dibujada en SVG con el mismo trazo); íconos y rótulos inactivos en gris claro (#A29E94); opción seleccionada en cobre #B98250, con barra de acento de 3 px (siempre) y rótulo en negrita; Agenda es un botón circular central, elevado 14 dp (franja reservada dentro de la barra, que no capta toques), con fondo carbón y borde cobre (1,5 px; 2,5 px cuando está seleccionada). Rótulos de 11 sp en una sola línea. Presionado con color sólido (#25292D), sin opacidad; la opción ya seleccionada no se rellena al presionarla. Sin el indicador blanco del sistema (exigiría expo-navigation-bar, módulo nativo no instalado). Se aplica primero solo en la pantalla de desarrollo; la barra real no cambia hasta mi aprobación."
- **Pendiente (decisión sin tomar):** unificar la barra de Progreso (`RmBottomNav`, de 3 pestañas y colores del tema) con este menú. NO se unifica ahora.
- **Enmienda (2026-10-30, tras probar el prototipo en el teléfono de Pía):** "Sin barra de acento; la opción seleccionada y el borde de Agenda en cobre claro #C79A6B (el cobre #B98250 se veía naranjo); rótulos con crecimiento limitado a 1,1 veces (1,0 bajo 340 dp). Se aplica primero solo en la pantalla de desarrollo; la barra real no cambia hasta mi aprobación." Esto reemplaza lo de la barra de acento de 3 px y el cobre #B98250 de la decisión original.
- **Estado:** APROBADA como diseño definitivo (2026-10-30), con la enmienda de arriba: sin barra de acento, selección y borde de Agenda en #C79A6B, gris inactivo #A29E94 (se descartó #938F86), rótulos con crecimiento máximo 1,1 (1,0 bajo 340 dp) y botón de Agenda elevado con la opción B. Se aplica a la barra real según (q).

## (q) Diseño nuevo aplicado a la app real

- **Fecha:** 2026-10-30
- **Decisión:** "Diseño nuevo aplicado a la app real: menú inferior oscuro, Inicio con barra de carbón, banner con la foto home-banner-anillo.jpg, tarjeta de vidrio y superficie crema; HomeViewV2 reemplaza a HomeView; las demás pantallas conservan su cabecera hasta su rediseño; el cobre de los elementos oscuros se unifica en un cambio aparte; la barra de Progreso (RmBottomNav) queda pendiente."
- **Estado:** VIGENTE. Reemplaza lo de "solo en la pantalla de desarrollo" de (k) a (p) para Inicio y el menú inferior.

## (r) Tarjeta "Tu próxima clase" rediseñada

- **Fecha:** 2026-11-07
- **Decisión:** "Tarjeta 'Tu próxima clase' rediseñada: fondo grafito con la foto de pizarra de Noita Digital (Unsplash, licencia Unsplash) como textura a la derecha con velo negro de izquierda a derecha; cápsula de fecha C (vidrio oscuro con borde cobre y texto crema) con círculo cobre e ícono de calendario; cobre #B98250 en esta tarjeta; nombre de la clase en Anton; duración y nivel con íconos; flecha decorativa en círculo translúcido; formato rectangular de 126 a 140 dp. En el estado sin reserva ('Reserva tu próxima clase') el título es un poco más pequeño; sin franja ni barras: solo título y flecha. Los patrones de rombos, líneas y puntos y la foto del aro quedan como alternativas solo de la pantalla de desarrollo."
- **Estado:** VIGENTE. Se aplica a Inicio real (decisión (q)). Enmendada el 2026-11-07 con la aprobación explícita de Pía: la textura ya no es provisional (pizarra elegida).

## (s) Tarjeta de frases del día: elegida la opción C

- **Fecha:** 2026-11-08
- **Decisión:** "Tarjeta de frases del día: elegida la opción C editorialCream (serif cursiva, resaltado final por regla con marcado manual opcional); comillas dobles; alto base de 113 dp con la frase centrada y límite de 214 dp; sin flecha; la fuente definitiva se evalúa aparte. Fondo de paisaje en grises con velo oscuro uniforme del 62 % (sin degradado) y texto crema; resaltado en texto cobre claro (excepción consciente al contraste de 4,5:1, solo en las palabras resaltadas; medido: 2,13:1 en el peor caso, a 320, 360 y 412 dp); comillas del mismo color; ícono de compartir sin círculo visible, con área táctil de 48 dp y círculo sólido solo al presionar."
- **Estado:** VIGENTE. Excepción al contraste aceptada por Pía el 2026-11-08 (texto cobre claro #C79A6B sobre la foto con velo, 2,13:1; solo las palabras resaltadas; el resto de la tarjeta cumple 4,5:1).
- **Ajuste (2026-11-14, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** la frase y sus comillas en cobre #B98250 (charcoalAccent, el de las otras tarjetas), con las palabras resaltadas en crema, sin subrayado ni marcador; el ícono de compartir sigue en crema. EXCEPCIÓN CONSCIENTE al contraste mínimo de 4,5:1, aceptada por Pía y medida con el velo de 62 % (que no cambia): 1,64:1 en el peor punto (los puntos más claros de la foto, gris 255), 3,46:1 en el punto medio y 6,05:1 en el más oscuro. Reemplaza a la excepción anterior del resaltado en cobre claro (2,13:1). El fondo, la foto, el velo y el alto no cambian. Fecha corregida: la excepción se aceptó el 2026-11-14 (antes figuraba 2026-11-15). Después se retiró el chip de comparación de cobres y la línea de depuración: queda solo #B98250 con las palabras resaltadas en crema.

## (t) Tarjeta "Reserva tu próxima clase": barras //

- **Fecha:** 2026-11-08
- **Decisión:** "Tarjeta sin reserva: dos barras diagonales // de cobre como detalle decorativo a la izquierda del título."
- **Estado:** DESCARTADA el 2026-11-08 (pedido 18): la tarjeta sin reserva queda sin franja ni barras, ver (r).

## (v) Tarjeta "Progreso mensual": barra refinada en versión oscura

- **Fecha:** 2026-11-08
- **Decisión:** "Tarjeta 'Progreso mensual': diseño de barra refinada en versión oscura (grafito) con barra de cobre claro sobre pista oscura, número crema; plan ilimitado muestra solo el número con una cápsula de vidrio y sin barra; versión clara disponible solo para comparar en desarrollo."
- **Estado:** VIGENTE. Aprobada por Pía el 2026-11-08 (incluida su aprobación explícita para editar este archivo). Solo presentación: la lógica de planProgress y los datos no cambian. La versión anterior queda disponible con una constante (variante 'actual').
- **Estado sin plan (2026-11-09, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** "Estado sin plan: el título arriba y el mensaje 'Sin plan activo' centrado, sin barra ni guion." Solo presentación; la lógica de planProgress no cambia.
- **Enmienda (2026-11-09, aprobada por Pía, incluida su aprobación explícita para editar este archivo):** "Tarjeta 'Progreso mensual': barra refinada sobre fondo de cobre claro (#C79A6B) con letra oscura; plan ilimitado muestra solo el número con una cápsula de carbón y sin barra; estado sin plan con el título arriba y el mensaje 'Sin plan activo' centrado, sin barra ni guion; la tarjeta es el único bloque de color pleno de Inicio; las versiones oscura, clara y las otras combinaciones de cobre quedan descartadas." Esto REEMPLAZA la versión oscura (grafito) de esta decisión; la oscura, la clara, la actual (blanca) y las otras cinco combinaciones de cobre se guardan solo como parche local fuera del repositorio.
- **Ajuste (2026-11-15, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** Progreso mensual usa el mismo fondo de cobre oscuro que Medallas (degradado de #754522 a #8B5E34, brillo satinado y sombra), con todo el texto en crema; reemplaza al cobre claro con letra oscura.
- **Ajuste (2026-11-14, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** Progreso mensual usa como fondo una textura de pavimento de piedra (foto de ab_h_i s_h_ek_09, Pexels, licencia gratuita) en duotono de cobre (archivo `home-fondo-progreso.jpg`, intensidad media, 1116 × 375 px). Las dos tarjetas comparten la misma rampa de cobre (#5E3A1A a #8B5E34); el fondo liso anterior queda como respaldo (se recupera revirtiendo el commit de código; el degradado queda debajo de la foto mientras carga). El texto sigue en crema (peor punto 5,11:1). Créditos en `CREDITOS-IMAGENES.md`.

## (w) Recuadros "Tu nivel" y "Racha de constancia"

- **Fecha:** 2026-11-09
- **Decisión:** "Recuadros 'Tu nivel' y 'Racha de constancia': elegida la opción E (dos tarjetas independientes con insignias de escudo en cobre), tratamiento grafito, rango en Anton; las opciones C, el diseño anterior y el tratamiento cobre quedan descartados; los indicadores de racha son un progreso visual hasta siete, porque el cliente solo recibe el número de días seguidos, sin fechas."
- **Estado:** VIGENTE. Elegida por Pía el 2026-11-09 (incluida su aprobación explícita para editar este archivo); antes estuvo en evaluación entre C y E. El diseño anterior (tarjetas blancas), la opción C, el tratamiento cobre y el chip de tipografía se guardan solo como parche local fuera del repositorio. Solo presentación: los datos, la navegación y la lógica no cambian. "Tu nivel" conserva su toque (lleva a Datos personales); "Racha de constancia" no es un botón.

- **Ajuste (2026-11-15, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** la flecha de 'Tu nivel' es la de 'Tu próxima clase' en versión pequeña; 'Racha' no lleva flecha.
- **Ajuste (2026-11-15, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** la flecha de Tu nivel va en la esquina superior derecha, con el mismo margen que las de PR destacado y Medallas.

## (x) Tarjeta "PR destacado"

- **Fecha:** 2026-11-11
- **Decisión:** "Tarjeta 'PR destacado': concepto PR Champion en grafito con insignia hexagonal de cobre y barra olímpica, nombre del movimiento en Anton y marca en una cápsula con borde de cobre; el diseño anterior queda disponible en desarrollo; laureles descartados por defecto."
- **Estado:** VIGENTE (por implementar en el commit de código siguiente). Aprobada por Pía el 2026-11-11 (incluida su aprobación explícita para editar este archivo). Solo presentación: la rotación diaria del PR destacado, los datos y la navegación (toca → RM) no cambian. Variantes 'actual' y 'clara', laureles y la insignia de escudo quedan solo en la pantalla de desarrollo.
- **Enmienda (2026-11-11, aprobada por Pía, incluida su aprobación explícita para editar este archivo):** "Tarjeta 'PR destacado': concepto PR Champion en grafito con insignia hexagonal de cobre (el mismo cobre medio y el mismo tratamiento que las insignias de 'Tu nivel' y 'Racha') y barra olímpica, nombre del movimiento en Anton y marca en una cápsula con borde de cobre; sin laureles; alto estable en todos los estados; las variantes anterior, clara, de escudo y con laureles quedan descartadas." Esto REEMPLAZA lo de la decisión original sobre el cobre claro y sobre las variantes disponibles en desarrollo: las variantes se guardan solo como parche local fuera del repositorio.

- **Ajuste (2026-11-14, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** la flecha de la tarjeta es la de 'Tu próxima clase' en versión pequeña (círculo translúcido con borde de cobre y la flecha dentro).
- **Ajuste (2026-11-15, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** la flecha de PR destacado va en la esquina superior derecha, con el mismo margen que las de Tu nivel y Medallas.

## (y) Tarjeta "Medallas"

- **Fecha:** 2026-11-12
- **Decisión:** "Tarjeta 'Medallas': diseño Copper Achievement, tarjeta de cobre con contador en Anton, barra de progreso con las medallas reales y la última medalla rodeada por una corona de laurel simétrica de dos ramas; degradado entre cobre profundo y cobre oscuro para mantener el contraste del texto; el diseño anterior queda disponible en desarrollo."
- **Estado:** VIGENTE (por implementar en los commits siguientes). Aprobada por Pía el 2026-11-12 (incluida su aprobación explícita para editar este archivo). Solo presentación: la lógica de medallas y de progreso y la navegación (toca → Medallas) no cambian. Cuatro tokens nuevos (medalCopper, medalCopperDeep, medalCopperLight, medalProgress) sin cambiar ningún valor existente.
- **Ajuste (2026-11-12, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** "Medallas: sin la etiqueta 'ÚLTIMO LOGRO'; cinta del ícono en café oscuro y un poco más grande; barra de progreso de 7 dp." La frase para lectores de pantalla sigue diciendo "Último logro: {nombre}". No se toca la corona de laurel.
- **Ajuste (2026-11-13, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** "Medallas: la medalla del último logro rodeada por el laurel 'relieve' (diseño propio, dos ramas simétricas); el nombre en 14 sp bajo el laurel, en una o dos líneas, con el bloque al 100 % y un alto fijo en todos los estados; la variante 'fino' y la corona generada por geometría quedan descartadas." La cinta queda en café #5E3A1A sin filo (aceptado: su silueta contra el fondo no llega a 3:1) y la barra de 7 dp se mantiene. La escala final es 100 % (las otras escalas se probaron en desarrollo y se retiraron). Los íconos de podio (oro, plata y bronce) se muestran en crema dentro de la medalla; la silueta de la cinta contra el fondo (1,51:1) y el aro de la medalla (2,06:1) quedan aceptados.
- **Ajuste (2026-11-14, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** nombre completo con 6 dp libres bajo la última línea; alto de la tarjeta fijo de 138 dp en todos los estados; los íconos de podio se muestran en crema dentro de la medalla; la silueta de la cinta contra el fondo (1,51:1) y el aro de la medalla (2,06:1) quedan aceptados. La flecha de la tarjeta es la de 'Tu próxima clase' en versión pequeña.
- **Ajuste (2026-11-15, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** escala final 100 % (laurel de 88 x 72 dp y medalla de 38 dp); separación de 2 dp entre el laurel y el nombre; alto final de la tarjeta 138 dp (igual en todos los estados), con el espacio libre bajo el nombre absorbiendo el crecimiento del bloque.
- **Ajuste (2026-11-15, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** interlineado 14/18 del nombre (13/17 para nombres de 20 o más letras); la flecha de Medallas va en la esquina superior derecha, con el mismo margen que las de Tu nivel y PR destacado.
- **Ajuste (2026-11-14, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** Medallas usa como fondo una foto de podio (Szcze hoo, Pexels, licencia gratuita) en duotono de cobre, recortada sin los logos del evento (archivo `home-fondo-medallas.jpg`, intensidad media, ventana de 1116 × 414 px que termina sobre el logo del podio). Las dos tarjetas comparten la misma rampa de cobre (#5E3A1A a #8B5E34); el fondo liso anterior queda como respaldo (se recupera revirtiendo el commit de código; el degradado queda debajo de la foto mientras carga). Créditos en `CREDITOS-IMAGENES.md`.

## (z) Regla de trabajo: preguntar antes de tocar archivos de producción

- **Fecha:** 2026-11-22
- **Decisión:** "En una tarea de diseño, antes de tocar cualquier archivo que use la Home real o la app en producción, se detiene el trabajo y se le pregunta a Pía, aunque el cambio sea una extracción o un refactor sin efecto visible hecho para habilitar algo solo de desarrollo."
- **Estado:** VIGENTE. Pedida por Pía el 2026-11-22 (incluida su aprobación explícita para editar este archivo), después de que la extracción de `planNoticeModel.ts` (pedido 43, commit `5f38053`) cambiara `PlanNoticeCard` sin consultarla; ella aceptó ese cambio. Si se aprueba tocar un archivo de producción, va en un commit propio y revertible por separado, y el informe lo dice de entrada. EXCEPCIÓN aprobada por Pía el 2026-11-22: las piezas nuevas que solo se muestran en "Estados de Inicio (dev)" → "Ver avisos" no necesitan esta consulta mientras no se conecten a Inicio; conectarlas a la Home real sí la necesita.
- **Variable `DESIGN_SENSITIVE_OK`:** (aprobada por Pía el 2026-11-22) se usa SOLO cuando el pedido nombra explícitamente el archivo sensible que se va a tocar, con la ruta exacta de ese archivo y nada más; nunca por costumbre ni para que un chequeo pase. Cada commit que la usa lo dice en su mensaje o en el informe.

## (aa) Cumpleaños

- **Fecha:** 2026-11-22
- **Decisión:** "Cumpleaños: tarjeta propia en cobre oscuro con texto crema (título 15, subtítulo 13); próximos cumpleaños en lista grafito con avatar de cobre y etiqueta 'Hoy'; solo nombre y día/mes, nunca edad ni año."
- **Estado:** VIGENTE. Aprobada por Pía el 2026-11-22 (incluida su aprobación explícita para editar este archivo) después de revisar ambos diseños en su teléfono ("Próximos cumpleaños" aprobado tal cual; "Cumpleaños propio" con la letra reducida de 17/14 a 15/13, el círculo del ícono de 44 a 40 dp con el regalo de 22 a 20 dp y el relleno de 20 a 16 dp). Reemplaza a las tarjetas de cumpleaños anteriores de Inicio (fondo claro). Mismos textos, mismas condiciones y mismos datos. El texto del propio es crema sobre #8B5E34 (4,98:1).

## (ab) Tarjeta del WOD

- **Fecha:** 2026-11-22
- **Decisión:** "Tarjeta del WOD en dos variantes: estándar para el WOD del coach (grafito sobria, 'WOD DEL DÍA') y especial para los WOD del catálogo (Dark Athletic Premium con borde de cobre, rayo, 'WOD ESPECIAL' y 'SOLO HOY'); ambas con el texto del coach resumido, sin inventar datos; bloques por ejercicio cuando existan los datos separados."
- **Estado:** VIGENTE. Aprobada por Pía el 2026-11-22 (incluida su aprobación explícita para editar este archivo; Pía la llamó "(z)", pero esa letra ya la usa la regla de trabajo, así que queda como (ab)). El tipo se decide por el `wodId` (el id de la entrada del catálogo, que `GET /wod/today` ya entrega), nunca por el nombre; "SOLO HOY" se muestra solo si `sessionDate` es hoy en hora de Chile. Reemplaza a la tarjeta "WOD de hoy" actual y a la versión nueva que se vio en "Ver avisos" (esa quedó en un parche local fuera del repositorio).

## (ac) Sin box: tarjeta y ventana para unirse

- **Fecha:** 2026-11-24
- **Decisión:** "Sin box: tarjeta grafito con botón ancho de cobre y texto carbón; la ventana para unirse sigue el mismo estilo (grafito, campos #232428 con foco de cobre); solo cambia la apariencia."
- **Estado:** VIGENTE. Aprobada por Pía el 2026-11-24 (incluida su aprobación explícita para editar este archivo). Solo cambia la apariencia: mismos textos, mismas validaciones, mismos envíos y mismos mensajes de error (la ventana sigue siendo el ingreso por código de invitación). Para la ventana, Pía aprobó editar `components/JoinBoxModal.tsx` (`DESIGN_SENSITIVE_OK=artifacts/wodplace/components/JoinBoxModal.tsx`, solo para la presentación y solo para ese archivo). El botón de cobre #B98250 lleva texto carbón #0D0F10 (5,83:1) y, al presionar, pasa al cobre claro #C79A6B sólido. Reemplaza a la tarjeta "Todavía no tienes un box" anterior (fondo claro) y a la ventana anterior (blanca con botón violeta).

## (ad) Ventana de aviso importante

- **Fecha:** 2026-11-24
- **Decisión:** "Ventana de aviso importante: hoja grafito con título en Anton, botón ancho de cobre con texto carbón y presionado en cobre claro, mismos textos y pasos; en evaluación en 'Ver avisos'."
- **Estado:** EN EVALUACIÓN (solo en "Estados de Inicio (dev)" → "Ver avisos", con un chip "Aviso: actual / nuevo"; Inicio real NO cambia todavía). Aprobada por Pía el 2026-11-24 (incluida su aprobación explícita para editar este archivo). La ventana nueva es un componente aparte (`components/home/AnnouncementModalNew.tsx`); `components/AnnouncementModal.tsx` (la actual, no sensible) no se toca. Mismos textos, mismos dos pasos (el aviso y "¿Ya leíste este aviso?") y misma lógica (cerrar lleva a la confirmación; solo "Sí, ya lo leí" lo marca como leído y lo cierra). Los banners de aviso (contrato pendiente, aviso fijo del box y aviso del plan) siguen sin conectar a Inicio y se muestran junto a su versión actual en "Ver avisos".
