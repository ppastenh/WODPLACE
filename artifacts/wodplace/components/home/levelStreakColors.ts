import { contrastRatio, mixHex } from './progressColors';

/**
 * Colores PUROS de los recuadros "Tu nivel" y "Racha de constancia" (decisión (w)) en sus dos tratamientos, y su medición. Solo tokens existentes y mezclas de dos tokens
 * (sin colores nuevos, sin opacidad): grafito = nextClassCard, crema = nextClassCardForeground, gris cálido = charcoalMuted, cobre = charcoalAccent,
 * cobre oscuro = navActiveTextSmall, carbón = charcoal.
 */
export type Tone = 'grafito' | 'cobre';

export type LevelStreakPalette = {
  nextClassCard: string;
  nextClassCardForeground: string;
  charcoalMuted: string;
  charcoalAccent: string;
  charcoalAccentLight: string;
  navActiveTextSmall: string;
  charcoal: string;
  nextClassCardPressed: string;
};

export type LevelStreakColors = {
  background: string;
  /** Presionado SÓLIDO de la mitad/tarjeta "Tu nivel" (nunca opacidad). */
  pressed: string;
  /** Texto principal (rango y número de días). */
  primary: string;
  /** Texto secundario (etiqueta y detalle). En el cobre es crema, no gris: el gris cálido no pasa 4,5:1 sobre el cobre oscuro. */
  secondary: string;
  /** Círculo/insignia de los íconos. */
  badgeFill: string;
  /** Borde del círculo/insignia y del escudo. */
  badgeBorder: string;
  /** Ícono dentro del círculo. */
  icon: string;
  /** Separador vertical de C y bordes de E (mezcla sólida, no opacidad). */
  divider: string;
  /** Indicador de racha completado. */
  dotFilled: string;
  /** Contorno del indicador pendiente (el relleno de los pendientes es transparente: el contorno es lo que se ve). */
  dotOutline: string;
  /** Detalles geométricos de E (esquinas, líneas finas). */
  detail: string;
  /** Barras del esqueleto. */
  bone: string;
};

/** Mezcla de cobre en el separador de C en grafito: 70 % de #B98250 sobre grafito (3,29:1; con 60 % ya no llega a 3:1). */
export const DIVIDER_MIX = 0.7;

export function levelStreakColors(p: LevelStreakPalette, tone: Tone): LevelStreakColors {
  if (tone === 'cobre') {
    return {
      background: p.navActiveTextSmall,
      pressed: mixHex(p.charcoal, p.navActiveTextSmall, 0.2),
      primary: p.nextClassCardForeground,
      secondary: p.nextClassCardForeground,
      badgeFill: p.nextClassCard,
      badgeBorder: p.nextClassCardForeground,
      icon: p.nextClassCardForeground,
      divider: p.charcoal,
      dotFilled: p.nextClassCardForeground,
      dotOutline: p.nextClassCardForeground,
      detail: p.charcoal,
      bone: mixHex(p.nextClassCardForeground, p.navActiveTextSmall, 0.3),
    };
  }
  return {
    background: p.nextClassCard,
    pressed: p.nextClassCardPressed,
    primary: p.nextClassCardForeground,
    secondary: p.charcoalMuted,
    badgeFill: p.charcoal,
    badgeBorder: p.charcoalAccent,
    icon: p.charcoalAccent,
    divider: mixHex(p.charcoalAccent, p.nextClassCard, DIVIDER_MIX),
    dotFilled: p.charcoalAccent,
    dotOutline: p.charcoalMuted,
    detail: p.navActiveTextSmall,
    bone: mixHex(p.charcoalMuted, p.nextClassCard, 0.25),
  };
}

export type LevelStreakMeasure = {
  /** Texto principal sobre el fondo (4,5:1). */
  primaryText: number;
  /** Texto secundario sobre el fondo (4,5:1). */
  secondaryText: number;
  /** Texto principal sobre el fondo presionado (4,5:1). */
  primaryPressed: number;
  /** Texto secundario sobre el fondo presionado (4,5:1). */
  secondaryPressed: number;
  /** Separador contra el fondo (3:1). */
  divider: number;
  /** Ícono contra el círculo (3:1). */
  iconVsBadge: number;
  /** Borde del círculo contra el fondo (3:1). */
  badgeBorder: number;
  /** Indicador completado contra el fondo (3:1). */
  dotFilled: number;
  /** Contorno del indicador pendiente contra el fondo (3:1). */
  dotOutline: number;
};

export function levelStreakMeasure(c: LevelStreakColors): LevelStreakMeasure {
  return {
    primaryText: contrastRatio(c.primary, c.background),
    secondaryText: contrastRatio(c.secondary, c.background),
    primaryPressed: contrastRatio(c.primary, c.pressed),
    secondaryPressed: contrastRatio(c.secondary, c.pressed),
    divider: contrastRatio(c.divider, c.background),
    iconVsBadge: contrastRatio(c.icon, c.badgeFill),
    badgeBorder: contrastRatio(c.badgeBorder, c.background),
    dotFilled: contrastRatio(c.dotFilled, c.background),
    dotOutline: contrastRatio(c.dotOutline, c.background),
  };
}

/** true si cumple los mínimos: 4,5:1 para textos y 3:1 para gráficos. */
export function levelStreakPasses(m: LevelStreakMeasure): boolean {
  return (
    m.primaryText >= 4.5 &&
    m.secondaryText >= 4.5 &&
    m.primaryPressed >= 4.5 &&
    m.secondaryPressed >= 4.5 &&
    m.divider >= 3 &&
    m.iconVsBadge >= 3 &&
    m.badgeBorder >= 3 &&
    m.dotFilled >= 3 &&
    m.dotOutline >= 3
  );
}
