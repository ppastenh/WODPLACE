import { contrastRatio, mixHex } from './colorMath';

/**
 * Colores y medidas de la tarjeta "Todavía no tienes un box" y de su ventana para unirse (decisión (ac) de DECISIONES-DISENO.md). Lógica pura: solo tokens existentes y mezclas de dos tokens (sin hex escritos a mano).
 * Grafito de las tarjetas adaptadas de Inicio (nextClassCard), crema, gris cálido charcoalMuted, superficie interna #232428 (mezcla 50 % de nextClassCard y nextClassCardPressed), cobre #B98250 para el botón,
 * carbón #0D0F10 para su texto (5,83:1) y, al presionar, cobre claro #C79A6B SÓLIDO (token existente; nunca opacidad). Lo usan NoBoxCard.tsx y JoinBoxModal.tsx.
 */
export type NoBoxPalette = {
  nextClassCard: string;
  nextClassCardPressed: string;
  nextClassCardForeground: string;
  charcoalMuted: string;
  charcoal: string;
  charcoalAccent: string;
  charcoalAccentLight: string;
  destructive: string;
  success: string;
};

/** Opacidad de los rombos del moleteado: casi invisibles (adorno decorativo; el peor punto bajo el texto se mide). */
export const NOBOX_TEXTURE_ALPHA = 0.05;

export type NoBoxColors = {
  background: string;
  /** Superficie interna (campo de la ventana). */
  inner: string;
  primary: string;
  secondary: string;
  button: string;
  buttonPressed: string;
  buttonText: string;
  circleBorder: string;
  icon: string;
  /** Borde del campo con foco (cobre). */
  focusBorder: string;
  /** Borde del campo sin foco: gris cálido a medias con la superficie interna. */
  fieldBorder: string;
  /** Mensajes de la ventana, sobre el grafito de la hoja. */
  error: string;
  success: string;
  /** Barrita de arrastre de la hoja. */
  handle: string;
};

export function noBoxColors(p: NoBoxPalette): NoBoxColors {
  const inner = mixHex(p.nextClassCardPressed, p.nextClassCard, 0.5); // #232428
  return {
    background: p.nextClassCard,
    inner,
    primary: p.nextClassCardForeground,
    secondary: p.charcoalMuted,
    button: p.charcoalAccent,
    buttonPressed: p.charcoalAccentLight,
    buttonText: p.charcoal,
    circleBorder: p.charcoalAccent,
    icon: p.charcoalAccentLight,
    focusBorder: p.charcoalAccent,
    fieldBorder: mixHex(p.charcoalMuted, inner, 0.5),
    error: p.destructive,
    success: p.success,
    handle: mixHex(p.charcoalMuted, p.nextClassCard, 0.5),
  };
}

export type NoBoxMeasure = {
  primaryOnBg: number;
  secondaryOnBg: number;
  primaryOnInner: number;
  secondaryOnInner: number;
  buttonTextOnButton: number;
  buttonTextOnPressed: number;
  circleBorderOnBg: number;
  iconOnBg: number;
  focusBorderOnInner: number;
  errorOnBg: number;
  successOnBg: number;
  /** Peor punto de la textura (crema al 5 % sobre el grafito) bajo el gris cálido y la crema. */
  textureSecondaryWorst: number;
  texturePrimaryWorst: number;
};

export function noBoxMeasure(c: NoBoxColors): NoBoxMeasure {
  const worst = mixHex(c.primary, c.background, NOBOX_TEXTURE_ALPHA);
  return {
    primaryOnBg: contrastRatio(c.primary, c.background),
    secondaryOnBg: contrastRatio(c.secondary, c.background),
    primaryOnInner: contrastRatio(c.primary, c.inner),
    secondaryOnInner: contrastRatio(c.secondary, c.inner),
    buttonTextOnButton: contrastRatio(c.buttonText, c.button),
    buttonTextOnPressed: contrastRatio(c.buttonText, c.buttonPressed),
    circleBorderOnBg: contrastRatio(c.circleBorder, c.background),
    iconOnBg: contrastRatio(c.icon, c.background),
    focusBorderOnInner: contrastRatio(c.focusBorder, c.inner),
    errorOnBg: contrastRatio(c.error, c.background),
    successOnBg: contrastRatio(c.success, c.background),
    textureSecondaryWorst: contrastRatio(c.secondary, worst),
    texturePrimaryWorst: contrastRatio(c.primary, worst),
  };
}
