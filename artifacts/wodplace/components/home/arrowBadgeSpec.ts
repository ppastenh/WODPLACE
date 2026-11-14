/**
 * Medidas PURAS de la flecha en círculo (ArrowBadge.tsx), tomadas de la flecha de la tarjeta "Tu próxima clase": círculo de 32 dp, borde de 1,5 dp, ícono de 16 dp (la mitad del diámetro).
 * La versión pequeña de "Medallas" y "PR destacado" es el 70 % del modelo (22,4 dp), con el borde y el ícono en la misma proporción.
 */
export const ARROW_BADGE_SIZE = 32;
export const ARROW_BADGE_BORDER = 1.5;
export const ARROW_BADGE_ICON_RATIO = 0.5;
export const ARROW_BADGE_SMALL_RATIO = 0.7;
export const ARROW_BADGE_SMALL = ARROW_BADGE_SIZE * ARROW_BADGE_SMALL_RATIO;

export const arrowBadgeBorder = (size: number) => ARROW_BADGE_BORDER * (size / ARROW_BADGE_SIZE);
export const arrowBadgeIconSize = (size: number) => size * ARROW_BADGE_ICON_RATIO;
/** Opacidad del relleno translúcido de la flecha (glassBackground = negro al 60 %): la misma en las cuatro tarjetas. */
export const ARROW_BADGE_GLASS_ALPHA = 0.6;
/**
 * POSICIÓN de la flecha pequeña en "Tu nivel", "PR destacado" y "Medallas": la esquina superior derecha, con UN solo margen compartido para arriba y para la derecha (8 dp, el de "Tu nivel").
 * Antes: Tu nivel 8 dp arriba y 8 a la derecha; Medallas 10 y 8; PR dentro de la fila, en el extremo derecho y arriba del contenido (16 y 16). La flecha de "Tu próxima clase" NO usa esto: va centrada.
 */
export const ARROW_BADGE_CORNER_MARGIN = 8;
export const arrowBadgeCorner = { position: 'absolute', top: ARROW_BADGE_CORNER_MARGIN, right: ARROW_BADGE_CORNER_MARGIN } as const;
