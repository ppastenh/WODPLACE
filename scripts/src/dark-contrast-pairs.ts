/**
 * Pares texto/fondo REALES de la paleta oscura (artifacts/wodplace/constants/darkColors.ts) y su medición con la fórmula de
 * contraste WCAG 2.x. Lo usan la prueba (test-dark-contrast.ts, que FALLA bajo el mínimo) y los informes de antes/después.
 *
 * Mínimos: 4,5:1 para texto y 3:1 para íconos y bordes de campos de formulario. El borde decorativo (`border`) no se mide:
 * no delimita un campo (para eso existe `inputBorder`).
 */
/**
 * `bgOver` / `textOver`: el token se dibuja con esa opacidad sobre otro token (insignias con `opacity`).
 * `bgLiteral`: un color escrito a mano (hex) con opacidad sobre un token (por ejemplo rgba(224,82,74,0.15) sobre el fondo).
 */
export type Over = { over: string; alpha: number };
export type Pair = {
  text: string;
  bg: string;
  min: 4.5 | 3;
  note: string;
  bgOver?: Over;
  textOver?: Over;
  bgLiteral?: { hex: string; over: string; alpha: number };
  /**
   * EXCEPCIÓN ACEPTADA: el par NO cumple su mínimo y se acepta a propósito. La prueba NO finge que cumple ni falla el resto: comprueba que el valor medido siga
   * siendo el registrado (si cambia el color o el velo, avisa) y deja constancia de la fecha y de quién la aceptó.
   */
  accepted?: { value: number; date: string; by: string };
};

const t = (text: string, bg: string, note: string): Pair => ({ text, bg, min: 4.5, note });
const ui = (text: string, bg: string, note: string): Pair => ({ text, bg, min: 3, note });

