# Créditos de imágenes

Imágenes de terceros usadas en la app, con su origen y licencia.

## `artifacts/wodplace/assets/images/home/home-banner-anillo.jpg`

- **Uso:** banner del diseño nuevo de Inicio (decisión (k) de `DECISIONES-DISENO.md`; foto elegida en la decisión (o)), con velo oscuro. Hoy solo en la pantalla de desarrollo "Estados de Inicio (dev)".
- **Foto:** "Primer plano de un anillo de gimnasia de madera colgando en un gimnasio interior con poca luz" (título de la página: "Anillo de color latón con correa negra").
- **Autor:** Leon Mart, https://www.pexels.com/es-es/@leonmart/
- **Página de origen:** https://www.pexels.com/es-es/foto/anillo-de-color-laton-con-correa-negra-1552251/ (foto tomada el 2018-10-26 y publicada el 2018-10-31; datos verificados en la página de Pexels el 2026-10-30: autor, licencia gratuita de Pexels, dimensiones y fecha).
- **Licencia:** licencia gratuita de Pexels, https://www.pexels.com/es-es/license/ (uso comercial y modificación permitidos; no exige atribución).
- **Fecha de consulta:** 2026-10-30.
- **Original:** 4288 × 2848 px (3:2).
- **Edición:** solo recorte (x = 214, y = 549, 3644 × 1822 px) y reducción a 1080 × 540 px, JPEG, sin metadatos (60.115 bytes). Sin retoque de color ni oscurecimiento. El recorte arranca 94 px más arriba que la primera versión (y = 643, 58.569 bytes) para que el aro baje unos 10 dp en el banner; esa versión quedó respaldada fuera del repositorio (`C:UserspiapaDocumentswodplace-respaldohome-banner-anillo-y643.jpg`).
- **Archivo:** `home-banner-anillo.jpg`.
- La foto no lleva logos de marcas; el texto visible en la hebilla de la correa es la palabra genérica PRESS (ilegible a tamaño real), y las formas del fondo son anillas desenfocadas.

## `artifacts/wodplace/assets/images/home/home-card-pizarra.jpg`

- **Uso:** textura de la tarjeta "Tu próxima clase" de Inicio (decisión (r) de `DECISIONES-DISENO.md`), a la derecha y bajo un velo negro. Lo da UNA sola constante, `NEXT_CLASS_TEXTURE`, en `components/home/NextClassCard.tsx`.
- **Foto:** "Superficie de pizarra de textura oscura de cerca" (etiquetas de la página: textura, abstracto, oscuro, negro, tiza, esponja).
- **Autor:** Noita Digital, https://unsplash.com/es/@noitadigital
- **Página de origen:** https://unsplash.com/es/fotos/superficie-de-pizarra-de-textura-oscura-de-cerca-zcx5ztIjQAM (publicada el 2021-02-25; datos verificados en la página el 2026-11-07: autor, licencia, título y fecha; la página no indica las dimensiones del original).
- **Licencia:** Licencia Unsplash (uso gratuito, comercial y modificación permitidos; no exige atribución, se agradece), https://unsplash.com/es/licencia
- **Fecha de consulta:** 2026-11-07.
- **Original:** 3744 × 5616 px (el archivo que descargó Pía; la página no permite confirmar que sea idéntico, pero el contenido, una pizarra oscura con borrones de tiza, coincide con el título y las etiquetas).
- **Edición:** solo recorte a 3:2 (x = 0, y = 3115, 3744 × 2496 px), espejado horizontal (para que el remolino de tiza quede a la derecha), reducción a 720 × 480 px y elevación de luminosidad con gamma 0,70 (salida = 255 · (entrada/255)^0,70), JPEG sin metadatos (70.308 bytes). Sin retoque de color.
- **Archivo:** `home-card-pizarra.jpg`.
- La foto no lleva logos, texto, marcas ni personas.

## `artifacts/wodplace/assets/images/home/home-fondo-frase.jpg`

