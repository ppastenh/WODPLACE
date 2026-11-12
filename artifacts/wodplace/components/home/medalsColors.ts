import { contrastRatio, mixHex } from './progressColors';

/**
 * Colores PUROS de la tarjeta "Medallas" (decisión (y), Copper Achievement) y su medición. Solo tokens (los cuatro nuevos de la decisión (y) y los que ya existían) y mezclas de dos tokens.
 *
 * Degradado 'legible' (el de Inicio): de medalCopperDeep #754522 (izquierda) a navActiveTextSmall #8B5E34 (derecha); mantiene todo el texto pequeño sobre 4,5:1.
 * Degradado 'pedido' (solo para comparar en desarrollo): de charcoalAccent #B98250 a medalCopperDeep #754522; el crema del lado izquierdo no llega a 4,5:1 sobre #B98250 (2,9:1).
 */
export type MedalsGradient = 'legible' | 'pedido';

export type MedalsPalette = {
  nextClassCard: string;
  nextClassCardForeground: string;
  charcoalAccent: string;
  navActiveTextSmall: string;
  medalCopper: string;
  medalCopperDeep: string;
  medalCopperLight: string;
  medalProgress: string;
};

export type MedalsColors = {
  gradientStart: string;
  gradientEnd: string;
  /** Presionado SÓLIDO (mezcla de nextClassCard y medalCopperDeep); nunca opacidad. */
  pressed: string;
  /** Borde fino de la tarjeta (cobre base). */
  border: string;
  /** Título, contador, etiqueta, nombre y flecha. */
  text: string;
  /** Cinta vertical (grafito). */
  ribbon: string;
  /** Relleno de la medalla (cobre profundo) y su borde (cobre claro). */
  medalFill: string;
  medalBorder: string;
  /** Ícono de la medalla (crema). */
  medalIcon: string;
  /** Ícono y contorno de la medalla atenuada (sin medallas, cargando o error). */
  mutedIcon: string;
  /** Pista y relleno de la barra de progreso. */
  barTrack: string;
  barFill: string;
  /** Separador vertical y corona de laurel (cobre claro). */
  separator: string;
  laurel: string;
  /** Brillo difuso muy tenue (cobre claro) de la esquina superior izquierda. */
  glow: string;
  /** Barras del esqueleto. */
  bone: string;
};

/** Opacidad del brillo difuso del lado izquierdo (decorativo; el peor punto del texto se mide con él puesto). */
export const GLOW_OPACITY = 0.14;
/** Opacidad del separador vertical (moderada). */
export const SEPARATOR_OPACITY = 0.45;
/** Opacidad de la corona: normal y tenue (sin medallas). */
export const LAUREL_OPACITY = 0.75;
export const LAUREL_OPACITY_DIM = 0.35;

export function medalsColors(p: MedalsPalette, gradient: MedalsGradient = 'legible'): MedalsColors {
  const start = gradient === 'legible' ? p.medalCopperDeep : p.charcoalAccent;
  const end = gradient === 'legible' ? p.navActiveTextSmall : p.medalCopperDeep;
  const mid = mixHex(end, start, 0.5);
  return {
    gradientStart: start,
    gradientEnd: end,
    pressed: mixHex(p.nextClassCard, p.medalCopperDeep, 0.5),
    border: p.medalCopper,
    text: p.nextClassCardForeground,
    ribbon: p.nextClassCard,
    medalFill: p.medalCopperDeep,
    medalBorder: p.medalCopperLight,
    medalIcon: p.nextClassCardForeground,
    mutedIcon: mixHex(p.nextClassCardForeground, mid, 0.6),
    barTrack: mixHex(p.medalCopperDeep, p.nextClassCard, 0.5),
    barFill: p.medalProgress,
    separator: p.medalCopperLight,
    laurel: p.medalCopperLight,
    glow: p.medalCopperLight,
    bone: mixHex(p.nextClassCardForeground, mid, 0.25),
  };
}

/** Fondo bajo el texto del lado izquierdo, en el peor punto: el brillo difuso sobre el extremo izquierdo, o el punto medio del degradado (el que sea más claro). */
export function medalsLeftBackgrounds(c: MedalsColors): { glow: string; mid: string } {
  return { glow: mixHex(c.glow, c.gradientStart, GLOW_OPACITY), mid: mixHex(c.gradientEnd, c.gradientStart, 0.5) };
}

export type MedalsMeasure = {
  /** Crema sobre el peor fondo del lado izquierdo (título; 4,5:1). */
  titleWorst: number;
  /** Crema sobre el peor fondo del lado izquierdo (contador grande; 3:1). */
  counterWorst: number;
  /** Crema sobre el extremo derecho (etiqueta y nombre; 4,5:1). */
  rightText: number;
  /** Crema sobre el fondo presionado (4,5:1). */
  pressed: number;
  /** Relleno de la barra contra su pista y contra el fondo de la tarjeta donde se dibuja (3:1). */
  barFillVsTrack: number;
  barFillVsCard: number;
  /** Borde de la medalla contra el extremo derecho (3:1). */
  medalBorder: number;
  /** Flecha (crema) contra el extremo derecho (3:1). */
  arrow: number;
  /** Ícono (crema) contra el relleno de la medalla (3:1). */
  medalIcon: number;
};

export function medalsMeasure(c: MedalsColors): MedalsMeasure {
  const { glow, mid } = medalsLeftBackgrounds(c);
  const leftWorst = contrastRatio(c.text, glow) < contrastRatio(c.text, mid) ? glow : mid;
  return {
    titleWorst: contrastRatio(c.text, leftWorst),
    counterWorst: contrastRatio(c.text, leftWorst),
    rightText: contrastRatio(c.text, c.gradientEnd),
    pressed: contrastRatio(c.text, c.pressed),
    barFillVsTrack: contrastRatio(c.barFill, c.barTrack),
    barFillVsCard: Math.min(contrastRatio(c.barFill, glow), contrastRatio(c.barFill, mid)),
    medalBorder: contrastRatio(c.medalBorder, c.gradientEnd),
    arrow: contrastRatio(c.text, c.gradientEnd),
    medalIcon: contrastRatio(c.medalIcon, c.medalFill),
  };
}

/** true si cumple los mínimos: 4,5:1 para el texto pequeño (título, etiqueta, nombre y presionado), 3:1 para el contador grande y los gráficos. */
export function medalsPasses(m: MedalsMeasure): boolean {
  return (
    m.titleWorst >= 4.5 &&
    m.counterWorst >= 3 &&
    m.rightText >= 4.5 &&
    m.pressed >= 4.5 &&
    m.barFillVsTrack >= 3 &&
    m.barFillVsCard >= 3 &&
    m.medalBorder >= 3 &&
    m.arrow >= 3 &&
    m.medalIcon >= 3
  );
}
