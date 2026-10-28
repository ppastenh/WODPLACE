/**
 * Pares texto/fondo REALES de la paleta oscura (artifacts/wodplace/constants/darkColors.ts) y su medición con la fórmula de
 * contraste WCAG 2.x. Lo usan la prueba (test-dark-contrast.ts, que FALLA bajo el mínimo) y los informes de antes/después.
 *
 * Mínimos: 4,5:1 para texto y 3:1 para íconos y bordes de campos de formulario. El borde decorativo (`border`) no se mide:
 * no delimita un campo (para eso existe `inputBorder`).
 */
export type Pair = { text: string; bg: string; min: 4.5 | 3; note: string };

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
  t('inactive', 'background', 'gris inactivo como texto'),
  t('inactive', 'card', ''),
  t('inactive', 'nextClassCard', 'meta de la tarjeta de próxima clase'),
  t('inactive', 'nextClassCardPressed', 'meta, presionada'),
  t('inactiveForeground', 'inactive', 'chip inactivo'),
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
    const a = palette[pair.text];
    const b = palette[pair.bg];
    if (!a || !b) return { pair, ratio: null, ok: false };
    const ratio = contrast(a, b);
    return { pair, ratio, ok: ratio >= pair.min };
  });
}