- **Uso:** fondo de la tarjeta de frases del día de Inicio (decisión (s) de `DECISIONES-DISENO.md`), bajo un velo oscuro uniforme #0D0F10 del 62 % (constante `QUOTE_VEIL` en `components/home/DailyQuoteCard.tsx`; sin degradado).
- **Foto:** "Cuerpo de agua y montaña" (texto alternativo de la página: "body of water and mountain"; etiquetas: azul, excursionismo, Patagonia, Chile, Torres del Paine, Parque Nacional Torres del Paine). Muestra los Cuernos del Paine sobre un lago turquesa; sin personas, logos, texto ni marcas visibles.
- **Autor:** Snowscat, https://unsplash.com/es/@snowscat
- **Página de origen:** https://unsplash.com/es/fotos/cuerpo-de-agua-y-montana-EnFQmcTtsjo (publicada el 2019-05-22; datos leídos en la página el 2026-11-08: autor, título, licencia y fecha; cámara indicada: NIKON D80; la página no indica las dimensiones del original).
- **Licencia:** Licencia Unsplash (uso gratuito, comercial y modificación permitidos; no exige atribución, se agradece), https://unsplash.com/es/licencia
- **Fecha de consulta:** 2026-11-08.
- **Original:** el archivo que descargó Pía, 8688 × 5798 px (3:2). La página no permite confirmar las dimensiones (una Nikon D80 entrega 3872 × 2592 px, así que el archivo sería una versión ampliada por el autor); el contenido, la proporción y el lugar coinciden con el título y las etiquetas.
- **Edición:** escala de grises por luminancia (Y = 0,2126 R + 0,7152 G + 0,0722 B sobre los valores sRGB, sin otros niveles), recorte centrado a 720 × 300 px (2,4:1) con reducción, sin metadatos
- **Archivo:** `home-fondo-frase.jpg`, 720 × 300 px, JPEG calidad 85 sin metadatos (38.596 bytes).

## Estado de la foto del banner

`home-banner-anillo.jpg` está **ACTIVA** desde la decisión (o) (2026-10-30); reemplazó a `clase-piernas.jpg` (provisional, ya eliminada; sigue en el historial de git). Una foto nueva se mide en contraste ANTES de activarla.

## Cómo cambiar la foto del banner

1. **Formato y tamaño:** JPEG o WebP, **1080 × 540 px (2:1)**, **máximo 200 KB**, **sin metadatos** (ni ubicación GPS ni cámara).
2. **Contenido:** sin logos de marcas ni caras reconocibles si se puede evitar (la foto actual se revisó con zoom en 320, 360 y 412 dp). Siempre con el velo oscuro de la pantalla.
3. **Fuente y licencia:** anota la URL de origen y la licencia en este archivo, en una sección propia como la de arriba (la licencia de Pexels permite uso comercial y modificación sin atribución obligatoria). No se activa una foto sin esa fuente.
4. **Dónde se guarda:** `artifacts/wodplace/assets/images/home/` (la carpeta de las fotos del banner).
5. **Cómo se activa:** en `components/home/HomeViewV2.tsx` hay UNA sola constante, `BANNER_PHOTO`, con el `require` y el foco del recorte (50 % / 0 %). Solo cambian esas dos cosas; el alto del banner, el velo, la tarjeta de vidrio y la crema no dependen de la foto.
6. **Zonas del encuadre medidas en la imagen de 540 px de alto** (el banner mide 192 dp y la foto se escala a 0,356 dp por px, es decir 2,81 px por dp):
   - **y = 0 a 208: zona libre.** Se ve la foto con el velo; aquí va el sujeto principal.
   - **y = 208 a 416: bajo la tarjeta de vidrio.** Se ve oscurecida por el vidrio (negro al 60 %).
   - **y = 416 en adelante: tapada por la crema.** En detalle: de 416 a 450 queda una franja de 12 dp visible bajo la tarjeta, y desde 450 la crema sube sobre la foto.
   - **Márgenes laterales de 90 px a cada lado: pueden recortarse.** En una pantalla de 320 dp se pierden esos 90 px por lado; en 360 dp, unos 34; en 412 dp no se pierde ancho, pero se recortan unos 37 px en vertical (la foto se escala más; con el foco vertical en 0 % todo ese recorte cae abajo, bajo la crema). No pongas nada importante en esos márgenes.
7. **Mide el contraste del texto crema en el peor caso ANTES de activar** (ver abajo) y deja el resultado en `ESTADO.md`.

## Cómo volver a medir el contraste del texto crema de la tarjeta de vidrio

Se mide el PEOR caso: el punto más claro de la parte de la foto que realmente queda bajo la tarjeta, en 320, 360 y 412 dp, con el vidrio al 60 % y el velo mínimo (40 %); mínimo exigido 4,5:1 para el texto (3:1 para íconos). También se mide la inicial blanca del recuadro de cobre al 70 %. Con el vidrio al 60 % incluso un píxel blanco puro da 4,77:1, así que el vidrio por sí solo ya asegura el mínimo; la medición confirma el margen real.

**Hoy esa medición NO es un comando repetible:** se hizo con un script de PowerShell (System.Drawing) que vive fuera del repositorio. **Propuesta para el chat de seguridad (no se creó aquí):** un comando `pnpm --filter @workspace/scripts measure:banner-photo <archivo>` que lea la foto (hace falta un decodificador de imágenes: una dependencia nueva de `scripts`, por ejemplo `jpeg-js`, o versionar el script de PowerShell, que solo corre en Windows), recorte con `cover` y el foco de `BANNER_PHOTO` para 320, 360 y 412 dp, aplique el velo y el vidrio, y falle bajo 4,5:1. Hasta entonces se repite el script manual con la foto nueva.

