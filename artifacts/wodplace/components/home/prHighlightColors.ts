import { contrastRatio, mixHex } from './progressColors';

/**
 * Colores PUROS de la tarjeta "PR destacado" (decisión (x)): 'champion' (grafito, el elegido) y 'clara' (solo para comparar en desarrollo).
 * Solo tokens existentes y mezclas de dos tokens (sin colores nuevos): el "#24262A" pedido NO es un token; se usa la mezcla 50 % de nextClassCard (#18191A)
 * y nextClassCardPressed (#2E2F35), que da #232427.
 */
export type PrVariant = 'actual' | 'champion' | 'clara';

export type PrPalette = {
  nextClassCard: string;
  nextClassCardForeground: string;
  nextClassCardPressed: string;
  charcoalAccentLight: string;
  charcoalMuted: string;
  card: string;
  cardPressed: string;
  border: string;
  accent: string;
  foreground: string;
  creamMuted: string;
  navActiveTextSmall: string;
};

export type PrColors = {
  background: string;
  /** Extremo del degradado (el de la derecha). Igual a background en 'clara' (sin degradado). */
  gradientEnd: string;
  /** Presionado SÓLIDO (nunca opacidad). */
  pressed: string;
  border: string;
  /** Nombre del movimiento y flecha. */
  primary: string;
  /** Etiqueta "PR destacado". */
  label: string;
  /** Texto de la cápsula y valor. */
  capsuleText: string;
  capsuleFill: string;
  capsuleBorder: string;
  badgeFill: string;
  badgeBorder: string;
  icon: string;
  /** Insignia y textos de los estados vacío (atenuados). */
  muted: string;
  /** Rombos de la textura. */
  texture: string;
  /** Acento diagonal de cobre. */
  accent: string;
  /** Barras del esqueleto. */
  bone: string;
};

/** Opacidad de la textura de rombos (casi imperceptible). */
export const TEXTURE_OPACITY = 0.07;

export function prColors(p: PrPalette, variant: 'champion' | 'clara'): PrColors {
  if (variant === 'clara') {
    return {
      background: p.card,
      gradientEnd: p.card,
      pressed: p.cardPressed,
      border: p.border,
      primary: p.foreground,
      label: p.creamMuted,
      capsuleText: p.foreground,
      capsuleFill: p.accent,
      capsuleBorder: p.navActiveTextSmall,
      badgeFill: p.accent,
      badgeBorder: p.navActiveTextSmall,
      icon: p.navActiveTextSmall,
      muted: p.creamMuted,
      texture: p.border,
      accent: p.navActiveTextSmall,
      bone: p.border,
    };
  }
  const lift = mixHex(p.nextClassCardPressed, p.nextClassCard, 0.5); // #232427
  return {
    background: p.nextClassCard,
    gradientEnd: lift,
    pressed: p.nextClassCardPressed,
    border: p.nextClassCard,
    primary: p.nextClassCardForeground,
    label: p.charcoalAccentLight,
    capsuleText: p.charcoalAccentLight,
    capsuleFill: lift,
    capsuleBorder: p.charcoalAccentLight,
    badgeFill: lift,
    badgeBorder: p.charcoalAccentLight,
    icon: p.charcoalAccentLight,
    muted: p.charcoalMuted,
    texture: p.charcoalMuted,
    accent: p.charcoalAccentLight,
    bone: mixHex(p.charcoalMuted, p.nextClassCard, 0.25),
  };
}

export type PrMeasure = {
  /** Nombre (crema) sobre el peor punto del fondo: el extremo claro del degradado con la textura encima (4,5:1). */
  nameWorst: number;
  /** Nombre sobre el fondo presionado (4,5:1). */
  namePressed: number;
  /** Etiqueta sobre el peor punto del fondo (4,5:1). */
  labelWorst: number;
  /** Etiqueta sobre el fondo presionado (4,5:1). */
  labelPressed: number;
  /** Texto de la cápsula sobre su fondo (4,5:1). */
  capsuleText: number;
  /** Borde de la cápsula contra el fondo de la tarjeta (3:1). */
  capsuleBorder: number;
  /** Borde de la insignia contra el fondo (3:1). */
  badgeBorder: number;
  /** Ícono de barra contra el relleno de la insignia (3:1). */
  icon: number;
  /** Flecha contra el peor punto del fondo (3:1). */
  chevron: number;
  /** Texto atenuado (vacío) sobre el fondo (4,5:1). */
  muted: number;
};

/** Peor punto del fondo bajo el texto: el extremo claro del degradado con la textura (rombos al TEXTURE_OPACITY) encima. */
export function prWorstBackground(c: PrColors): string {
  return mixHex(c.texture, c.gradientEnd, TEXTURE_OPACITY);
}

export function prMeasure(c: PrColors): PrMeasure {
  const worst = prWorstBackground(c);
  return {
    nameWorst: contrastRatio(c.primary, worst),
    namePressed: contrastRatio(c.primary, c.pressed),
    labelWorst: contrastRatio(c.label, worst),
    labelPressed: contrastRatio(c.label, c.pressed),
    capsuleText: contrastRatio(c.capsuleText, c.capsuleFill),
    capsuleBorder: contrastRatio(c.capsuleBorder, c.background),
    badgeBorder: contrastRatio(c.badgeBorder, c.background),
    icon: contrastRatio(c.icon, c.badgeFill),
    chevron: contrastRatio(c.primary, worst),
    muted: contrastRatio(c.muted, worst),
  };
}

/** true si cumple los mínimos: 4,5:1 para textos y 3:1 para gráficos. */
export function prPasses(m: PrMeasure): boolean {
  return (
    m.nameWorst >= 4.5 &&
    m.namePressed >= 4.5 &&
    m.labelWorst >= 4.5 &&
    m.labelPressed >= 4.5 &&
    m.capsuleText >= 4.5 &&
    m.capsuleBorder >= 3 &&
    m.badgeBorder >= 3 &&
    m.icon >= 3 &&
    m.chevron >= 3 &&
    m.muted >= 4.5
  );
}
