/**
 * Lógica pura del tema (sin React Native: se prueba en el computador con `pnpm --filter @workspace/scripts test:theme`).
 *
 *  - Hay dos modos, 'light' (constants/colors.ts) y 'dark' (constants/darkColors.ts).
 *  - El modo CLARO devuelve EXACTAMENTE lo que useColors() devolvía antes de existir el tema: `{ ...colors.light, radius }`.
 *  - El modo OSCURO parte de la paleta clara y la pisa con darkColors.ts, así que un token que todavía no exista en
 *    darkColors.ts (paso (b) del plan) cae al valor claro en vez de quedar `undefined`.
 *  - El valor por defecto es CLARO; el paso (d) del plan lo cambia a 'dark'.
 */
import colors from '../constants/colors';
import darkColors from '../constants/darkColors';

export type ThemeMode = 'light' | 'dark';
export type Palette = typeof colors.light & { radius: number };

export const THEME_STORAGE_KEY = 'wodplace.theme';
export const DEFAULT_THEME_MODE: ThemeMode = 'light';

/** Lo guardado en el teléfono: solo 'light' o 'dark' valen; cualquier otra cosa (o nada) usa el valor por defecto. */
export function parseThemeMode(raw: string | null | undefined): ThemeMode {
  return raw === 'light' || raw === 'dark' ? raw : DEFAULT_THEME_MODE;
}

/**
 * Estilo de los íconos de la barra de estado (hora, batería): CLAROS mientras Inicio está enfocado (la barra de carbón es oscura) y, en
 * cualquier otra pantalla, el de siempre: oscuros en el tema claro (cabeceras claras) y claros en el tema oscuro.
 */
export function statusBarStyleFor(inicioFocused: boolean, mode: ThemeMode): 'light' | 'dark' {
  if (inicioFocused) return 'light';
  return mode === 'dark' ? 'light' : 'dark';
}

export function paletteFor(mode: ThemeMode): Palette {
  if (mode === 'dark') return { ...colors.light, ...darkColors, radius: colors.radius };
  return { ...colors.light, radius: colors.radius };
}
