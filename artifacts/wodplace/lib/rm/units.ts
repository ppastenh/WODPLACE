export type Unit = 'kg' | 'lb';

export const LB_PER_KG = 2.2046226218;
export const KG_PER_LB = 0.45359237;

export const toKg = (weight: number, unit: Unit): number =>
  unit === 'lb' ? weight * KG_PER_LB : weight;

export const fromKg = (kg: number, unit: Unit): number =>
  unit === 'lb' ? kg * LB_PER_KG : kg;

export const convert = (weight: number, from: Unit, to: Unit): number =>
  from === to ? weight : fromKg(toKg(weight, from), to);

/** Trim trailing zeros: 92.50 -> "92.5", 100.0 -> "100". */
export function trimNum(n: number, maxDecimals = 2): string {
  const rounded = Number(n.toFixed(maxDecimals));
  return String(rounded);
}

/** e.g. formatWeight(92.5, 'kg') -> "92.5 kg" */
export function formatWeight(weight: number, unit: Unit, maxDecimals = 2): string {
  return `${trimNum(weight, maxDecimals)} ${unit}`;
}

/** A weight stored as {value, unit}, shown in the viewer's preferred unit. */
export function displayWeight(
  value: number,
  storedUnit: Unit,
  preferred: Unit,
  maxDecimals = 1,
): string {
  return formatWeight(convert(value, storedUnit, preferred), preferred, maxDecimals);
}
