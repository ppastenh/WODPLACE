import { contrastRatio } from './colorMath';

/**
 * AJUSTE DE LOS AVISOS (pedido 51, SOLO desarrollo): permite ver todos los avisos de Inicio con la letra 1 o 2 puntos más chica y con distintos bordes, para decidir si achicar las letras y si diferenciarlos por borde.
 * Datos y funciones puras (sin React Native). Con el ajuste por defecto (letra 0, borde "actual") NADA cambia: las funciones devuelven exactamente los valores de siempre, y una prueba lo exige.
 */
export type AvisoSizeStep = 0 | -1 | -2;
/** actual = como Inicio real; tipo = borde de 1,5 dp del color de cada tipo; tipoAlt = igual pero con la alternativa para cumpleaños; franja = franja izquierda de 4 dp; sin = sin borde. */
export type AvisoBorderMode = 'actual' | 'tipo' | 'tipoAlt' | 'franja' | 'sin';
export type AvisoKind = 'contrato' | 'fijo' | 'plan' | 'sinbox' | 'cumple';

/** Mínimo del texto chico al achicar: un texto que ya mide 11 sp o menos no se toca. */
export const AVISO_MIN_SIZE = 11;
export const AVISO_BORDER_WIDTH = 1.5;
export const AVISO_STRIPE_WIDTH = 4;

/** Tamaño de letra con el ajuste: 0 = el de siempre; −1 / −2 restan puntos pero nunca bajan de 11 sp (ni suben un texto que ya era más chico). */
export function avisoSize(base: number, step: AvisoSizeStep): number {
  if (step === 0 || base <= AVISO_MIN_SIZE) return base;
  return Math.max(AVISO_MIN_SIZE, base + step);
}
/** Interlineado: conserva la diferencia original con el tamaño (si la letra baja 1, el interlineado baja 1). */
export function avisoLine(baseLine: number, baseSize: number, step: AvisoSizeStep): number {
  return baseLine + avisoSize(baseSize, step) - baseSize;
}

/** Token de la paleta de cada tipo, para el modo "por tipo" y "franja por tipo". Cumpleaños pedido: cobre oscuro; su alternativa (tipoAlt): arena #F0D9A8 (token accent). */
export const AVISO_KIND_TOKEN: Record<AvisoKind, string> = {
  contrato: 'charcoalAccent', // #B98250
  fijo: 'nextClassCardForeground', // #F6F1E8
  plan: 'charcoalAccentLight', // #C79A6B
  sinbox: 'charcoalMuted', // #A29E94
  cumple: 'navActiveTextSmall', // #8B5E34
};
export const AVISO_KIND_TOKEN_ALT: Record<AvisoKind, string> = { ...AVISO_KIND_TOKEN, cumple: 'accent' };
export const AVISO_KIND_LABEL: Record<AvisoKind, string> = { contrato: 'Contrato pendiente', fijo: 'Aviso fijo del box', plan: 'Aviso del plan', sinbox: 'Sin box', cumple: 'Cumpleaños' };

export const avisoKindColor = (mode: AvisoBorderMode, kind: AvisoKind, palette: Record<string, string>): string =>
  palette[(mode === 'tipoAlt' ? AVISO_KIND_TOKEN_ALT : AVISO_KIND_TOKEN)[kind]]!;

/** Lo que cambia en una tarjeta según el modo. Vacío en "actual" (la tarjeta se dibuja como siempre). */
export type AvisoBorderPlan = { borderWidth?: number; borderColor?: string; stripeColor?: string; stripeWidth?: number };
export function avisoBorderPlan(mode: AvisoBorderMode, kind: AvisoKind, palette: Record<string, string>): AvisoBorderPlan {
  if (mode === 'actual') return {};
  if (mode === 'sin') return { borderWidth: 0 };
  const color = avisoKindColor(mode, kind, palette);
  if (mode === 'franja') return { borderWidth: 0, stripeColor: color, stripeWidth: AVISO_STRIPE_WIDTH };
  return { borderWidth: AVISO_BORDER_WIDTH, borderColor: color };
}

/** Fondos contra los que se mide el borde o la franja de cada tipo (tokens de la paleta): la tarjeta del aviso. Cumpleaños tiene dos: la tarjeta del propio (cobre oscuro) y la lista de próximos (grafito). */
export const AVISO_KIND_SURFACES: Record<AvisoKind, string[]> = {
  contrato: ['nextClassCard'],
  fijo: ['nextClassCard'],
  plan: ['nextClassCard'],
  sinbox: ['nextClassCard'],
  cumple: ['nextClassCard', 'navActiveTextSmall'],
};

/** Contraste (≥ 3:1 pedido) del color de borde o franja de cada tipo contra el peor de sus fondos. */
export function avisoBorderContrasts(mode: AvisoBorderMode, palette: Record<string, string>): { kind: AvisoKind; color: string; worst: number; ok: boolean }[] {
  return (Object.keys(AVISO_KIND_TOKEN) as AvisoKind[]).map((kind) => {
    const color = avisoKindColor(mode, kind, palette);
    const worst = Math.min(...AVISO_KIND_SURFACES[kind].map((t) => contrastRatio(color, palette[t]!)));
    return { kind, color, worst, ok: worst >= 3 };
  });
}
