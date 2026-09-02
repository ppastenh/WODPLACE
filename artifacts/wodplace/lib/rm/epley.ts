/**
 * Estimated 1RM — Epley formula: 1RM = w · (1 + reps/30).
 * reps = 1 returns w unchanged.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  const r = Math.max(1, Math.round(reps));
  return weight * (1 + r / 30);
}

/** Inverse: weight you could lift for `reps` given an estimated 1RM. */
export function weightForReps(oneRm: number, reps: number): number {
  const r = Math.max(1, Math.round(reps));
  return oneRm / (1 + r / 30);
}

/** Rep -> estimated weight table off a known 1RM, reps 1..max. */
export function repTable(oneRm: number, max = 10): Array<{ reps: number; weight: number }> {
  return Array.from({ length: max }, (_, i) => ({
    reps: i + 1,
    weight: weightForReps(oneRm, i + 1),
  }));
}
