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
