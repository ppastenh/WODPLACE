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

const parse = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mixHex = (fg: string, bg: string, alpha: number): string =>
  '#' +
  parse(fg)
    .map((v, i) => Math.round(v * alpha + (parse(bg)[i] as number) * (1 - alpha)).toString(16).padStart(2, '0'))
    .join('');

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
export function measure(palette: Record<string, string>): Measure[] {
  return PAIRS.map((pair) => {
    let a = palette[pair.text];
    let b = palette[pair.bg];
    if (!a || !b) return { pair, ratio: null, ok: false };
    if (pair.textOver) {
      const under = palette[pair.textOver.over];
      if (!under) return { pair, ratio: null, ok: false };
      a = mixHex(a, under, pair.textOver.alpha);
    }
    if (pair.bgOver) {
      const under = palette[pair.bgOver.over];
      if (!under) return { pair, ratio: null, ok: false };
      b = mixHex(b, under, pair.bgOver.alpha);
    }
    if (pair.bgLiteral) {
      const under = palette[pair.bgLiteral.over];
      if (!under) return { pair, ratio: null, ok: false };
      b = mixHex(pair.bgLiteral.hex, under, pair.bgLiteral.alpha);
    }
    const ratio = contrast(a, b);
    return { pair, ratio, ok: ratio >= pair.min };
  });
}
