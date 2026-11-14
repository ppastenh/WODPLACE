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
