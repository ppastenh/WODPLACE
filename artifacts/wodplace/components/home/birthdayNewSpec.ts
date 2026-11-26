import { MONTH_NAMES } from '../../lib/dateUtils';

/**
 * Medidas y funciones puras de los cumpleaños NUEVOS (pedido 45; BirthdayCardsNew.tsx). Sin React Native, para que las pruebas las lean. Solo se ven en "Estados de Inicio (dev)" → "Ver avisos", junto al diseño actual;
 * NO están conectados a Inicio. Mismos textos, mismas condiciones y los mismos datos de siempre (nombre y día/mes; NUNCA edad ni año).
 */
export const OWN_RADIUS = 16;
export const OWN_PADDING = 16;
export const OWN_ICON_CIRCLE = 40;
export const OWN_ICON_CIRCLE_BORDER = 1.5;
export const OWN_ICON_SIZE = 20;
export const OWN_TITLE_SIZE = 13;
export const OWN_TITLE_MAX_LINES = 2;
export const OWN_SUBTITLE_SIZE = 11;
/** Interlineado de la tarjeta del cumpleaños propio con la letra reducida (decisión (ae)): 18 y 16. */
export const OWN_TITLE_LINE = 18;
export const OWN_SUBTITLE_LINE = 16;
/** Título de la sección "Próximos cumpleaños": 16 sp (antes 18). */
export const SECTION_TITLE_SIZE = 16;

export const LIST_RADIUS = 16;
export const LIST_PADDING_H = 16;
export const ROW_MIN_HEIGHT = 56;
export const AVATAR_SIZE = 36;
export const AVATAR_TEXT_SIZE = 11;
export const NAME_SIZE = 13;
export const DATE_SIZE = 11;
export const DATE_SPACING = 1;
export const TODAY_ICON_SIZE = 14;
export const TODAY_BORDER = 1;
export const SEPARATOR_WIDTH = 1;

/** Tokens de la paleta que usa el diseño nuevo (las pruebas miden los mismos pares). La fecha usa NOTICE_BODY_COLOR (#BDB6A8, pendiente de token en la ronda de color). */
export const BIRTHDAY_TOKENS = {
  ownBackground: 'navActiveTextSmall', // #8B5E34
  ownText: 'nextClassCardForeground', // #F6F1E8
  listBackground: 'nextClassCard', // #18191A
  separator: 'nextClassCardPressed', // #2E2F35
  avatarBackground: 'charcoalAccent', // #B98250
  avatarText: 'nextClassCard', // #18191A
  name: 'nextClassCardForeground', // #F6F1E8
  today: 'charcoalAccentLight', // #C79A6B: "Hoy" y su ícono
  todayBorder: 'charcoalAccent', // #B98250
} as const;

/** Primer nombre (la misma regla de siempre: primera palabra; "Atleta" si no hay). */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Atleta';
}

/** Iniciales de siempre: primera letra del primer nombre y del último apellido, en mayúsculas ("?" si no hay). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** Día corto de siempre: "12 NOV". */
export function dayLabelOf(month: number, day: number): string {
  const abbrev = (MONTH_NAMES[month - 1] ?? '').slice(0, 3).toUpperCase();
  return `${day} ${abbrev}`;
}

/** Frase del lector de pantalla de cada fila: "[Nombre], cumpleaños [hoy / 12 de noviembre]". */
export function birthdayRowA11yLabel(b: { name: string; month: number; day: number; daysUntil: number }): string {
  const when = b.daysUntil === 0 ? 'hoy' : `${b.day} de ${(MONTH_NAMES[b.month - 1] ?? '').toLowerCase()}`;
  return `${b.name}, cumpleaños ${when}`;
}
