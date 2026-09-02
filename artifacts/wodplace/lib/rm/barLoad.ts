import { toKg, type Unit } from './units';

export type PlateSpec = { unit: Unit; weight: number; pairs: number };

/** One plate that goes on one side of the bar, in its native unit + kg-equiv. */
export type LoadedPlate = { unit: Unit; weight: number; kg: number };

export const plateKey = (unit: Unit, weight: number): string => `${unit}:${weight}`;

/** How many pairs of each plate the box has. */
export function availablePairs(plates: PlateSpec[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of plates) if (p.pairs > 0) m.set(plateKey(p.unit, p.weight), p.pairs);
  return m;
}

/** How many pairs are already on the bar (one perSide entry === one pair). */
export function usedPairs(perSide: LoadedPlate[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of perSide) {
    const k = plateKey(p.unit, p.weight);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function canAdd(
  perSide: LoadedPlate[],
  plates: PlateSpec[],
  unit: Unit,
  weight: number,
): boolean {
  const avail = availablePairs(plates).get(plateKey(unit, weight)) ?? 0;
  const used = usedPairs(perSide).get(plateKey(unit, weight)) ?? 0;
  return used < avail;
}

/** Add one plate (kept sorted heaviest-first). */
export function addPlate(
  perSide: LoadedPlate[],
  unit: Unit,
  weight: number,
): LoadedPlate[] {
  return [...perSide, { unit, weight, kg: toKg(weight, unit) }].sort(
    (a, b) => b.kg - a.kg,
  );
}

/** Remove one plate matching unit+weight (the outermost of that type). */
export function removePlate(
  perSide: LoadedPlate[],
  unit: Unit,
  weight: number,
): LoadedPlate[] {
  const idx = perSide.findIndex((p) => p.unit === unit && p.weight === weight);
  if (idx === -1) return perSide;
  return perSide.filter((_, i) => i !== idx);
}

export const barTotalKg = (perSide: LoadedPlate[], barKg: number): number =>
  barKg + 2 * perSide.reduce((acc, p) => acc + p.kg, 0);

export type BarLoadResult = {
  ok: boolean;
  /** Plates for ONE side, heaviest first (bar-side to collar). */
  perSide: LoadedPlate[];
  /** bar + both sides, kg. */
  loadedKg: number;
  /** targetKg - loadedKg (positive = still short, negative = overshoot). */
  remainderKg: number;
  exact: boolean;
  /** Set when the bar alone already exceeds the target. */
  error?: string;
};

const EPS = 0.01;
const SMALL_KG = 5 + EPS; // plates at or below this feed the exact-match search
const MAX_SMALL_SLOTS = 16; // brute-force cap (2^16)

/** Expand plate specs into individual per-side slots (one per available pair). */
function slots(plates: PlateSpec[]): LoadedPlate[] {
  const out: LoadedPlate[] = [];
  for (const p of plates) {
    if (p.weight <= 0 || p.pairs <= 0) continue;
    const kg = toKg(p.weight, p.unit);
    for (let i = 0; i < p.pairs; i++) out.push({ unit: p.unit, weight: p.weight, kg });
  }
  return out.sort((a, b) => b.kg - a.kg);
}

export function computeBarLoad(
  targetTotal: number,
  targetUnit: Unit,
  barWeight: number,
  barUnit: Unit,
  plates: PlateSpec[],
): BarLoadResult {
  const targetKg = toKg(targetTotal, targetUnit);
  const barKg = toKg(barWeight, barUnit);

  if (targetKg < barKg - EPS) {
    return {
      ok: false,
      perSide: [],
      loadedKg: barKg,
      remainderKg: targetKg - barKg,
      exact: false,
      error: 'El objetivo es menor que el peso de la barra.',
    };
  }

  const perSideTarget = (targetKg - barKg) / 2;
  const all = slots(plates);
  const big = all.filter((s) => s.kg > SMALL_KG);
  const small = all.filter((s) => s.kg <= SMALL_KG);

  // Greedy on the big plates.
  const chosenBig: LoadedPlate[] = [];
  let bigSum = 0;
  for (const s of big) {
    if (bigSum + s.kg <= perSideTarget + EPS) {
      chosenBig.push(s);
      bigSum += s.kg;
    }
  }

  // Brute-force the small plates for the combo closest to what's left.
  const remaining = perSideTarget - bigSum;
  const pool = small.slice(0, MAX_SMALL_SLOTS);
  let bestSubset: LoadedPlate[] = [];
  let bestDiff = Math.abs(remaining); // taking none
  for (let mask = 1; mask < 1 << pool.length; mask++) {
    let sum = 0;
    const pick: LoadedPlate[] = [];
    for (let i = 0; i < pool.length; i++) {
      if (mask & (1 << i)) {
        sum += pool[i].kg;
        pick.push(pool[i]);
      }
    }
    const diff = Math.abs(remaining - sum);
    if (
      diff < bestDiff - 1e-9 ||
      (Math.abs(diff - bestDiff) < 1e-9 && pick.length < bestSubset.length)
    ) {
      bestDiff = diff;
      bestSubset = pick;
    }
  }

  const perSide = [...chosenBig, ...bestSubset].sort((a, b) => b.kg - a.kg);
  const sideSum = perSide.reduce((acc, p) => acc + p.kg, 0);
  const loadedKg = barKg + 2 * sideSum;
  const remainderKg = targetKg - loadedKg;

  return {
    ok: true,
    perSide,
    loadedKg,
    remainderKg,
    exact: Math.abs(remainderKg) < EPS,
  };
}
