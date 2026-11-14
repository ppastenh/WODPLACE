import { RADIUS } from '../../constants/radius';
import { mixHex } from './colorMath';

/**
 * FONDO DE COBRE OSCURO compartido por las tarjetas "Medallas" y "Progreso mensual" (decisiones (y) y (v)): UN solo lugar para el degradado horizontal legible de medalCopperDeep #754522
 * (izquierda) a navActiveTextSmall #8B5E34 (derecha), el brillo satinado de cobre claro, el borde fino de cobre base, la sombra y la pista y el relleno de la barra. Pura: sin React.
 * Degradado 'pedido' (solo para comparar en desarrollo, en Medallas): de charcoalAccent #B98250 a medalCopperDeep #754522; el crema del lado izquierdo no llega a 4,5:1 sobre #B98250 (2,9:1).
 */
export type CopperGradient = 'legible' | 'pedido';

export type CopperPalette = {
  nextClassCard: string;
  nextClassCardForeground: string;
  charcoalAccent: string;
  navActiveTextSmall: string;
  medalCopper: string;
  medalCopperDeep: string;
  medalCopperLight: string;
  medalProgress: string;
};

export type CopperSurfaceColors = {
  gradientStart: string;
  gradientEnd: string;
  /** Borde fino de la tarjeta (cobre base). */
  border: string;
  /** Brillo difuso muy tenue (cobre claro) de la esquina superior izquierda. */
  glow: string;
  /** Pista y relleno de la barra de progreso (la pista, una mezcla sólida de cobre profundo y grafito; el relleno, crema dorado). */
  barTrack: string;
  barFill: string;
  /** Barras del esqueleto. */
  bone: string;
};

/** Opacidad del brillo difuso del lado izquierdo (decorativo; el peor punto del texto se mide con él puesto). */
export const GLOW_OPACITY = 0.14;
export const COPPER_BORDER_WIDTH = 1;
export const copperShadow = { shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 } as const;

export function copperSurfaceColors(p: CopperPalette, gradient: CopperGradient = 'legible'): CopperSurfaceColors {
  const start = gradient === 'legible' ? p.medalCopperDeep : p.charcoalAccent;
  const end = gradient === 'legible' ? p.navActiveTextSmall : p.medalCopperDeep;
  const mid = mixHex(end, start, 0.5);
  return {
    gradientStart: start,
    gradientEnd: end,
    border: p.medalCopper,
    glow: p.medalCopperLight,
    barTrack: mixHex(p.medalCopperDeep, p.nextClassCard, 0.5),
    barFill: p.medalProgress,
    bone: mixHex(p.nextClassCardForeground, mid, 0.25),
  };
}

/** Fondo bajo el texto del lado izquierdo, en el peor punto: el brillo sobre el extremo izquierdo, o el punto medio del degradado. */
export function copperBackgrounds(c: Pick<CopperSurfaceColors, 'gradientStart' | 'gradientEnd' | 'glow'>): { glow: string; mid: string; end: string } {
  return { glow: mixHex(c.glow, c.gradientStart, GLOW_OPACITY), mid: mixHex(c.gradientEnd, c.gradientStart, 0.5), end: c.gradientEnd };
}

/** Estilos del contenedor con sombra y de la tarjeta (borde fino, esquinas de 20 dp, recorte): los mismos en las dos tarjetas. */
export function copperSurfaceStyles(shadowColor: string, c: Pick<CopperSurfaceColors, 'gradientStart' | 'border'>) {
  return {
    outer: { borderRadius: RADIUS.xl, ...copperShadow, shadowColor, backgroundColor: c.gradientStart },
    card: { borderRadius: RADIUS.xl, borderWidth: COPPER_BORDER_WIDTH, borderColor: c.border, overflow: 'hidden' as const, backgroundColor: c.gradientStart },
  };
}
