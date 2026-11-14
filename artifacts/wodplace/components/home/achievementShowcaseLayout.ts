/**
 * Geometría y tipografía PURAS del bloque derecho de la tarjeta de Medallas (laurel + medalla + nombre; AchievementShowcase.tsx). Todo escala con `scale` (1 = el laurel de 88 x 72 dp
 * con la medalla de 38 dp; la tarjeta usa 0,85 por defecto: laurel de 74,8 x 61,2 dp y medalla de 32,3 dp; con 0,9 la tarjeta medía 129 dp, más de los 128 dp permitidos). Sin números fijos dentro del bloque: solo proporciones.
 */
export const LAUREL_BOX = { w: 88, h: 72 } as const;
/** Centro de la medalla, a 31 dp desde arriba del laurel (con escala 1). */
export const MEDAL_CENTER_Y = 31;
export const MEDAL_BASE_SIZE = 38;
/** Separación entre el borde inferior del laurel y el nombre (dp, sin escalar: es espacio entre piezas). */
export const NAME_GAP = 4;
/** Nombre: Inter SemiBold 14 con interlineado 17; los de 20 o más letras bajan a 13 con interlineado 16. */
export const NAME_STYLE = { fontSize: 14, lineHeight: 17 } as const;
export const NAME_STYLE_LONG = { fontSize: 13, lineHeight: 16 } as const;
export const LONG_NAME_LETTERS = 20;
export const NAME_LINES = 2;

export const SCALES = [1, 0.9, 0.85] as const;
export const DEFAULT_SCALE = 0.85;

export function showcaseGeometry(scale: number) {
  const boxW = LAUREL_BOX.w * scale;
  const boxH = LAUREL_BOX.h * scale;
  const medal = MEDAL_BASE_SIZE * scale;
  return { boxW, boxH, medal, medalLeft: (boxW - medal) / 2, medalTop: MEDAL_CENTER_Y * scale - medal / 2 };
}

/** Estilo del nombre según el largo (sin adjustsFontSizeToFit); `fs` es la letra (simulada o del sistema, con tope). */
export function nameStyleFor(name: string, fs = 1): { fontSize: number; lineHeight: number } {
  const base = name.trim().length >= LONG_NAME_LETTERS ? NAME_STYLE_LONG : NAME_STYLE;
  return { fontSize: base.fontSize * fs, lineHeight: Math.round(base.lineHeight * fs) };
}

/** Alto fijo de la casilla del nombre: dos líneas del tramo mayor, igual en todos los estados. */
export function nameSlotHeight(fs = 1): number {
  return Math.round(NAME_STYLE.lineHeight * fs) * NAME_LINES;
}

/** Alto total del bloque (laurel + separación + casilla del nombre). */
export function showcaseHeight(scale: number, fs = 1): number {
  return showcaseGeometry(scale).boxH + NAME_GAP + nameSlotHeight(fs);
}
