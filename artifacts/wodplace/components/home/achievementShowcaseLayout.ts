/**
 * Geometría y tipografía PURAS del bloque derecho de la tarjeta de Medallas (laurel + medalla + nombre; AchievementShowcase.tsx). Todo escala con `scale` (1 = el laurel de 88 x 72 dp
 * con la medalla de 38 dp; la tarjeta usa 1: laurel de 88 x 72 dp y medalla de 38 dp). Sin números fijos dentro del bloque: solo proporciones.
 */
export const LAUREL_BOX = { w: 88, h: 72 } as const;
/** Centro de la medalla, a 31 dp desde arriba del laurel (con escala 1). */
export const MEDAL_CENTER_Y = 31;
export const MEDAL_BASE_SIZE = 38;
/** Separación entre el borde inferior del laurel y el nombre (dp, sin escalar: es espacio entre piezas). */
export const NAME_GAP = 2;
/**
 * Nombre: Inter SemiBold 14 (13 con 20 o más letras). El interlineado NO puede ser menor que el alto de línea real de la fuente en Android: Inter mide 1,21 em según hhea, pero 1,43 em según las
 * métricas de Windows/Android (usWinAscent + usWinDescent = 2269 + 660 sobre 2048): 20,0 dp con 14 sp y 18,6 dp con 13 sp. Con interlineado 17 (y 16) la parte baja de la última línea (g, p, y)
 * quedaba fuera de la caja del texto y Android la recorta; por eso 14/20 y 13/19.
 */
export const NAME_STYLE = { fontSize: 14, lineHeight: 20 } as const;
export const NAME_STYLE_LONG = { fontSize: 13, lineHeight: 19 } as const;
export const LONG_NAME_LETTERS = 20;
export const NAME_LINES = 2;
/** Tope de la letra del nombre (dp de la letra del sistema o simulada): con 1,3 un nombre de 21 letras (p. ej. "Mejor progreso grupal") pasaba a TRES líneas en la mitad derecha y se cortaba abajo; con 1,15 sigue en dos. */
export const NAME_MAX_SCALE = 1.15;

export const DEFAULT_SCALE = 1;
/** Interlineado del nombre (del tramo de 14 sp; el de 13 sp usa uno menos). 20 es el de Inicio; 19 y 18 son solo para comparar en desarrollo. */
export const NAME_LEADINGS = [20, 19, 18] as const;
export const DEFAULT_LEADING = NAME_STYLE.lineHeight;

export function showcaseGeometry(scale: number) {
  const boxW = LAUREL_BOX.w * scale;
  const boxH = LAUREL_BOX.h * scale;
  const medal = MEDAL_BASE_SIZE * scale;
  return { boxW, boxH, medal, medalLeft: (boxW - medal) / 2, medalTop: MEDAL_CENTER_Y * scale - medal / 2 };
}

/** Estilo del nombre según el largo (sin adjustsFontSizeToFit); `fs` es la letra (simulada o del sistema, con tope). */
export function nameStyleFor(name: string, fs = 1, leading: number = DEFAULT_LEADING): { fontSize: number; lineHeight: number } {
  const long = name.trim().length >= LONG_NAME_LETTERS;
  fs = Math.min(fs, NAME_MAX_SCALE);
  const base = long ? NAME_STYLE_LONG : NAME_STYLE;
  const lineHeight = long ? leading - (NAME_STYLE.lineHeight - NAME_STYLE_LONG.lineHeight) : leading;
  return { fontSize: base.fontSize * fs, lineHeight: Math.round(lineHeight * fs) };
}

/** Alto fijo de la casilla del nombre: dos líneas del tramo mayor, igual en todos los estados. */
export function nameSlotHeight(fs = 1, leading: number = DEFAULT_LEADING): number {
  return Math.round(leading * Math.min(fs, NAME_MAX_SCALE)) * NAME_LINES;
}

/** Alto total del bloque (laurel + separación + casilla del nombre). */
export function showcaseHeight(scale: number, fs = 1, leading: number = DEFAULT_LEADING): number {
  return showcaseGeometry(scale).boxH + NAME_GAP + nameSlotHeight(fs, leading);
}
