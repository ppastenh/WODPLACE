import colors from '@/constants/colors';
import darkColors from '@/constants/darkColors';

/**
 * Design tokens forced to the fixed dark palette, regardless of the device
 * appearance setting. Same shape as `useColors()`. Used by the RM module and
 * the mobile admin screens until a global light/dark switch lands.
 */
export function useDarkColors() {
  return { ...darkColors, radius: colors.radius };
}