export const PAIRS: Pair[] = [
  // Texto principal
  t('foreground', 'background', 'texto principal'),
  t('foreground', 'card', 'texto en tarjeta'),
  t('cardForeground', 'card', 'texto de tarjeta'),
  t('foreground', 'input', 'texto en campo'),
  t('foreground', 'muted', 'texto sobre muted'),
  t('foreground', 'cardPressed', 'tarjeta presionada'),
  t('foreground', 'successBackground', 'PR destacado'),
  t('foreground', 'warningBackground', 'avisos'),
  // Texto secundario
  t('mutedForeground', 'background', 'texto secundario'),
  t('mutedForeground', 'card', 'texto secundario en tarjeta'),
  t('mutedForeground', 'muted', ''),
  t('mutedForeground', 'mutedPressed', 'muted presionado'),
  t('mutedForeground', 'input', 'placeholder en campo'),
  t('navInactive', 'background', 'leyendas y pestañas inactivas'),
  t('navInactive', 'card', 'leyendas en tarjeta'),
  t('navInactive', 'input', ''),
  t('navInactive', 'cardPressed', 'leyendas en tarjeta presionada'),
  t('navInactive', 'successBackground', 'PR destacado'),
  t('navInactive', 'warningBackground', 'avisos'),
  // Cobre
  t('navActive', 'background', 'cobre como texto/ícono'),
  t('navActive', 'card', ''),
  t('navActive', 'cardPressed', ''),
  t('navActive', 'input', ''),
  t('navActiveTextSmall', 'background', 'texto chico cobre'),
  t('navActiveTextSmall', 'card', ''),
  t('card', 'navActive', 'texto de tarjeta sobre cobre (lista de espera)'),
  t('card', 'navActivePressed', 'idem, presionado'),
  // Botones y rellenos
  t('primaryForeground', 'primary', 'botón primario'),
  t('primaryForeground', 'primaryPressed', 'botón primario presionado'),
  t('secondaryForeground', 'secondary', 'botón secundario'),
  t('secondaryForeground', 'secondaryPressed', 'presionado'),
  t('accentForeground', 'accent', 'chips y WOD'),
  t('destructiveForeground', 'destructive', 'botón destructivo'),
  t('destructiveForeground', 'destructivePressed', 'presionado'),
  t('destructiveTextSmall', 'background', 'error en texto'),
  t('destructiveTextSmall', 'card', ''),
  t('destructiveTextSmall', 'input', ''),
  t('destructiveTextSmall', 'cardPressed', ''),
  t('successForeground', 'success', ''),
  t('success', 'background', 'verde como texto'),
  t('success', 'card', ''),
  t('success', 'successBackground', ''),
  t('warning', 'background', 'ámbar como texto'),
  t('warning', 'card', ''),
  t('warning', 'warningBackground', ''),
  t('navFloatingForeground', 'navFloating', 'botón Agendar'),
  t('navFloatingForeground', 'navFloatingPressed', 'Agendar presionado'),
  t('adminActionForeground', 'adminAction', 'botón de panel en el menú'),
  t('adminActionForeground', 'adminActionPressed', 'presionado'),
  t('nextClassCardForeground', 'nextClassCard', 'tarjeta de próxima clase'),
  t('nextClassCardForeground', 'nextClassCardPressed', 'presionada'),
  t('warningForeground', 'warning', 'ícono del aviso de plan por vencer'),
  t('accentForeground', 'accentGradientEnd', 'texto de la frase sobre el extremo del degradado'),
  t('accentForeground', 'accent', 'texto de la frase sobre el inicio del degradado'),
  t('navActive', 'secondary', 'inicial del box y avatares'),
  t('inactive', 'background', 'gris inactivo como texto'),
  t('inactive', 'card', ''),
  t('inactive', 'nextClassCard', 'meta de la tarjeta de próxima clase'),
  t('inactive', 'nextClassCardPressed', 'meta, presionada'),
  t('inactiveForeground', 'inactive', 'chip inactivo'),
  // Menú lateral (SideDrawer)
  t('primary', 'card', 'nombre del plan/enlace en cobre sobre el menú'),
  t('secondaryForeground', 'secondary', 'fila activa del menú'),
  t('foreground', 'secondary', 'texto sobre el relleno de fila activa'),
  t('destructiveForeground', 'destructive', 'contador de notificaciones del menú (#FFFFFF)'),
  t('destructiveTextSmall', 'card', 'Cerrar sesión'),
  // Perfil
  t('successForeground', 'success', 'Cuenta Activa (texto y punto)'),
  { ...t('destructiveAccent', 'background', 'Cuenta no activa sobre su tinte rgba(224,82,74,0.15)'), bgLiteral: { hex: '#E0524A', over: 'background', alpha: 0.15 } },
  t('navActive', 'background', 'pestaña activa de Perfil'),
  t('navInactive', 'background', 'pestaña inactiva de Perfil'),
  t('foreground', 'input', 'opción del interruptor de Apariencia'),
  // Calendario y Agendar (WeekCalendar, MonthCalendar, ClassCard y sus insignias)
  t('primaryForeground', 'primary', 'día seleccionado'),
  ui('primary', 'card', 'borde del día de hoy y punto de cupo'),
  t('primary', 'card', 'cifras y enlaces en cobre dentro de ClassCard'),
  t('mutedForeground', 'card', 'días fuera de mes, coach y detalles'),
  ui('success', 'card', 'punto de día con clase reservada'),
  t('secondaryForeground', 'secondary', 'insignia "Agendado"'),
  t('secondaryForeground', 'secondaryPressed', 'insignia "Agendado" presionada'),
  t('destructiveForeground', 'destructive', 'insignia "Cancelando"'),
  { ...ui('secondaryForeground', 'secondary', 'insignia "Terminada" (estado deshabilitado a propósito, opacidad 0,6; 3:1)'), bgOver: { over: 'card', alpha: 0.6 }, textOver: { over: 'card', alpha: 0.6 } },
  // Esqueleto de carga en el tema oscuro (inputBorder sobre la tarjeta y sobre la tarjeta de próxima clase)
  ui('inputBorder', 'nextClassCard', 'esqueleto de la tarjeta de próxima clase'),
  // Barra de pestaña activa (3 px, solo tema oscuro)
  ui('navActive', 'card', 'barra de acento sobre el ícono activo'),
  // Comunidad (publicaciones, comentarios, hojas de comentarios, avisos y reporte)
  t('likeAccent', 'card', 'corazón y contador de "me gusta" en la tarjeta'),
  t('likeAccent', 'background', 'corazón y contador sobre el fondo (hojas)'),
  t('primaryForeground', 'navActive', 'enviar comentario, Reportar, Reintentar, avatar del box'),
  t('primaryForeground', 'navActivePressed', 'idem, presionado'),
  t('navInactive', 'navBorder', 'texto de "Reportar" deshabilitado'),
  t('destructiveAccent', 'card', 'acción destructiva en la hoja de opciones (Eliminar)'),
  t('warning', 'warningBackground', 'etiqueta BOX'),
  t('navInactive', 'background', 'hora, contadores y textos de apoyo'),
  ui('inputBorderNav', 'background', 'borde del campo de publicación y del botón de adjuntar imágenes'),
  ui('inputBorderNav', 'card', 'borde sobre tarjeta'),
  // WOD del día y resultados
  t('mutedForeground', 'card', 'descripción del WOD y separador de tiempo'),
  t('foreground', 'background', 'notas del WOD (caja sobre la tarjeta) y campos de tiempo'),
  t('secondaryForeground', 'secondary', 'formato y nivel del WOD'),
  t('primaryForeground', 'primaryPressed', 'botón Guardar resultado presionado'),
  // Plan (el plan suscrito invierte los colores: relleno foreground, texto background)
  t('background', 'foreground', 'nombre, precio y beneficios del plan suscrito'),
  t('successForeground', 'success', 'etiqueta "Suscrito"'),
  t('primary', 'card', 'ícono de beneficio de los planes no suscritos'),
  // Contratos activos
  t('successForeground', 'success', 'etiqueta "Leído"'),
  t('primaryForeground', 'inactive', 'etiqueta "Pendiente"'),
  t('destructiveAccent', 'secondary', 'enlace "Retirar" sobre el cuadro de aceptado'),
  t('mutedForeground', 'secondary', 'avisos dentro de cuadros secundarios'),
  t('secondaryForeground', 'secondary', 'cuadro de contrato aceptado y de faltantes'),
  t('primaryForeground', 'primary', 'palomita de las casillas marcadas'),
  ui('inputBorder', 'card', 'borde de los campos de contacto y fecha'),
  // Barra de fila activa del menú lateral (3 px, solo tema oscuro)
  ui('navActive', 'secondary', 'barra de acento junto a la fila activa'),
  // Notificaciones, Datos personales y detalle del box (solo tokens: sin cambios de código)
  t('foreground', 'secondary', 'notificación sin leer (su relleno es secondary)'),
  t('mutedForeground', 'secondary', 'cuerpo y fecha de la notificación sin leer'),
  ui('destructive', 'secondary', 'punto rojo de notificación sin leer'),
  t('success', 'card', 'estado "Activa" en Datos personales'),
  t('inactive', 'card', 'estado inactivo en Datos personales'),
  t('primaryForeground', 'primary', 'inicial del logo del box en Datos personales y detalle del box'),
  t('secondaryForeground', 'secondaryPressed', 'redes sociales presionadas (detalle del box)'),
  // Pantallas de acceso y candado
  t('authText', 'authBackground', ''),
  t('authText', 'authCard', ''),
  t('authText', 'authInput', ''),
  t('authMuted', 'authBackground', ''),
  t('authMuted', 'authCard', ''),
  t('authMuted', 'authInput', ''),
  // Íconos y bordes de campos (3:1)
  ui('inputBorder', 'background', 'borde de campo'),
  ui('inputBorder', 'card', 'borde de campo en tarjeta'),
  ui('inputBorder', 'input', 'borde sobre el relleno del campo'),
  ui('destructive', 'background', 'punto/relleno rojo (campana)'),
];

