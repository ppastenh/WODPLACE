import { contrastRatio, mixHex } from './colorMath';

/**
 * Medición del contraste de la letra de la frase del día sobre la foto con el velo (decisión (s)). Lógica pura, SOLO para las pruebas y las notas de diseño: la tarjeta no la importa.
 * La letra va en cobre #B98250 (charcoalAccent), una EXCEPCIÓN consciente al mínimo de 4,5:1 aceptada por Pía el 2026-11-14 (1,64:1 en el peor punto); las palabras resaltadas, en crema.
 */

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
