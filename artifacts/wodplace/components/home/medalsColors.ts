import { contrastRatio, mixHex } from './progressColors';
import { MEDAL_FROM, MEDAL_ICON, MEDAL_RING, MEDAL_RING_OPACITY, MEDAL_TO } from '../ui/achievementMedalSpec';

/**
 * Colores PUROS de la tarjeta "Medallas" (decisión (y), Copper Achievement) y su medición. Solo tokens (los nuevos de la decisión (y) y los que ya existían) y mezclas de dos tokens;
 * la medalla del logro y el laurel traen sus propios colores (achievementMedalSpec.ts y laurelData.ts).
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
  medalRibbon: string;
};

export type MedalsColors = {
  gradientStart: string;
  gradientEnd: string;
  /** Presionado SÓLIDO (mezcla de nextClassCard y medalCopperDeep); nunca opacidad. */
  pressed: string;
  /** Borde fino de la tarjeta (cobre base). */
  border: string;
  /** Título, contador, nombre y flecha. */
  text: string;
  /** Cinta vertical (café oscuro, más oscuro que el fondo de la tarjeta) y el ícono de medalla que lleva (cobre claro). */
  ribbon: string;
  ribbonIcon: string;
  /** Ícono de la medalla atenuada (sin medallas o con error). */
  mutedIcon: string;
  /** Pista y relleno de la barra de progreso. */
  barTrack: string;
  barFill: string;
  /** Separador vertical (cobre claro). */
  separator: string;
  /** Brillo difuso muy tenue (cobre claro) de la esquina superior izquierda. */
  glow: string;
  /** Barras del esqueleto. */
  bone: string;
};

/** Opacidad del brillo difuso del lado izquierdo (decorativo; el peor punto del texto se mide con él puesto). */
export const GLOW_OPACITY = 0.14;
/** Opacidad del separador vertical (moderada). */
export const SEPARATOR_OPACITY = 0.45;
/** Opacidad del laurel más tenue: sin medallas, con error o cargando (con medalla es la del dibujo, 0,5). */
export const LAUREL_OPACITY_DIM = 0.25;

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
    ribbon: p.medalRibbon,
    ribbonIcon: p.medalCopperLight,
    mutedIcon: mixHex(p.nextClassCardForeground, mid, 0.6),
    barTrack: mixHex(p.medalCopperDeep, p.nextClassCard, 0.5),
    barFill: p.medalProgress,
    separator: p.medalCopperLight,
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
  /** Crema sobre el extremo derecho, el peor punto bajo el nombre del logro y la flecha (4,5:1 para el nombre). */
  rightText: number;
  /** Crema sobre el fondo presionado (4,5:1). */
  pressed: number;
  /** Relleno de la barra contra su pista y contra el fondo de la tarjeta donde se dibuja (3:1). */
  barFillVsTrack: number;
  barFillVsCard: number;
  /** Aro de la medalla (#E2B887 al 75 % sobre el tramo oscuro de su relleno) contra el extremo derecho de la tarjeta. SOLO INFORMATIVO (no entra en medalsPasses): da 2,06:1 y los colores de la medalla los fijó la dueña; la medalla se lee por su ícono (6,33:1). */
  medalRing: number;
  /** Flecha (crema) contra el extremo derecho (3:1). */
  arrow: number;
  /** Ícono de la medalla (crema) contra el tramo MÁS CLARO de su degradado (3:1). */
  medalIcon: number;
  /** Ícono de la cinta (cobre claro) contra la cinta (3:1). */
  ribbonIcon: number;
  /** Silueta de la cinta contra el peor fondo del lado izquierdo. SOLO INFORMATIVO (no entra en medalsPasses): con el café no llega a 3:1 y está aceptado (sin filo). */
  ribbonVsCard: number;
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
    medalRing: contrastRatio(mixHex(MEDAL_RING, MEDAL_TO, MEDAL_RING_OPACITY), c.gradientEnd),
    arrow: contrastRatio(c.text, c.gradientEnd),
    medalIcon: contrastRatio(MEDAL_ICON, MEDAL_FROM),
    ribbonIcon: contrastRatio(c.ribbonIcon, c.ribbon),
    ribbonVsCard: Math.min(contrastRatio(c.ribbon, glow), contrastRatio(c.ribbon, mid)),
  };
}

/** true si cumple los mínimos: 4,5:1 para el texto pequeño (título, nombre y presionado), 3:1 para el contador grande y los gráficos. */
export function medalsPasses(m: MedalsMeasure): boolean {
  return (
    m.titleWorst >= 4.5 &&
    m.counterWorst >= 3 &&
    m.rightText >= 4.5 &&
    m.pressed >= 4.5 &&
    m.barFillVsTrack >= 3 &&
    m.barFillVsCard >= 3 &&
    m.arrow >= 3 &&
    m.medalIcon >= 3 &&
    m.ribbonIcon >= 3
  );
}