/**
 * Pares del diseño nuevo de Inicio (decisión (k)), medidos contra la paleta CLARA, porque ese diseño es de claro fijo.
 * El punto más claro de la foto real clase-piernas.jpg mide luminancia 0,83 (gris sRGB 235, #EBEBEB), medido con System.Drawing
 * sobre los 747.360 píxeles; el vidrio es negro al 60 % y se mezcla en sRGB, como hace React Native.
 * La foto activa hoy (home-banner-anillo.jpg, decisión (o)) mide gris 239 como máximo bajo la tarjeta SIN velo y 58 con velo 40 % y vidrio
 * (crema 9,43:1 a 9,63:1 según el ancho): la diferencia con el #EBEBEB (235) del par sin velo es de 4 niveles de gris y no cambia el resultado (crema 5,3:1 con el vidrio, sobre el mínimo de 4,5:1).
 */
export const PAIRS_LIGHT: Pair[] = [
  // Barra superior
  t('cream', 'charcoal', 'logo WODPLACE y menú/campana sobre la barra'),
  t('cream', 'charcoalPressed', 'menú/campana presionados'),
  ui('navActive', 'charcoal', 'punto cobre de notificaciones sobre la barra'),
  ui('navActive', 'charcoalPressed', 'punto cobre sobre el botón presionado'),
  t('#A29E94', 'charcoal', 'gris claro sobre carbón'),
  // Tarjeta de vidrio sobre la foto (peor caso: el punto más claro de la foto)
  { ...t('cream', 'charcoal', 'nombre del box y saludo, PEOR caso: punto más claro de la foto SIN velo, vidrio 60 %'), bgLiteral: { hex: '#000000', over: '#EBEBEB', alpha: 0.6 } },
  { ...t('cream', 'charcoal', 'idem con el velo mínimo (40 %) sobre el punto más claro'), bgLiteral: { hex: '#000000', over: '#8D8D8D', alpha: 0.6 } },
  // Peor caso con el banner de 202 dp (foco 50 % / 75 %), medido sobre la foto real con System.Drawing en anchos de 320, 360 y 412 dp, con el
  // velo mínimo (40 %) y el vidrio al 60 %: el gris sRGB del fondo más claro bajo la tarjeta (el más desfavorable de los tres anchos).
  // La barra superior ya NO va sobre la foto: es carbón sólido (pares cream/charcoal y cream/charcoalPressed de arriba).
  t('cream', '#3A3A3A', 'tarjeta de vidrio con el banner de 192 dp, foto entera o recortada: peor caso de los tres anchos'),
  // Borde de cobre al 50 % de la tarjeta de vidrio sobre ese peor fondo (el texto queda a 10 dp del borde; el halo va FUERA de la tarjeta).
  // El borde pasó al cobre claro #C79A6B al 45 %; el gris más claro bajo la tarjeta con el banner actual es 240 en los tres anchos (base 60 con
  // velo 40 % y vidrio 60 %), por eso la base es #3C3C3C: 4,52:1 (a 0,5 daba 4,27:1).
  { ...t('cream', '#3C3C3C', 'texto crema junto al borde de cobre claro al 45 %, peor caso'), bgLiteral: { hex: '#C79A6B', over: '#3C3C3C', alpha: 0.45 } },
  // Recuadro de cobre CLARO #C79A6B al 55 % (marcador del logo del box, LOGO_MARKER_ALPHA = 8C) con letra blanca (a 0,60 daba 4,41:1 a 320 dp): base más clara bajo el recuadro (peor caso:
  // la madera del aro, gris 229 sin velo -> 57 con velo 40 % y vidrio 60 %; se usa 58 para cubrir ambos recortes de la foto) y base casi negra.
  { ...t('primaryForeground', 'charcoalAccentLight', 'inicial blanca sobre el cobre claro al 55 %, base más clara bajo el recuadro (4,78:1 a 320 y 360 dp)'), bgLiteral: { hex: '#C79A6B', over: '#3A3A3A', alpha: 0.55 } },
  { ...t('primaryForeground', 'charcoalAccentLight', 'inicial blanca sobre el cobre claro al 55 %, base casi negra'), bgLiteral: { hex: '#C79A6B', over: '#020202', alpha: 0.55 } },
  // Menú inferior nuevo (decisión (p)): carbón fijo con rótulos de 11 sp (texto, 4,5:1) e íconos y borde de Agenda (3:1). El ítem YA seleccionado
  // no se rellena al presionarlo (tocarlo no navega), así que no hay par cobre sobre charcoalPressed para el texto: ahí el cobre da 4,44:1.
  t('charcoalMuted', 'charcoal', 'rótulo inactivo del menú inferior'),
  t('charcoalMuted', 'charcoalPressed', 'rótulo inactivo presionado'),
  t('charcoalAccent', 'charcoal', 'rótulo seleccionado del menú inferior (cobre #B98250, ya sin uso: la enmienda de (p) pasó al cobre claro)'),
  ui('charcoalMuted', 'charcoal', 'ícono inactivo del menú inferior'),
  ui('charcoalMuted', 'charcoalPressed', 'ícono inactivo presionado'),
  ui('charcoalAccent', 'charcoal', 'ícono seleccionado y borde de Agenda'),
  ui('charcoalAccent', 'charcoalPressed', 'ícono y borde de Agenda presionado'),
  // Enmienda de (p): opción seleccionada y borde de Agenda en cobre claro #C79A6B (charcoalAccentLight).
  t('charcoalAccentLight', 'charcoal', 'rótulo seleccionado del menú inferior, cobre claro'),
  ui('charcoalAccentLight', 'charcoal', 'ícono seleccionado y borde de Agenda, cobre claro'),
  ui('charcoalAccentLight', 'charcoalPressed', 'ícono y borde de Agenda presionado, cobre claro'),
  // Regla del cobre (pedido 13): el punto de la campana y el halo de la tarjeta de vidrio pasan al cobre claro. El punto es un ícono sobre carbón
  // (3:1); el halo es decorativo (anillos de 22 %, 11 % y 5 % de opacidad fuera de la tarjeta, sin texto encima). El recuadro de cobre y el borde
  // de la tarjeta también pasaron al cobre claro (ver los pares de más arriba: marcador al 55 % y borde al 45 %).
  ui('charcoalAccentLight', 'charcoal', 'punto de la campana sobre la barra de carbón'),
  // Tarjeta "Tu próxima clase" rediseñada (decisión (r)): fondo grafito/carbón con textura a la derecha y velo negro (100 % hasta el 66 % del
  // ancho, 20 % en el borde derecho; foto al 80 %). Peor caso = el punto más claro de cualquier foto (la pizarra elegida, el aro y, como referencia, otras candidatas aclaradas con gamma 0,70; L máx. 0,991) en 320, 360 y 412 dp; los
  // patrones dibujados en código (rombos, líneas, puntos) son más oscuros que ese peor caso, así que quedan cubiertos por estos pares.
  t('nextClassCardForeground', 'charcoal', 'tarjeta de próxima clase: nombre y textos crema sobre el fondo plano'),
  t('nextClassCardForeground', 'nextClassCardPressed', 'tarjeta de próxima clase: textos crema, presionada'),
  t('charcoalMuted', 'nextClassCardPressed', 'tarjeta de próxima clase: gris cálido (etiqueta, coach, duración y nivel), presionada; el gris va siempre sobre el tramo 100 % negro'),
  t('nextClassCardForeground', '#555555', 'tarjeta de próxima clase: nombre de la clase sobre la textura, peor caso (gris 85)'),
  t('nextClassCardForeground', '#6A6A6A', 'tarjeta de próxima clase: nombre de la clase sobre la textura, presionada, peor caso (gris 106)'),
  { ...ui('nextClassCardForeground', 'charcoal', 'tarjeta de próxima clase: flecha crema en su círculo de vidrio sobre la textura, peor caso'), bgLiteral: { hex: '#000000', over: '#8B8B8B', alpha: 0.6 } },
  { ...ui('charcoalAccent', 'charcoal', 'tarjeta de próxima clase: borde cobre del círculo de la flecha, peor caso'), bgLiteral: { hex: '#000000', over: '#8B8B8B', alpha: 0.6 } },
  { ...ui('charcoalAccentLight', 'charcoal', 'tarjeta de próxima clase: borde cobre claro del círculo de la flecha, peor caso'), bgLiteral: { hex: '#000000', over: '#8B8B8B', alpha: 0.6 } },
  // Tarjeta de frases del día (decisión (s)), opción C editorial. Los tokens quote* valen lo mismo en las dos paletas. El degradado va de quoteCream
  // a cream: se miden los dos extremos. Comillas y montañas son decorativas (sin mínimo; sus razones se informan en ESTADO.md).
  t('quoteInk', 'quoteCream', 'frase: grafito suave sobre el crema (extremo claro del degradado)'),
  t('quoteInk', 'cream', 'frase: grafito suave sobre el beige (extremo oscuro del degradado)'),
  ui('quoteInk', 'quoteCream', 'ícono de compartir sobre el crema'),
  ui('quoteInk', 'border', 'ícono de compartir presionado (círculo sólido border)'),
  t('quoteCopperText', 'quoteCream', 'resaltado final en cobre oscuro sobre el crema'),
  t('quoteCopperText', 'cream', 'resaltado final en cobre oscuro sobre el beige (extremo oscuro del degradado)'),
  // Tarjeta de frases con foto: velo oscuro #0D0F10 UNIFORME del 62 % sobre el punto más claro de la foto (gris 255); el texto va en crema, el resaltado en un
  // marcador de cobre claro con texto oscuro y el ícono de compartir sobre un disco rgba(0,0,0,0.6) (a 60 % el crema daba 4,48:1, por eso 62 %).
  { ...t('nextClassCardForeground', 'charcoal', 'frase con foto: texto crema sobre el velo del 62 % y el punto más claro de la foto'), bgLiteral: { hex: '#0D0F10', over: '#FFFFFF', alpha: 0.62 } },
  t('charcoal', 'charcoalAccentLight', 'frase con foto: texto oscuro sobre el marcador de cobre claro'),
  // Ícono de compartir SIN círculo visible: crema directo sobre la foto con el velo del 62 % (peor caso: gris 255), mínimo 3:1; al presionar, sobre el círculo sólido nextClassCardPressed.
  { ...ui('nextClassCardForeground', 'charcoal', 'frase con foto: ícono de compartir crema sin círculo, sobre el velo del 62 % y el punto más claro de la foto'), bgLiteral: { hex: '#0D0F10', over: '#FFFFFF', alpha: 0.62 } },
  ui('nextClassCardForeground', 'nextClassCardPressed', 'frase con foto: ícono de compartir crema sobre el círculo sólido al presionar'),
  // EXCEPCIÓN ACEPTADA (Pía, 2026-11-08): resaltado en texto cobre claro sobre la foto con el velo del 62 %, peor caso (gris 255, igual a 320, 360 y 412 dp): 2,13:1.
  { ...t('charcoalAccentLight', 'charcoal', 'frase con foto: resaltado en texto cobre claro #C79A6B sobre el velo del 62 % y el punto más claro de la foto (EXCEPCIÓN ACEPTADA)'), bgLiteral: { hex: '#0D0F10', over: '#FFFFFF', alpha: 0.62 }, accepted: { value: 2.13, date: '2026-11-08', by: 'Pía' } },
  // Tarjeta "Progreso mensual" oscura (decisión (v)): crema (número), gris cálido (título, reservadas, leyenda, "/ M clases") sobre la tarjeta #18191A; relleno de la
  // barra (cobre claro) contra la pista (nextClassCardPressed, el token más cercano a #2C2F34) y contra la tarjeta; cápsula "Plan ilimitado" (vidrio rgba(0,0,0,0.6)
  // sobre la tarjeta) con texto crema y borde de cobre claro. Vale igual a 320, 360 y 412 dp y con la letra al 1,0, 1,1 y 1,3: el contraste no depende del tamaño.
  t('nextClassCardForeground', 'nextClassCard', 'progreso mensual oscura: número crema sobre la tarjeta'),
  t('charcoalMuted', 'nextClassCard', 'progreso mensual oscura: gris cálido (título, reservadas, leyenda, total) sobre la tarjeta'),
  ui('charcoalAccentLight', 'nextClassCardPressed', 'progreso mensual oscura: relleno de la barra (cobre claro) contra la pista'),
  ui('charcoalAccentLight', 'nextClassCard', 'progreso mensual oscura: relleno de la barra (cobre claro) contra la tarjeta'),
  { ...t('nextClassCardForeground', 'charcoal', 'progreso mensual oscura: texto crema de la cápsula "Plan ilimitado" sobre su vidrio'), bgLiteral: { hex: '#000000', over: 'nextClassCard', alpha: 0.6 } },
  { ...ui('charcoalAccentLight', 'charcoal', 'progreso mensual oscura: borde de cobre claro de la cápsula contra su vidrio'), bgLiteral: { hex: '#000000', over: 'nextClassCard', alpha: 0.6 } },
  ui('charcoalAccentLight', 'nextClassCard', 'progreso mensual oscura: borde de cobre claro de la cápsula contra la tarjeta'),
  // Versión clara (solo para comparar en desarrollo): número grafito, gris, barra de cobre oscuro, cápsula de acento.
  t('quoteInk', 'card', 'progreso mensual clara: número grafito sobre la tarjeta blanca'),
  t('creamMuted', 'card', 'progreso mensual clara: gris sobre la tarjeta blanca'),
  ui('navActiveTextSmall', 'input', 'progreso mensual clara: barra de cobre oscuro contra su pista'),
  t('accentForeground', 'accent', 'progreso mensual clara: texto de la cápsula de acento'),
  // Variante 'cobre' (solo para comparar en desarrollo; PROGRESS_COPPER = medio + letra oscura). Solo entran las combinaciones que PASAN: cobre medio + letra oscura,
  // cobre claro + letra oscura y cobre oscuro + letra clara. Las otras tres (medio + clara 2,93; oscuro + oscura 3,43; claro + clara 2,26) NO pasan y no se activan.
  // Pista = letra al 25 % sobre el cobre; texto secundario = letra al 85 % sobre el cobre (con cobre oscuro y letra clara queda la letra entera: al 85 % bajaba a 4,10).
  t('charcoal', 'charcoalAccent', 'progreso cobre medio + letra oscura: número y texto sobre el cobre'),
  { ...t('charcoal', 'charcoalAccent', 'progreso cobre medio + letra oscura: texto secundario (letra al 85 %) sobre el cobre'), textOver: { over: 'charcoalAccent', alpha: 0.85 } },
  { ...ui('charcoal', 'charcoal', 'progreso cobre medio + letra oscura: relleno de la barra contra su pista (letra al 25 %)'), bgOver: { over: 'charcoalAccent', alpha: 0.25 } },
  t('nextClassCardForeground', 'charcoal', 'progreso cobre medio / claro + letra oscura: texto crema de la cápsula de carbón'),
  t('charcoal', 'charcoalAccentLight', 'progreso cobre claro + letra oscura: número y texto sobre el cobre'),
  { ...t('charcoal', 'charcoalAccentLight', 'progreso cobre claro + letra oscura: texto secundario (letra al 85 %) sobre el cobre'), textOver: { over: 'charcoalAccentLight', alpha: 0.85 } },
  { ...ui('charcoal', 'charcoal', 'progreso cobre claro + letra oscura: relleno de la barra contra su pista (letra al 25 %)'), bgOver: { over: 'charcoalAccentLight', alpha: 0.25 } },
  t('nextClassCardForeground', 'navActiveTextSmall', 'progreso cobre oscuro + letra clara: número y texto (letra entera) sobre el cobre'),
  { ...ui('nextClassCardForeground', 'nextClassCardForeground', 'progreso cobre oscuro + letra clara: relleno de la barra contra su pista (letra al 25 %)'), bgOver: { over: 'navActiveTextSmall', alpha: 0.25 } },
  t('charcoal', 'nextClassCardForeground', 'progreso cobre oscuro + letra clara: texto oscuro de la cápsula de crema'),
  ui('charcoal', 'charcoalAccent', 'progreso cobre medio + letra oscura: cápsula de carbón contra el cobre'),
  ui('charcoal', 'charcoalAccentLight', 'progreso cobre claro + letra oscura: cápsula de carbón contra el cobre'),
  ui('nextClassCardForeground', 'navActiveTextSmall', 'progreso cobre oscuro + letra clara: cápsula de crema contra el cobre'),
  // Cápsula de la fecha: A (cobre con texto e ícono carbón), B (cobre oscuro con crema), C (vidrio con borde cobre y texto crema).
  t('charcoal', 'charcoalAccent', 'cápsula A: texto e ícono carbón sobre cobre #B98250'),
  t('charcoal', 'charcoalAccentLight', 'cápsula A con cobre claro: texto e ícono carbón sobre #C79A6B'),
  t('nextClassCardForeground', 'navActiveTextSmall', 'cápsula B: texto e ícono crema sobre cobre oscuro #8B5E34'),
  { ...t('nextClassCardForeground', 'charcoal', 'cápsula C: texto crema sobre el vidrio negro al 60 % sobre la textura, peor caso'), bgLiteral: { hex: '#000000', over: '#333333', alpha: 0.6 } },
  { ...ui('charcoalAccent', 'charcoal', 'cápsula C: borde e ícono cobre sobre el vidrio, peor caso'), bgLiteral: { hex: '#000000', over: '#333333', alpha: 0.6 } },
  // Estado sin reserva: título de 21 sp (antes 26) con el MISMO crema: el tamaño no cambia la razón de contraste, pero el título ya no es texto
  // grande, así que se exige 4,5:1 en el peor caso (sobre la textura, hasta 80 % del ancho, antes de la flecha).
  t('nextClassCardForeground', 'charcoal', 'título "Reserva tu próxima clase" (21 sp) sobre el velo negro'),
  t('nextClassCardForeground', '#555555', 'título "Reserva tu próxima clase" (21 sp) sobre la textura, peor caso (gris 85)'),
  t('nextClassCardForeground', '#6A6A6A', 'título "Reserva tu próxima clase" (21 sp) sobre la textura presionada, peor caso (gris 106)'),
  { ...ui('charcoalAccentLight', 'charcoal', 'cápsula C con cobre claro: borde e ícono sobre el vidrio, peor caso'), bgLiteral: { hex: '#000000', over: '#333333', alpha: 0.6 } },
  // Texto sobre la superficie crema y sobre las tarjetas
  t('foreground', 'cream', 'títulos y nombres sobre la crema'),
  t('creamMuted', 'cream', 'gris de texto sobre la crema'),
  t('navActiveTextSmall', 'cream', 'ícono y texto chico cobre sobre la crema'),
  t('creamMuted', 'card', 'etiquetas y leyendas sobre tarjetas blancas'),
  t('creamMuted', 'cardPressed', 'etiquetas sobre tarjeta blanca presionada'),
  t('creamMuted', 'successBackground', 'etiqueta del PR destacado'),
  t('creamMuted', 'successBackgroundPressed', 'etiqueta del PR destacado presionado'),
  t('creamMuted', 'warningBackground', 'etiqueta de los avisos'),
  t('creamMuted', 'accent', 'gris de texto sobre el relleno cobre claro'),
  t('navActiveTextSmall', 'card', 'inicial de los cumpleaños sobre blanco'),
  t('foreground', 'cardPressed', 'tarjeta blanca presionada'),
  t('foreground', 'successBackgroundPressed', 'PR destacado presionado'),
  t('foreground', 'warningBackgroundPressed', 'aviso importante presionado'),
  t('creamMuted', 'warningBackgroundPressed', 'etiqueta del aviso importante presionado'),
  t('accentForeground', 'accent', 'WOD de hoy y frase'),
  t('accentForeground', 'accentPressed', 'WOD de hoy presionado'),
];

