/**
 * Medidas y colores de NoticeBanner (pedido 43): UNA pieza para los banners de aviso de Inicio (contrato pendiente, aviso fijo del box y aviso del plan). Datos puros (sin React Native) para que las pruebas
 * midan el contraste con los mismos valores que dibuja el componente. Todos los colores son tokens de la paleta clara de Inicio, salvo el del cuerpo (NOTICE_BODY_COLOR), que es el único color nuevo.
 */
export const NOTICE_RADIUS = 16; // RADIUS.lg
export const NOTICE_PADDING = 16; // SPACING.xl
export const NOTICE_BORDER_WIDTH = 1;
/** Opacidad del borde de cobre #B98250: 40 % (66 en hexadecimal). El borde es un adorno; no es un estado presionado. */
export const NOTICE_BORDER_ALPHA_HEX = '66';
export const NOTICE_STRIPE_WIDTH = 3;
export const NOTICE_ICON_CIRCLE = 32;
export const NOTICE_ICON_CIRCLE_BORDER = 1.5;
export const NOTICE_ICON_SIZE = 18;
export const NOTICE_CHEVRON_SIZE = 20;
export const NOTICE_TITLE_SIZE = 15;
export const NOTICE_BODY_SIZE = 14;
export const NOTICE_LABEL_SIZE = 11;
export const NOTICE_LABEL_SPACING = 1;
export const NOTICE_LABEL_TEXT = 'IMPORTANTE';
export const NOTICE_IMAGE_RADIUS = 10; // RADIUS.md
/** Texto del cuerpo (gris cálido claro). No existe como token: se pidió exactamente este valor. */
export const NOTICE_BODY_COLOR = '#BDB6A8';
/** Ancho de la imagen del aviso: toda la pantalla menos el relleno de la superficie de Inicio (20 + 20), el borde (1 + 1) y el relleno de la tarjeta (16 + 16). */
export const noticeImageWidth = (screenWidth: number): number => screenWidth - 40 - 2 * NOTICE_BORDER_WIDTH - 2 * NOTICE_PADDING;

/** Nombre de los tokens de la paleta que usa la pieza (para que la prueba mida los mismos pares). */
export const NOTICE_TOKENS = {
  background: 'nextClassCard', // #18191A
  backgroundPressed: 'nextClassCardPressed', // #2E2F35, sólido
  title: 'nextClassCardForeground', // #F6F1E8
  copper: 'charcoalAccent', // #B98250: borde, contorno del círculo y franja
  copperLight: 'charcoalAccentLight', // #C79A6B: ícono, chevron y rótulo
} as const;

export type NoticeLevel = 'importante' | 'info';
