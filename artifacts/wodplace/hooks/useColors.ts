import { useTheme } from '@/context/ThemeContext';
import { paletteFor } from '@/lib/theme';

/**
 * Design tokens de la paleta ACTIVA (claro u oscuro, según el tema de la app: ver context/ThemeContext.tsx y lib/theme.ts).
 * Devuelve todos los tokens de la paleta más valores independientes del tema como `radius`. En modo claro es exactamente
 * lo que devolvía antes de que existiera el tema. El tema del teléfono (useColorScheme) NO decide nada aquí.
 */
export function useColors() {
  const { mode } = useTheme();
  return paletteFor(mode);
}