const parse = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mixHex = (fg: string, bg: string, alpha: number): string =>
  '#' +
  parse(fg)
    .map((v, i) => Math.round(v * alpha + (parse(bg)[i] as number) * (1 - alpha)).toString(16).padStart(2, '0'))
    .join('');

/** Un token de la paleta o un hex escrito a mano (por ejemplo el punto más claro de la foto). */
const pick = (palette: Record<string, string>, key: string): string | undefined => (key.startsWith('#') ? key : palette[key]);

const lin = (hex: string): number[] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
};
const luminance = (hex: string): number => {
  const [r, g, b] = lin(hex) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export type Measure = { pair: Pair; ratio: number | null; ok: boolean };

/** `ratio: null` = el token no existe en la paleta (cuenta como falla). */
export function measure(palette: Record<string, string>, pairs: Pair[] = PAIRS): Measure[] {
  return pairs.map((pair) => {
    let a = pick(palette, pair.text);
    let b = pick(palette, pair.bg);
    if (!a || !b) return { pair, ratio: null, ok: false };
    if (pair.textOver) {
      const under = pick(palette, pair.textOver.over);
      if (!under) return { pair, ratio: null, ok: false };
      a = mixHex(a, under, pair.textOver.alpha);
    }
    if (pair.bgOver) {
      const under = pick(palette, pair.bgOver.over);
      if (!under) return { pair, ratio: null, ok: false };
      b = mixHex(b, under, pair.bgOver.alpha);
    }
    if (pair.bgLiteral) {
      const under = pick(palette, pair.bgLiteral.over);
      if (!under) return { pair, ratio: null, ok: false };
      b = mixHex(pair.bgLiteral.hex, under, pair.bgLiteral.alpha);
    }
    const ratio = contrast(a, b);
    return { pair, ratio, ok: ratio >= pair.min };
  });
}
