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

const EPS = 0.01; // bar-vs-target sanity check
const EXACT_KG = 0.02; // |remainder| under this on the *total* counts as exact
const PURE_UNIT_TOL_KG = 0.25; // keep a single-unit combo unless mixing beats it by more than this
const MAX_NODES = 500_000; // DFS safety ceiling

type PlateType = { unit: Unit; weight: number; kg: number; pairs: number };

function buildTypes(plates: PlateSpec[]): PlateType[] {
  return plates
    .filter((p) => p.weight > 0 && p.pairs > 0)
    .map((p) => ({ unit: p.unit, weight: p.weight, kg: toKg(p.weight, p.unit), pairs: p.pairs }))
    .sort((a, b) => b.kg - a.kg);
}

/**
 * Best per-side plate multiset for `target` kg. Bounded DFS over plate *types*
 * with per-type counts (no arbitrary big/small split, so e.g. two 10 lb plates
 * are considered as a pair even though each is under 5 kg). Chooses by:
 *   1. smallest |sum - target|
 *   2. fewest plates
 *   3. chunkier load (more of the heavier types)
 */
function search(
  types: PlateType[],
  target: number,
): { plates: LoadedPlate[]; sum: number; err: number } {
  const t = Math.max(0, target);
  const n = types.length;

  const suffixMax = new Float64Array(n + 1);
  for (let i = n - 1; i >= 0; i--) {
    suffixMax[i] = suffixMax[i + 1] + types[i].kg * types[i].pairs;
  }

  const counts = new Int32Array(n);
  let best = { counts: counts.slice(), sum: 0, err: t, num: 0 };
  let nodes = 0;

  const isBetter = (sum: number, err: number, num: number): boolean => {
    if (err < best.err - 1e-9) return true;
    if (err > best.err + 1e-9) return false;
    if (num !== best.num) return num < best.num;
    for (let i = 0; i < n; i++) {
      if (counts[i] !== best.counts[i]) return counts[i] > best.counts[i];
    }
    return false;
  };

  const dfs = (i: number, sum: number, num: number): void => {
    if (++nodes > MAX_NODES) return;
    const err = Math.abs(sum - t);
    if (isBetter(sum, err, num)) {
      best = { counts: counts.slice(), sum, err, num };
    }
    if (err <= 1e-9 || i >= n) return;
    if (sum + suffixMax[i] < t - best.err - 1e-9) return; // can't get close enough
    if (sum - t > best.err + 1e-9) return; // already overshot, only grows

    const kg = types[i].kg;
    const cap = Math.min(types[i].pairs, Math.floor((t - sum) / kg) + 1);
    for (let c = Math.max(0, cap); c >= 0; c--) {
      counts[i] = c;
      dfs(i + 1, sum + c * kg, num + c);
    }
    counts[i] = 0;
  };

  dfs(0, 0, 0);

  const plates: LoadedPlate[] = [];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < best.counts[i]; k++) {
      plates.push({ unit: types[i].unit, weight: types[i].weight, kg: types[i].kg });
    }
  }
  return { plates, sum: best.sum, err: best.err };
}

export function computeBarLoad(
  targetTotal: number,
  targetUnit: Unit,
  barWeight: number,
  barUnit: Unit,
  plates: PlateSpec[],
  /** When set, prefer a combo built only from plates of this unit. */
  preferUnit?: Unit,
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
      error: 'El peso total es menor que la barra.',
    };
  }

  const perSideTarget = Math.max(0, (targetKg - barKg) / 2);
  const types = buildTypes(plates);

  let chosen = search(types, perSideTarget);

  if (preferUnit) {
    const pureTypes = types.filter((tp) => tp.unit === preferUnit);
    if (pureTypes.length) {
      const pure = search(pureTypes, perSideTarget);
      if (pure.err <= EXACT_KG || pure.err <= chosen.err + PURE_UNIT_TOL_KG) {
        chosen = pure;
      }
    }
  }

  const perSide = chosen.plates.slice().sort((a, b) => b.kg - a.kg);
  const loadedKg = barKg + 2 * chosen.sum;
  const remainderKg = targetKg - loadedKg;

  return {
    ok: true,
    perSide,
    loadedKg,
    remainderKg,
    exact: Math.abs(remainderKg) < EXACT_KG,
  };
}
