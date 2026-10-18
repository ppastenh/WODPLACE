/**
 * Shared spacing scale -- the values are the ones already in use across
 * Home's cards (app/home.tsx), picked as the canonical set because that's
 * the only screen with an approved, reviewed layout today. One-off values
 * that appear once or twice in Home (1, 3, 4, 5, 7, 8, 9, 11, 13, 14, 18)
 * are intentionally left out rather than forced into a token -- they get
 * reviewed case by case when each screen is actually migrated.
 *
 * Not yet adopted anywhere -- only the new base components in
 * `components/ui/` use it so far (see AUDITORIA-VISUAL.md).
 */
export const SPACING = {
  xs: 2,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 32,
} as const;
