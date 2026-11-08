export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Lectura de los eventos de layout. React Native REUTILIZA el evento sintético y lo anula cuando termina el manejador: leer `e.nativeEvent` más tarde (dentro
 * del callback de un setState con función, un setTimeout, una promesa, etc.) da "This synthetic event is reused..." y "Cannot read property 'layout' of null".
 * Por eso cada manejador llama a estas funciones AL COMIENZO, de forma sincrónica, copia los números y solo después usa setState. Con un evento nulo o
 * incompleto devuelven null y el manejador no hace nada (la tarjeta se dibuja igual).
 */
export type LayoutEventLike = { nativeEvent?: { layout?: { width?: number; height?: number } | null } | null } | null | undefined;
export type TextLayoutEventLike = {
  nativeEvent?: { lines?: { x: number; y: number; width: number; height: number; text: string }[] | null } | null;
} | null | undefined;
export function readLayout(e: LayoutEventLike): { width: number; height: number } | null {
  const layout = e?.nativeEvent?.layout;
  if (!layout) return null;
  const { width, height } = layout;
  return typeof width === 'number' && typeof height === 'number' ? { width, height } : null;
}
export function readLines(e: TextLayoutEventLike): (Rect & { text: string })[] | null {
  const raw = e?.nativeEvent?.lines;
  if (!raw) return null;
  return raw.map((l) => ({ x: l.x, y: l.y, w: l.width, h: l.height, text: l.text }));
}

