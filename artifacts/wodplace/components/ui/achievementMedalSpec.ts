/**
 * Especificación PURA de la medalla de logro (AchievementMedal.tsx): círculo de diámetro `size` (38 por defecto) con degradado radial de #7A4E2A (cx 40 %, cy 35 %) a #4A2E17,
 * aro de 1,5 dp (con 38) en #E2B887 al 75 % e ícono centrado de tamaño = size x 0,5 en #F6F1E8. Todo escala con `size`. Los contrastes se miden en las pruebas con estos valores.
 */
export const MEDAL_DEFAULT_SIZE = 38;
export const MEDAL_FROM = '#7A4E2A';
export const MEDAL_TO = '#4A2E17';
export const MEDAL_RING = '#E2B887';
export const MEDAL_RING_OPACITY = 0.75;
export const MEDAL_ICON = '#F6F1E8';
/** Grosor del aro como proporción del diámetro (1,5 dp con 38). */
export const MEDAL_RING_RATIO = 1.5 / MEDAL_DEFAULT_SIZE;
export const MEDAL_ICON_RATIO = 0.5;

export const medalRing = (size: number) => size * MEDAL_RING_RATIO;
export const medalIconSize = (size: number) => size * MEDAL_ICON_RATIO;
