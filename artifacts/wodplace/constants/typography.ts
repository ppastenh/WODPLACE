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

/**
 * The 4 Inter weights Home actually uses (see app/home.tsx), named by what
 * they're for rather than by weight number.
 */
export const FONT_WEIGHT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Display font for hero numbers/titles (RM readout, WOD name, Home's
 *  hero stat) -- the one non-Inter family Home uses. */
export const FONT_FAMILY_DISPLAY = 'Anton_400Regular';
