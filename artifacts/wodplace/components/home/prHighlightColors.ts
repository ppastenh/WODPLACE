import { contrastRatio, mixHex } from './progressColors';

/**
 * Colores PUROS de la tarjeta "PR destacado" (decisión (x), concepto PR Champion en grafito). Solo tokens existentes y mezclas de dos tokens (sin colores nuevos).
 * El cobre es el MISMO de las tarjetas "Tu nivel" y "Racha de constancia" (levelStreakColors.ts): charcoalAccent #B98250 en el borde de la insignia, el ícono y los
 * indicadores; el relleno de la insignia es el mismo carbón (charcoal). El "#24262A" pedido en su día NO es un token: el extremo del degradado y el relleno de la cápsula son
 * la mezcla 50 % de nextClassCard (#18191A) y nextClassCardPressed (#2E2F35), que da #232428.
 */
export type PrPalette = {
  nextClassCard: string;
  nextClassCardForeground: string;
  nextClassCardPressed: string;
  charcoal: string;
  charcoalAccent: string;
  charcoalMuted: string;
  glassBackground: string;
};

export type PrColors = {
  background: string;
  /** Extremo del degradado (el de la derecha). */
  gradientEnd: string;
  /** Presionado SÓLIDO (nunca opacidad). */
  pressed: string;
  /** Nombre del movimiento y flecha. */
  primary: string;
  /** Etiqueta "PR destacado" (cobre). */
  label: string;
  /** Etiqueta mientras se presiona: crema (el cobre sobre el presionado da 4,05:1, menos de 4,5:1). */
  labelPressed: string;
  /** Texto, borde e ícono de la cápsula (cobre). */
  capsuleText: string;
  capsuleFill: string;
  capsuleBorder: string;
  /** Insignia hexagonal: el mismo tratamiento que las insignias de "Tu nivel" y "Racha" (relleno de carbón, borde e ícono de cobre). */
  badgeFill: string;
  badgeBorder: string;
  icon: string;
  /** Insignia y textos atenuados (cargando, error, vacío). */
  muted: string;
  /** Flecha en círculo (la de "Tu próxima clase" en versión pequeña): borde de cobre medio (el mismo del modelo), relleno translúcido oscuro y flecha en crema (primary). */
  arrowBorder: string;
  arrowFill: string;
  /** Rombos de la textura. */
  texture: string;
  /** Acento diagonal de cobre. */
  accent: string;
  /** Barras del esqueleto. */
  bone: string;
};

/** Opacidad del relleno translúcido de la flecha (glassBackground = negro al 60 %). */
export const GLASS_ALPHA = 0.6;
/** Opacidad de la textura de rombos (casi imperceptible). */
export const TEXTURE_OPACITY = 0.07;

export function prColors(p: PrPalette): PrColors {
  const lift = mixHex(p.nextClassCardPressed, p.nextClassCard, 0.5); // #232428
  return {
    background: p.nextClassCard,
    gradientEnd: lift,
    pressed: p.nextClassCardPressed,
    primary: p.nextClassCardForeground,
    label: p.charcoalAccent,
    labelPressed: p.nextClassCardForeground,
    capsuleText: p.charcoalAccent,
    capsuleFill: lift,
    capsuleBorder: p.charcoalAccent,
    badgeFill: p.charcoal,
    badgeBorder: p.charcoalAccent,
    icon: p.charcoalAccent,
    muted: p.charcoalMuted,
    arrowBorder: p.charcoalAccent,
    arrowFill: p.glassBackground,
    texture: p.charcoalMuted,
    accent: p.charcoalAccent,
    bone: mixHex(p.charcoalMuted, p.nextClassCard, 0.25),
  };
}

export type PrMeasure = {
  /** Nombre (crema) sobre el peor punto del fondo: el extremo claro del degradado con la textura encima (4,5:1). */
  nameWorst: number;
  /** Nombre sobre el fondo presionado (4,5:1). */
  namePressed: number;
  /** Etiqueta (cobre) sobre el punto medio del degradado: queda a la izquierda, antes de la textura (4,5:1). */
  labelMid: number;
  /** Etiqueta (crema) sobre el fondo presionado (4,5:1). */
  labelPressed: number;
  /** Texto de la cápsula sobre su fondo (4,5:1). */
  capsuleText: number;
  /** Borde de la cápsula contra el fondo de la tarjeta (3:1). */
  capsuleBorder: number;
  /** Borde de la insignia contra el fondo (3:1). */
  badgeBorder: number;
  /** Ícono de barra contra el relleno de la insignia (3:1). */
  icon: number;
  /** Flecha en círculo: borde contra el peor punto del fondo y contra el presionado (3:1), y la flecha (crema) contra el relleno translúcido (3:1). */
  arrowBorder: number;
  arrowBorderPressed: number;
  arrowVsFill: number;
  /** Texto atenuado (la sugerencia del vacío) sobre el punto medio del degradado (4,5:1). */
  muted: number;
};

/** Peor punto del fondo a la derecha: el extremo claro del degradado con la textura (rombos al TEXTURE_OPACITY) encima. */
export function prWorstBackground(c: PrColors): string {
  return mixHex(c.texture, c.gradientEnd, TEXTURE_OPACITY);
}

/** Punto medio del degradado: el fondo bajo la etiqueta y la sugerencia, que quedan en la mitad izquierda (la textura empieza al 58 % del ancho). */
export function prMidBackground(c: PrColors): string {
  return mixHex(c.gradientEnd, c.background, 0.5);
}

export function prMeasure(c: PrColors): PrMeasure {
  const worst = prWorstBackground(c);
  const mid = prMidBackground(c);
  return {
    nameWorst: contrastRatio(c.primary, worst),
    namePressed: contrastRatio(c.primary, c.pressed),
    labelMid: contrastRatio(c.label, mid),
    labelPressed: contrastRatio(c.labelPressed, c.pressed),
    capsuleText: contrastRatio(c.capsuleText, c.capsuleFill),
    capsuleBorder: contrastRatio(c.capsuleBorder, c.background),
    badgeBorder: contrastRatio(c.badgeBorder, c.background),
    icon: contrastRatio(c.icon, c.badgeFill),
    arrowBorder: contrastRatio(c.arrowBorder, c.gradientEnd),
    arrowBorderPressed: contrastRatio(c.arrowBorder, c.pressed),
    arrowVsFill: Math.min(contrastRatio(c.primary, mixHex('#000000', c.gradientEnd, GLASS_ALPHA)), contrastRatio(c.primary, mixHex('#000000', c.pressed, GLASS_ALPHA))),
    muted: contrastRatio(c.muted, mid),
  };
}

/** true si cumple los mínimos: 4,5:1 para textos y 3:1 para gráficos. */
export function prPasses(m: PrMeasure): boolean {
  return (
    m.nameWorst >= 4.5 &&
    m.namePressed >= 4.5 &&
    m.labelMid >= 4.5 &&
    m.labelPressed >= 4.5 &&
    m.capsuleText >= 4.5 &&
    m.capsuleBorder >= 3 &&
    m.badgeBorder >= 3 &&
    m.icon >= 3 &&
    m.arrowBorder >= 3 &&
    m.arrowBorderPressed >= 3 &&
    m.arrowVsFill >= 3 &&
    m.muted >= 4.5
  );
}
