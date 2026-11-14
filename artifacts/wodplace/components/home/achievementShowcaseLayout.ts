/**
 * Geometría y tipografía PURAS del bloque derecho de la tarjeta de Medallas (laurel + medalla + nombre; AchievementShowcase.tsx). Todo escala con `scale` (1 = el laurel de 88 x 72 dp
 * con la medalla de 38 dp; la tarjeta usa 1). Sin números fijos dentro del bloque: solo proporciones.
 */
export const LAUREL_BOX = { w: 88, h: 72 } as const;
/** Centro de la medalla, a 31 dp desde arriba del laurel (con escala 1). */
export const MEDAL_CENTER_Y = 31;
export const MEDAL_BASE_SIZE = 38;
/** Separación entre el borde inferior del laurel y el nombre (dp, sin escalar: es espacio entre piezas). */
export const NAME_GAP = 2;
/**
 * Nombre: Inter SemiBold 14 con interlineado 18 (13 con 17 para 20 o más letras). Inter mide 1,43 em de alto de línea en Android (usWinAscent + usWinDescent = 2269 + 660 sobre 2048):
 * 20,0 dp con 14 sp y 18,6 dp con 13 sp, es decir 2,0 y 1,6 dp MÁS que el interlineado. Esa diferencia se la come la parte baja de la última línea (g, p, y), que quedaba fuera de la caja del
 * texto y Android la recortaba; por eso el texto lleva ESPACIO PROPIO bajo la última línea (NAME_BOTTOM_ROOM) como relleno del propio Text, sin overflow hidden en ningún contenedor.
 */
export const NAME_STYLE = { fontSize: 14, lineHeight: 18 } as const;
export const NAME_STYLE_LONG = { fontSize: 13, lineHeight: 17 } as const;
export const LONG_NAME_LETTERS = 20;
export const NAME_LINES = 2;
/** Relleno bajo la última línea del nombre (paddingBottom del Text): la caja del texto crece hacia abajo y Android dibuja ahí la parte baja de las letras (el recorte de TextView incluye su relleno inferior). */
export const NAME_BOTTOM_ROOM = 4;
/** Tope de la letra del nombre (dp de la letra del sistema o simulada): con 1,3 un nombre de 21 letras (p. ej. "Mejor progreso grupal") pasaba a TRES líneas en la mitad derecha y se cortaba abajo; con 1,15 sigue en dos. */
export const NAME_MAX_SCALE = 1.15;

export const DEFAULT_SCALE = 1;

/** Alto de línea de Inter en Android para un tamaño de letra (1,43 em: métricas de Windows/Android de la fuente). */
export const ANDROID_LINE_EM = (2269 + 660) / 2048;
export const androidLineHeight = (fontSize: number) => ANDROID_LINE_EM * fontSize;
/** Cuánto más alto que el interlineado es el alto de línea real de Android (lo que se sale por abajo en la última línea). */
export const lineDeficit = (fontSize: number, lineHeight: number) => Math.max(0, androidLineHeight(fontSize) - lineHeight);

export function showcaseGeometry(scale: number) {
  const boxW = LAUREL_BOX.w * scale;
  const boxH = LAUREL_BOX.h * scale;
  const medal = MEDAL_BASE_SIZE * scale;
  return { boxW, boxH, medal, medalLeft: (boxW - medal) / 2, medalTop: MEDAL_CENTER_Y * scale - medal / 2 };
}

/** Estilo del nombre según el largo (sin adjustsFontSizeToFit); `fs` es la letra (simulada o del sistema, con tope). */
export function nameStyleFor(name: string, fs = 1): { fontSize: number; lineHeight: number; paddingBottom: number } {
  const base = name.trim().length >= LONG_NAME_LETTERS ? NAME_STYLE_LONG : NAME_STYLE;
  const k = Math.min(fs, NAME_MAX_SCALE);
  return { fontSize: base.fontSize * k, lineHeight: Math.round(base.lineHeight * k), paddingBottom: NAME_BOTTOM_ROOM };
}

/** Alto fijo de la casilla del nombre: dos líneas del tramo mayor más el espacio bajo la última línea, igual en todos los estados. */
export function nameSlotHeight(fs = 1): number {
  return Math.round(NAME_STYLE.lineHeight * Math.min(fs, NAME_MAX_SCALE)) * NAME_LINES + NAME_BOTTOM_ROOM;
}

/** Alto total del bloque (laurel + separación + casilla del nombre). */
export function showcaseHeight(scale: number, fs = 1): number {
  return showcaseGeometry(scale).boxH + NAME_GAP + nameSlotHeight(fs);
}