## Laurel de la tarjeta "Medallas" (diseño propio de la dueña)

El laurel de la tarjeta "Medallas" de Inicio (variante "relieve": dos ramas simétricas con hojas de dos tonos) es **diseño propio de la dueña**, vectorizado a datos y guardado en `artifacts/wodplace/components/ui/laurelData.ts`. No usa imágenes, fuentes externas ni bancos de íconos, y no depende de ningún archivo ignorado por git: los dibujos de origen (SVG y PNG) y el script que los convirtió no se versionan (copias de respaldo fuera del repositorio).

## `artifacts/wodplace/assets/images/home/home-fondo-progreso.jpg`

- **Uso:** fondo fijo de la tarjeta "Progreso mensual" de Inicio (decisión (v) de `DECISIONES-DISENO.md`), con todo el texto en crema encima. Lo da `FONDO_PROGRESO` en `components/home/MonthlyProgressCard.tsx`.
- **Foto:** "Abstracto en blanco y negro de un pavimento de piedra con patrones geométricos y sombras" (título de la página: "Abstracto monocromático de patrones geométricos de piedra").
- **Autor:** ab_h_i s_h_ek_09, https://www.pexels.com/es-es/@ab_h_i-s_h_ek_09-283673767/
- **Página de origen:** https://www.pexels.com/es-es/foto/abstracto-monocromatico-de-patrones-geometricos-de-piedra-33096666/ (publicada el 2025-07-21).
- **Licencia:** licencia gratuita de Pexels, https://www.pexels.com/es-es/license/ (uso comercial y modificación permitidos; no exige atribución).
- **Fecha de consulta:** 2026-11-14.
- **Original:** 3376 × 6000 px (el archivo que descargó Pía, `fondo-progreso6.jpg`, que queda fuera del repositorio; el contenido coincide con el título de la página).
- **Edición:** recorte a ancho completo con la proporción de la tarjeta (3376 × 1134 px, centrado en la vertical) y reducción a 1116 × 375 px (372 × 125 dp a 3x); duotono de cobre: luminancia Y = 0,299 R + 0,587 G + 0,114 B, estirada entre los percentiles 2 y 98, mapeada a la rampa de #5E3A1A a #8B5E34 con intensidad media (0,65 + 0,7 × (Ls − 0,5), con techo que baja hasta que ningún píxel supere la luminancia de #8B5E34); JPEG sin metadatos (solo el encabezado JFIF), 75.137 bytes.
- **Archivo:** `home-fondo-progreso.jpg`.
- La foto no lleva logos, texto, marcas ni personas.

## `artifacts/wodplace/assets/images/home/home-fondo-medallas.jpg`

- **Uso:** fondo fijo de la tarjeta "Medallas" de Inicio (decisión (y) de `DECISIONES-DISENO.md`), con el laurel, el contador y el nombre del logro encima. Lo da `FONDO_MEDALLAS` en `components/home/MedalsCard.tsx`.
- **Foto:** "Podio rojo en una pista de atletismo al aire libre soleada con plantas decorativas" (título de la página: "Podio de atletismo vacío en pista al aire libre").
- **Autor:** Szcze hoo, https://www.pexels.com/es-es/@szczehoo/
- **Página de origen:** https://www.pexels.com/es-es/foto/podio-de-atletismo-vacio-en-pista-al-aire-libre-35347469/ (publicada el 2025-12-23).
- **Licencia:** licencia gratuita de Pexels, https://www.pexels.com/es-es/license/ (uso comercial y modificación permitidos; no exige atribución).
- **Fecha de consulta:** 2026-11-14.
- **Original:** 4898 × 3265 px (el archivo que descargó Pía, `fondo-medalla2.jpg`, que queda fuera del repositorio; el contenido coincide con el título de la página).
- **Edición:** recorte a ancho completo con la proporción de la tarjeta (4898 × 1817 px, de y = 436 a y = 2253, es decir del 13,4 % al 69,0 % de la altura) y reducción a 1116 × 414 px (372 × 138 dp a 3x); duotono de cobre con la misma rampa de #5E3A1A a #8B5E34 e intensidad media (la misma fórmula que `home-fondo-progreso.jpg`); JPEG sin metadatos (solo el encabezado JFIF), 28.367 bytes.
- **Archivo:** `home-fondo-medallas.jpg`.
- **El recorte excluye los logos del evento que aparecen en el podio** (el podio trae el logo "PKO SILESIA MARATHON" bajo cada número; la ventana termina sobre el borde superior del logo del "2" y queda a 13 px del original, unos 3 px de la copia, por encima). Se revisó con zoom el borde inferior del archivo final y no hay rastro de ningún logo ni texto de marca; solo se ven los números "1" y "2" del podio.
