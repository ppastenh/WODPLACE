import { contrastRatio } from './colorMath';

/**
 * BORDE DE LOS AVISOS DE INICIO (decisión (ae) de DECISIONES-DISENO.md): cada tipo de aviso lleva un borde sólido de 1,5 dp de su propio color, para distinguirlos sin depender del texto. Datos y funciones puras (sin React
 * Native) para que las pruebas midan el contraste con los mismos valores que dibujan los componentes. Todos los colores son tokens de la paleta clara de Inicio (ninguno es nuevo; la arena es el token `accent`, #F0D9A8).
 */
export type AvisoKind = 'contrato' | 'fijo' | 'plan' | 'sinbox' | 'cumple';

export const AVISO_BORDER_WIDTH = 1.5;

/** Token de la paleta de cada tipo. Cumpleaños en arena: el cobre oscuro no se veía contra la tarjeta del propio cumpleaños (que es de ese mismo color: 1,00:1). */
export const AVISO_KIND_TOKEN: Record<AvisoKind, string> = {
  contrato: 'charcoalAccent', // cobre #B98250
  fijo: 'nextClassCardForeground', // crema #F6F1E8
  plan: 'charcoalAccentLight', // cobre claro #C79A6B
  sinbox: 'charcoalMuted', // gris cálido #A29E94
  cumple: 'accent', // arena #F0D9A8
};
export const AVISO_KIND_LABEL: Record<AvisoKind, string> = { contrato: 'Contrato pendiente', fijo: 'Aviso fijo del box', plan: 'Aviso del plan', sinbox: 'Sin box', cumple: 'Cumpleaños' };

/** Color del borde de un tipo de aviso, tomado de la paleta. */
export const avisoBorderColor = (kind: AvisoKind, palette: Record<string, string>): string => palette[AVISO_KIND_TOKEN[kind]]!;

/** Fondos contra los que se mide el borde de cada tipo (tokens de la paleta): la tarjeta del aviso. Cumpleaños tiene dos: la tarjeta del propio (cobre oscuro) y la lista de próximos (grafito). */
export const AVISO_KIND_SURFACES: Record<AvisoKind, string[]> = {
  contrato: ['nextClassCard'],
  fijo: ['nextClassCard'],
  plan: ['nextClassCard'],
  sinbox: ['nextClassCard'],
  cumple: ['nextClassCard', 'navActiveTextSmall'],
};

/** Contraste (mínimo 3:1) del borde de cada tipo contra el peor de sus fondos. */
export function avisoBorderContrasts(palette: Record<string, string>): { kind: AvisoKind; color: string; worst: number; ok: boolean }[] {
  return (Object.keys(AVISO_KIND_TOKEN) as AvisoKind[]).map((kind) => {
    const color = avisoBorderColor(kind, palette);
    const worst = Math.min(...AVISO_KIND_SURFACES[kind].map((t) => contrastRatio(color, palette[t]!)));
    return { kind, color, worst, ok: worst >= 3 };
  });
}
