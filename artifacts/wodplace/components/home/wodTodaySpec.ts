/**
 * Medidas, textos y frases de lector de pantalla de la tarjeta nueva "WOD de hoy" (pedido 44; WodTodayCardNew.tsx). Datos puros (sin React Native) para que las pruebas las lean. Solo se ve en
 * "Estados de Inicio (dev)" → "Ver avisos", junto al diseño actual; NO está conectada a Inicio. Los textos son los de siempre ("WOD de hoy", "registrado", nombre y descripción del WOD).
 */
export const WOD_RADIUS = 16;
export const WOD_PADDING = 20;
export const WOD_LABEL_TEXT = 'WOD DE HOY';
export const WOD_LABEL_SIZE = 12;
export const WOD_LABEL_SPACING = 1;
export const WOD_CHIP_TEXT = 'Registrado';
export const WOD_CHIP_SIZE = 11;
export const WOD_CHIP_BORDER = 1;
export const WOD_CHIP_CHECK_SIZE = 12;
export const WOD_NAME_SIZE = 28;
export const WOD_NAME_LINE = 32;
export const WOD_NAME_MAX_LINES = 2;
export const WOD_DESCRIPTION_SIZE = 14;
export const WOD_DESCRIPTION_LINE = 20;
export const WOD_DESCRIPTION_MAX_LINES = 3;
export const WOD_A11Y_HINT = 'Abre el WOD';

/** Etiqueta para el lector de pantalla: "WOD de hoy, [nombre][, registrado]". */
export function wodTodayA11yLabel(name: string, registered: boolean): string {
  return `WOD de hoy, ${name}${registered ? ', registrado' : ''}`;
}

/** La descripción solo se dibuja si trae texto (sin descripción no queda un hueco). */
export const hasWodDescription = (description: string | null | undefined): boolean => !!description && description.trim().length > 0;

/** Tokens de la paleta que usa la tarjeta (las pruebas miden los mismos pares). El cuerpo usa NOTICE_BODY_COLOR (#BDB6A8, pendiente de pasar a token en la ronda de color). */
export const WOD_TOKENS = {
  background: 'nextClassCard', // #18191A
  backgroundPressed: 'nextClassCardPressed', // #2E2F35, sólido
  name: 'nextClassCardForeground', // #F6F1E8
  copper: 'charcoalAccent', // #B98250: contorno de la etiqueta y borde de la flecha
  copperLight: 'charcoalAccentLight', // #C79A6B: rótulo y texto de la etiqueta
  arrowFill: 'glassBackground', // negro al 60 %, el mismo de las otras flechas
} as const;
