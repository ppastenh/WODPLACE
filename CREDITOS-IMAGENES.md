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
