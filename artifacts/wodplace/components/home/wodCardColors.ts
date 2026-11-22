import { contrastRatio, mixHex } from './colorMath';

/**
 * Colores de la tarjeta del WOD (decisión (ab)). Lógica pura: solo tokens existentes y mezclas de dos tokens (sin hex escritos a mano). Grafito de las tarjetas adaptadas de Inicio (nextClassCard), crema,
 * gris cálido charcoalMuted, cobre #B98250 / cobre claro #C79A6B y la superficie interna #232428 (la mezcla 50 % de nextClassCard y nextClassCardPressed que ya usa "PR destacado").
 */
export type WodPalette = {
  nextClassCard: string;
  nextClassCardPressed: string;
  nextClassCardForeground: string;
  charcoalMuted: string;
  charcoalAccent: string;
  charcoalAccentLight: string;
};

/** Opacidad de los rombos del moleteado: casi invisibles (adorno decorativo, nunca baja la lectura; el peor punto se mide). */
export const WOD_TEXTURE_ALPHA = 0.05;

export type WodColors = {
  background: string;
  pressed: string;
  /** Superficie interna (etiquetas de modalidad). */
  inner: string;
  primary: string;
  secondary: string;
  /** Borde de la tarjeta especial (cobre claro). */
  cardBorder: string;
  bolt: string;
  label: string;
  capsuleBg: string;
  capsuleBorder: string;
  capsuleText: string;
  chipBorder: string;
  chipText: string;
  tagBorderSpecial: string;
  tagBorderStandard: string;
  bone: string;
};

export function wodColors(p: WodPalette): WodColors {
  const inner = mixHex(p.nextClassCardPressed, p.nextClassCard, 0.5); // #232428
  return {
    background: p.nextClassCard,
    pressed: p.nextClassCardPressed,
    inner,
    primary: p.nextClassCardForeground,
    secondary: p.charcoalMuted,
    cardBorder: p.charcoalAccentLight,
    bolt: p.charcoalAccent,
    label: p.charcoalAccentLight,
    capsuleBg: mixHex(p.charcoalAccent, p.nextClassCard, 0.2), // cobre muy oscuro
    capsuleBorder: p.charcoalAccent,
    capsuleText: p.charcoalAccentLight,
    chipBorder: p.charcoalAccent,
    chipText: p.charcoalAccentLight,
    tagBorderSpecial: p.charcoalAccent,
    tagBorderStandard: p.charcoalMuted,
    bone: mixHex(p.charcoalMuted, p.nextClassCard, 0.25),
  };
}

export type WodMeasure = {
  primaryOnBg: number;
  primaryOnPressed: number;
  primaryOnInner: number;
  secondaryOnBg: number;
  secondaryOnPressed: number;
  secondaryOnInner: number;
  cardBorderOnBg: number;
  tagBorderSpecialOnInner: number;
  tagBorderStandardOnInner: number;
  boltOnBg: number;
  labelOnBg: number;
  capsuleText: number;
  capsuleBorder: number;
  chipTextOnBg: number;
  chipBorderOnBg: number;
  /** Peor punto de la textura: crema al 5 % sobre el grafito, bajo el gris cálido y la crema. Al presionar la textura se apaga (fondo sólido #2E2F35). */
  textureSecondaryWorst: number;
  texturePrimaryWorst: number;
};

export function wodMeasure(c: WodColors): WodMeasure {
  const worst = mixHex(c.primary, c.background, WOD_TEXTURE_ALPHA);
  return {
    primaryOnBg: contrastRatio(c.primary, c.background),
    primaryOnPressed: contrastRatio(c.primary, c.pressed),
    primaryOnInner: contrastRatio(c.primary, c.inner),
    secondaryOnBg: contrastRatio(c.secondary, c.background),
    secondaryOnPressed: contrastRatio(c.secondary, c.pressed),
    secondaryOnInner: contrastRatio(c.secondary, c.inner),
    cardBorderOnBg: contrastRatio(c.cardBorder, c.background),
    tagBorderSpecialOnInner: contrastRatio(c.tagBorderSpecial, c.inner),
    tagBorderStandardOnInner: contrastRatio(c.tagBorderStandard, c.inner),
    boltOnBg: contrastRatio(c.bolt, c.background),
    labelOnBg: contrastRatio(c.label, c.background),
    capsuleText: contrastRatio(c.capsuleText, c.capsuleBg),
    capsuleBorder: contrastRatio(c.capsuleBorder, c.background),
    chipTextOnBg: contrastRatio(c.chipText, c.background),
    chipBorderOnBg: contrastRatio(c.chipBorder, c.background),
    textureSecondaryWorst: contrastRatio(c.secondary, worst),
    texturePrimaryWorst: contrastRatio(c.primary, worst),
  };
}
