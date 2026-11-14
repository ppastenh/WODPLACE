import { contrastRatio, mixHex } from './colorMath';

/**
 * Cobre de la letra de la frase del día (decisión (s), ajuste del 2026-11-15). Lógica pura: sin React Native.
 * La frase y sus dos comillas van en cobre sobre la foto con el velo; las palabras resaltadas, en crema. El FONDO (foto y velo del 62 %) no cambia.
 * El cobre por defecto es charcoalAccent #B98250: no llega a 4,5:1 sobre el punto más claro de la foto (excepción consciente, medida en las pruebas).
 */
export type QuoteCopperChoice = 'medio' | 'claro' | 'brillante';

export type QuoteCopperPalette = { charcoalAccent: string; charcoalAccentLight: string; medalCopperLight: string; charcoal: string };

/** Los tres cobres de comparación en desarrollo; 'medio' es el valor por defecto. */
export const QUOTE_COPPER_DEFAULT: QuoteCopperChoice = 'medio';
export const quoteCopperHex = (p: QuoteCopperPalette, choice: QuoteCopperChoice): string =>
  choice === 'medio' ? p.charcoalAccent : choice === 'claro' ? p.charcoalAccentLight : p.medalCopperLight;

/** Grises de la foto que se miden: el punto más claro (peor caso), uno medio y el más oscuro. */
export const PHOTO_GRAYS = { claro: '#FFFFFF', medio: '#808080', oscuro: '#000000' } as const;
export type PhotoGray = keyof typeof PHOTO_GRAYS;

/** Fondo bajo la letra: el velo (color p.charcoal) con esa opacidad sobre el gris de la foto. */
export function quoteBackground(veilColor: string, veil: number, gray: string): string {
  return mixHex(veilColor, gray, veil);
}

export function quoteContrast(textHex: string, veilColor: string, veil: number, gray: string): number {
  return contrastRatio(textHex, quoteBackground(veilColor, veil, gray));
}

/**
 * Velo mínimo (0 a 1, en pasos de 0,01) desde el cual la letra llega a `target` sobre ese gris CON ESE velo y con cualquiera MAYOR. No se busca por bisección: el contraste no es monótono
 * (con velo 0 un cobre medio sobre blanco da 3,46:1, baja al mezclarse con el velo y recién sube después). null si ni con el velo al 100 % llega.
 */
export function minVeilFor(textHex: string, veilColor: string, gray: string, target: number): number | null {
  let lowest: number | null = null;
  for (let step = 100; step >= 0; step--) {
    if (quoteContrast(textHex, veilColor, step / 100, gray) < target) break;
    lowest = step / 100;
  }
  return lowest;
}
