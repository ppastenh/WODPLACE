/**
 * Datos del laurel de la tarjeta de Medallas: dibujo propio de la dueña, vectorizado a datos (viewBox 88 x 72, obra propia). El tallo (arco con trazo), la forma de la hoja en sus dos mitades
 * (clara #F3D3AA y oscura #C08A57) y la lista de hojas de la rama IZQUIERDA con su translate(x y) rotate(rot) scale(scale), en el mismo orden. La rama derecha es la misma lista con
 * translate(88 0) scale(-1 1); la opacidad del grupo es 0,5. Estos datos NO dependen de ningún archivo externo (los SVG y PNG de origen no se versionan).
 */
export const LAUREL_VIEWBOX = { w: 88, h: 72 } as const;
export const LAUREL_GROUP_OPACITY = 0.5;
/** Transformación de la rama derecha: el espejo de la izquierda. */
export const LAUREL_MIRROR = 'translate(88 0) scale(-1 1)';

export type LaurelLeaf = { x: number; y: number; rot: number; scale: number };
export type LaurelShape = {
  stem: { d: string; stroke: string; strokeWidth: number; linecap: 'round' };
  leafLight: { d: string; fill: string };
  leafDark: { d: string; fill: string };
  leaves: LaurelLeaf[];
};

export const LAUREL_DATA: LaurelShape = {
  stem: { d: 'M35.7 61.8 A30 30 0 0 1 29.0 7.0', stroke: '#E2B887', strokeWidth: 1.1, linecap: 'round' },
  leafLight: { d: 'M0 0 C 4.2 -2.5 4.6 -8.5 0 -14.5 Z', fill: '#F3D3AA' },
  leafDark: { d: 'M0 0 L0 -14.5 C -4.6 -8.5 -4.2 -2.5 0 0 Z', fill: '#C08A57' },
  leaves: [
    { x: 30.4, y: 59.8, rot: 264.9, scale: 0.9 },
    { x: 30.4, y: 59.8, rot: 328.9, scale: 0.9 },
    { x: 22.8, y: 54.2, rot: 283, scale: 0.84 },
    { x: 22.8, y: 54.2, rot: 347, scale: 0.84 },
    { x: 17.3, y: 46.6, rot: 301.1, scale: 0.78 },
    { x: 17.3, y: 46.6, rot: 365.1, scale: 0.78 },
    { x: 14.4, y: 37.6, rot: 319.2, scale: 0.72 },
    { x: 14.4, y: 37.6, rot: 383.2, scale: 0.72 },
    { x: 14.4, y: 28.2, rot: 337.3, scale: 0.66 },
    { x: 14.4, y: 28.2, rot: 401.3, scale: 0.66 },
    { x: 17.4, y: 19.2, rot: 355.4, scale: 0.6 },
    { x: 17.4, y: 19.2, rot: 419.4, scale: 0.6 },
    { x: 23, y: 11.6, rot: 373.5, scale: 0.54 },
    { x: 23, y: 11.6, rot: 437.5, scale: 0.54 },
    { x: 29.5, y: 6.8, rot: 420, scale: 0.6 },
  ],
};
