/**
 * Shared font-size scale for Home's cards — introduced to replace one-off
 * literals per card so a future size pass is a single-file edit instead of
 * hunting through every style block. Not yet adopted by other screens (see
 * home.tsx for the only consumer today).
 *
 * `xs` is the floor: nothing in Home should render smaller than this.
 */
export const FONT_SIZE = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  display: 22,
  hero: 26,
} as const;
