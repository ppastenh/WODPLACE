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

## (w) Recuadros "Tu nivel" y "Racha de constancia"

- **Fecha:** 2026-11-09
- **Decisión:** "Recuadros 'Tu nivel' y 'Racha de constancia': elegida la opción E (dos tarjetas independientes con insignias de escudo en cobre), tratamiento grafito, rango en Anton; las opciones C, el diseño anterior y el tratamiento cobre quedan descartados; los indicadores de racha son un progreso visual hasta siete, porque el cliente solo recibe el número de días seguidos, sin fechas."
- **Estado:** VIGENTE. Elegida por Pía el 2026-11-09 (incluida su aprobación explícita para editar este archivo); antes estuvo en evaluación entre C y E. El diseño anterior (tarjetas blancas), la opción C, el tratamiento cobre y el chip de tipografía se guardan solo como parche local fuera del repositorio. Solo presentación: los datos, la navegación y la lógica no cambian. "Tu nivel" conserva su toque (lleva a Datos personales); "Racha de constancia" no es un botón.

## (x) Tarjeta "PR destacado"

- **Fecha:** 2026-11-11
- **Decisión:** "Tarjeta 'PR destacado': concepto PR Champion en grafito con insignia hexagonal de cobre y barra olímpica, nombre del movimiento en Anton y marca en una cápsula con borde de cobre; el diseño anterior queda disponible en desarrollo; laureles descartados por defecto."
- **Estado:** VIGENTE (por implementar en el commit de código siguiente). Aprobada por Pía el 2026-11-11 (incluida su aprobación explícita para editar este archivo). Solo presentación: la rotación diaria del PR destacado, los datos y la navegación (toca → RM) no cambian. Variantes 'actual' y 'clara', laureles y la insignia de escudo quedan solo en la pantalla de desarrollo.
- **Enmienda (2026-11-11, aprobada por Pía, incluida su aprobación explícita para editar este archivo):** "Tarjeta 'PR destacado': concepto PR Champion en grafito con insignia hexagonal de cobre (el mismo cobre medio y el mismo tratamiento que las insignias de 'Tu nivel' y 'Racha') y barra olímpica, nombre del movimiento en Anton y marca en una cápsula con borde de cobre; sin laureles; alto estable en todos los estados; las variantes anterior, clara, de escudo y con laureles quedan descartadas." Esto REEMPLAZA lo de la decisión original sobre el cobre claro y sobre las variantes disponibles en desarrollo: las variantes se guardan solo como parche local fuera del repositorio.

## (y) Tarjeta "Medallas"

- **Fecha:** 2026-11-12
- **Decisión:** "Tarjeta 'Medallas': diseño Copper Achievement, tarjeta de cobre con contador en Anton, barra de progreso con las medallas reales y la última medalla rodeada por una corona de laurel simétrica de dos ramas; degradado entre cobre profundo y cobre oscuro para mantener el contraste del texto; el diseño anterior queda disponible en desarrollo."
- **Estado:** VIGENTE (por implementar en los commits siguientes). Aprobada por Pía el 2026-11-12 (incluida su aprobación explícita para editar este archivo). Solo presentación: la lógica de medallas y de progreso y la navegación (toca → Medallas) no cambian. Cuatro tokens nuevos (medalCopper, medalCopperDeep, medalCopperLight, medalProgress) sin cambiar ningún valor existente.
- **Ajuste (2026-11-12, aprobado por Pía, incluida su aprobación explícita para editar este archivo):** "Medallas: sin la etiqueta 'ÚLTIMO LOGRO'; cinta del ícono en café oscuro y un poco más grande; barra de progreso de 7 dp." La frase para lectores de pantalla sigue diciendo "Último logro: {nombre}". No se toca la corona de laurel.
