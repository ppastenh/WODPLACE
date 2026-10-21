/**
 * Shared spacing scale -- the values are the ones already in use across
 * Home's cards (app/home.tsx) and, as of the second visual round (Fase 2,
 * step 1, 2026-10-21), ClassCard/BottomNavBar/AppHeader too -- picked as
 * the canonical set because that's what's actually in use in the first
 * screens migrated, not invented numbers.
 *
 * Naming convention when a real, recurring value falls BETWEEN two
 * existing rungs: append `2` to the name of the rung directly BELOW it,
 * never a brand-new unrelated name. `xs` (2) -> `xs2` (4); `sm` (6) ->
 * `sm2` (8). Keeps the ordering obvious from the name alone (`xs2` sorts
 * right after `xs`) without renumbering anything that already shipped.
 *
 * One-off values that still appear once or twice (1, 3, 5, 7, 9, 11, 13,
 * 14, 15, 17, 18, 20's font-size case, etc.) are intentionally left out --
 * see AUDITORIA-VISUAL.md's Fase 2 (alineación) for the proposal on each,
 * pending Pía's annotated screenshots before any of those move.
 *
 * Adopted so far: home.tsx, ClassCard.tsx, BottomNavBar.tsx, AppHeader.tsx
 * (see AUDITORIA-VISUAL.md for the full migration log).
 */
export const SPACING = {
  xs: 2,
  xs2: 4,
  sm: 6,
  sm2: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 32,
} as const;
