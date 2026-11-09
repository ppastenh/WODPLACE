/**
 * Colores de la tarjeta "Progreso mensual" (decisión (v), enmienda del 2026-11-09): barra refinada sobre fondo de COBRE CLARO con letra OSCURA.
 * Lógica pura (sin React Native): elige colores con tokens existentes y mide el contraste real con la misma fórmula que las pruebas
 * (scripts/src/dark-contrast-pairs.ts). No hay colores nuevos: solo mezclas de dos tokens existentes.
 *
 *  - Fondo: charcoalAccentLight (#C79A6B). Letra: charcoal (#0D0F10).
 *  - Pista de la barra: la letra al 25 % sobre el cobre. Texto secundario (título, total, leyenda, reservadas): la letra al 85 % sobre el cobre.
 *  - Cápsula "Plan ilimitado": de carbón con texto crema.
 */
export const TRACK_ALPHA = 0.25;
export const MUTED_ALPHA = 0.85;
export const MIN_SMALL_TEXT = 4.5;
export const MIN_LARGE_AND_GRAPHICS = 3;

export type ProgressPalette = {
  charcoal: string;
  nextClassCardForeground: string;
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

export type ProgressColors = {
  background: string;
  ink: string;
  muted: string;
  track: string;
  fill: string;
  capsuleBg: string;
  capsuleText: string;
};

export function progressColors(p: ProgressPalette): ProgressColors {
  const background = p.charcoalAccentLight;
  const ink = p.charcoal;
  return {
    background,
    ink,
    muted: mixHex(ink, background, MUTED_ALPHA),
    track: mixHex(ink, background, TRACK_ALPHA),
    fill: ink,
    capsuleBg: p.charcoal,
    capsuleText: p.nextClassCardForeground,
  };
}

export type ProgressMeasure = {
  largeText: number; // número y "Sin plan activo" sobre el cobre (mínimo 4,5)
  smallText: number; // título, total, leyenda y reservadas (mínimo 4,5)
  fillVsTrack: number; // relleno de la barra contra su pista (mínimo 3)
  fillVsCard: number; // relleno de la barra contra el cobre (mínimo 3)
  capsuleText: number; // texto crema de la cápsula sobre su carbón (mínimo 4,5)
  capsuleVsCard: number; // cápsula de carbón contra el cobre (mínimo 3)
};

export function progressMeasure(c: ProgressColors): ProgressMeasure {
  return {
    largeText: contrastRatio(c.ink, c.background),
    smallText: contrastRatio(c.muted, c.background),
    fillVsTrack: contrastRatio(c.fill, c.track),
    fillVsCard: contrastRatio(c.fill, c.background),
    capsuleText: contrastRatio(c.capsuleText, c.capsuleBg),
    capsuleVsCard: contrastRatio(c.capsuleBg, c.background),
  };
}

export function progressPasses(m: ProgressMeasure): boolean {
  return (
    m.largeText >= MIN_SMALL_TEXT &&
    m.smallText >= MIN_SMALL_TEXT &&
    m.fillVsTrack >= MIN_LARGE_AND_GRAPHICS &&
    m.fillVsCard >= MIN_LARGE_AND_GRAPHICS &&
    m.capsuleText >= MIN_SMALL_TEXT &&
    m.capsuleVsCard >= MIN_LARGE_AND_GRAPHICS
  );
}
