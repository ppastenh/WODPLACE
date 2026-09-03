import type { Unit } from './units';

/** Legible on the module's dark surfaces (#0E0F11 / #24262A). */
export const PLATE_COLORS = {
  white: '#EAEAEA',
  orange: '#E07B39',
  green: '#3E9B57',
  yellow: '#D9A63C',
  blue: '#3E7CB1',
  red: '#CF4034',
  purple: '#8E6FD4',
} as const;

type ColorName = keyof typeof PLATE_COLORS;

const DARK_TEXT = '#0E0F11';
const LIGHT_TEXT = '#F5F1E8';
/** Plate colors that need dark text for contrast. */
const DARK_TEXT_ON: ColorName[] = ['white', 'yellow'];

// weight (native unit) -> color name
const LB_MAP: Record<number, ColorName> = {
  10: 'white',
  15: 'orange',
  25: 'green',
  35: 'yellow',
  45: 'blue',
  55: 'red',
};
const KG_FRACTIONAL_MAP: Record<number, ColorName> = {
  0.5: 'white',
  1: 'green',
  1.25: 'purple',
  1.5: 'yellow',
  2: 'blue',
  2.5: 'red',
};
const KG_STANDARD_MAP: Record<number, ColorName> = {
  5: 'white',
  10: 'green',
  15: 'yellow',
  20: 'blue',
  25: 'red',
};

const FALLBACK: ColorName = 'green';

function colorNameFor(unit: Unit, weight: number): ColorName {
  if (unit === 'lb') return LB_MAP[weight] ?? FALLBACK;
  if (weight < 5) return KG_FRACTIONAL_MAP[weight] ?? FALLBACK;
  return KG_STANDARD_MAP[weight] ?? FALLBACK;
}

export function plateFill(unit: Unit, weight: number): string {
  return PLATE_COLORS[colorNameFor(unit, weight)];
}

export function plateStroke(unit: Unit, weight: number): string {
  // Give the white plate an edge so it doesn't blend into a light background.
  return colorNameFor(unit, weight) === 'white' ? '#8A8A8A' : 'rgba(0,0,0,0.35)';
}

export function plateTextColor(unit: Unit, weight: number): string {
  return DARK_TEXT_ON.includes(colorNameFor(unit, weight)) ? DARK_TEXT : LIGHT_TEXT;
}
