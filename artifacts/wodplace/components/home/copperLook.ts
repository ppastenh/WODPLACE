/**
 * Tarjeta "Progreso mensual", variante 'cobre' (decisión (v), complemento del pedido 22). Lógica pura (sin React Native): elige colores con tokens
 * existentes y mide el contraste real de la combinación, con la misma fórmula que las pruebas (scripts/src/dark-contrast-pairs.ts).
 *
 *  - Fondo: uno de tres cobres existentes (medio charcoalAccent #B98250, oscuro navActiveTextSmall #8B5E34, claro charcoalAccentLight #C79A6B).
 *  - Letra: oscura (carbón #0D0F10, token charcoal) o clara (crema #F6F1E8, token nextClassCardForeground).
 *  - Pista de la barra: el color de la letra al 25 % sobre el cobre. Texto secundario: la letra al 85 % sobre el cobre si así mantiene 4,5:1;
 *    si no, la letra entera (nunca un gris del tema oscuro). No hay colores nuevos: solo mezclas de dos tokens existentes.
 *  - Con una combinación que no pasa los mínimos la tarjeta SE PUEDE ver en desarrollo, pero NO puede ser la de Inicio real (COPPER_COMBO_OK).
 */
export type CopperTone = 'medio' | 'oscuro' | 'claro';
export type CopperInk = 'oscura' | 'clara';
export type CopperChoice = { tone: CopperTone; ink: CopperInk };

/** Combinación que usaría Inicio si la variante de producción fuera 'cobre'. Una prueba exige que cumpla los mínimos. */
export const PROGRESS_COPPER: CopperChoice = { tone: 'medio', ink: 'oscura' };

export const COPPER_TRACK_ALPHA = 0.25;
export const COPPER_MUTED_ALPHA = 0.85;
export const MIN_SMALL_TEXT = 4.5;
export const MIN_LARGE_AND_GRAPHICS = 3;

export type CopperPalette = {
  charcoal: string;
  nextClassCardForeground: string;
  charcoalAccent: string;
  navActiveTextSmall: string;
  charcoalAccentLight: string;
};

const parse = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mixHex = (fg: string, bg: string, alpha: number): string => {
  const f = parse(fg);
  const b = parse(bg);
  return '#' + f.map((v, i) => Math.round(v * alpha + (b[i] as number) * (1 - alpha)).toString(16).padStart(2, '0')).join('');
};
const luminance = (hex: string): number => {
  const [r, g, b] = parse(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Misma fórmula (WCAG) que contrast() de scripts/src/dark-contrast-pairs.ts. */
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export type CopperColors = {
  background: string;
  ink: string;
  muted: string;
  track: string;
  fill: string;
  capsuleBg: string;
  capsuleText: string;
  capsuleBorder: string;
};

export function copperColors(p: CopperPalette, choice: CopperChoice): CopperColors {
  const background = choice.tone === 'medio' ? p.charcoalAccent : choice.tone === 'oscuro' ? p.navActiveTextSmall : p.charcoalAccentLight;
  const dark = choice.ink === 'oscura';
  const ink = dark ? p.charcoal : p.nextClassCardForeground;
  const softer = mixHex(ink, background, COPPER_MUTED_ALPHA);
  const muted = contrastRatio(softer, background) >= MIN_SMALL_TEXT ? softer : ink;
  // La cápsula se adapta: con letra oscura, cápsula de carbón con texto crema; con letra clara, cápsula de crema con texto oscuro (borde fino del mismo color que la cápsula).
  const capsuleBg = dark ? p.charcoal : p.nextClassCardForeground;
  const capsuleText = dark ? p.nextClassCardForeground : p.charcoal;
  return {
    background,
    ink,
    muted,
    track: mixHex(ink, background, COPPER_TRACK_ALPHA),
    fill: ink,
    capsuleBg,
    capsuleText,
    capsuleBorder: capsuleBg,
  };
}

export type CopperMeasure = {
  largeText: number; // número grande: letra sobre el cobre (mínimo 3)
  smallText: number; // título y leyenda: texto secundario sobre el cobre (mínimo 4,5)
  bar: number; // relleno de la barra contra el cobre (mínimo 3)
  fillVsTrack: number; // relleno contra su pista (mínimo 3)
  capsuleText: number; // texto de la cápsula sobre la cápsula (mínimo 4,5)
  capsuleVsCard: number; // cápsula contra el cobre (mínimo 3)
};

export function copperMeasure(colors: CopperColors): CopperMeasure {
  return {
    largeText: contrastRatio(colors.ink, colors.background),
    smallText: contrastRatio(colors.muted, colors.background),
    bar: contrastRatio(colors.fill, colors.background),
    fillVsTrack: contrastRatio(colors.fill, colors.track),
    capsuleText: contrastRatio(colors.capsuleText, colors.capsuleBg),
    capsuleVsCard: contrastRatio(colors.capsuleBg, colors.background),
  };
}

export function copperPasses(m: CopperMeasure): boolean {
  return (
    m.largeText >= MIN_LARGE_AND_GRAPHICS &&
    m.smallText >= MIN_SMALL_TEXT &&
    m.bar >= MIN_LARGE_AND_GRAPHICS &&
    m.fillVsTrack >= MIN_LARGE_AND_GRAPHICS &&
    m.capsuleText >= MIN_SMALL_TEXT &&
    m.capsuleVsCard >= MIN_LARGE_AND_GRAPHICS
  );
}
