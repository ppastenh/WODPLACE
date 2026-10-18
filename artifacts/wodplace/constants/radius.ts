/**
 * Shared border-radius scale -- same sourcing rule as `spacing.ts`: these
 * are the values already in use across Home's cards (app/home.tsx), the
 * only screen with an approved, reviewed layout today. One-off values seen
 * once or twice in Home (1, 8, 12, 15, 18) are left out on purpose.
 *
 * `xl` (20) matches the pre-existing `colors.radius` in `colors.ts` --
 * kept as a separate export rather than merged into colors.ts, which is
 * about color only.
 *
 * Not yet adopted anywhere -- only the new base components in
 * `components/ui/` use it so far (see AUDITORIA-VISUAL.md).
 */
export const RADIUS = {
  sm: 4,
  md: 10,
  lg: 16,
  xl: 20,
  full: 999,
} as const;
