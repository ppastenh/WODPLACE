import { contrastRatio, mixHex } from './progressColors';

/**
 * Colores PUROS de los recuadros "Tu nivel" y "Racha de constancia" (decisión (w)) (tratamiento grafito, el elegido), y su medición. Solo tokens existentes y mezclas de dos tokens
 * (sin colores nuevos, sin opacidad): grafito = nextClassCard, crema = nextClassCardForeground, gris cálido = charcoalMuted, cobre = charcoalAccent,
 * cobre oscuro = navActiveTextSmall, carbón = charcoal.
 */
export type LevelStreakPalette = {
  nextClassCard: string;
  nextClassCardForeground: string;
  charcoalMuted: string;
  charcoalAccent: string;
  navActiveTextSmall: string;
  charcoal: string;
  nextClassCardPressed: string;
};

export type LevelStreakColors = {
  background: string;
  /** Presionado SÓLIDO de la tarjeta "Tu nivel" (nunca opacidad). */
  pressed: string;
  /** Texto principal (rango y número de días). */
  primary: string;
  /** Texto secundario (etiqueta y detalle). */
  secondary: string;
  /** Relleno de la insignia. */
  badgeFill: string;
  /** Borde de la insignia (escudo). */
  badgeBorder: string;
  /** Ícono dentro de la insignia. */
  icon: string;
  /** Indicador de racha completado. */
  dotFilled: string;
  /** Contorno del indicador pendiente (el relleno de los pendientes es transparente: el contorno es lo que se ve). */
  dotOutline: string;
  /** Detalles geométricos (esquinas, líneas finas). */
  detail: string;
  /** Barras del esqueleto. */
  bone: string;
};

export function levelStreakColors(p: LevelStreakPalette): LevelStreakColors {
  return {
    background: p.nextClassCard,
    pressed: p.nextClassCardPressed,
    primary: p.nextClassCardForeground,
    secondary: p.charcoalMuted,
    badgeFill: p.charcoal,
    badgeBorder: p.charcoalAccent,
    icon: p.charcoalAccent,
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
  /** Ícono contra la insignia (3:1). */
  iconVsBadge: number;
  /** Borde de la insignia contra el fondo (3:1). */
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
    m.iconVsBadge >= 3 &&
    m.badgeBorder >= 3 &&
    m.dotFilled >= 3 &&
    m.dotOutline >= 3
  );
}
