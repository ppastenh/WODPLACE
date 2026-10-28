import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import darkColors from '@/constants/darkColors';
import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  parseThemeMode,
  type ThemeMode,
} from '@/lib/theme';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** false hasta que se leyó la preferencia guardada; RootLayout mantiene el splash hasta entonces (sin parpadeo). */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: DEFAULT_THEME_MODE,
  setMode: () => {},
  ready: true,
});

/**
 * Tema de la app (claro u oscuro) con la preferencia guardada en el teléfono (AsyncStorage). useColors() lee el modo de
 * aquí, así que ninguna pantalla cambia de paleta por su cuenta. En modo CLARO no se toca nada del sistema (queda como
 * antes de existir el tema); solo el modo oscuro ajusta la barra de estado, el fondo raíz y el tema de los diálogos
 * nativos.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const [ready, setReady] = useState(false);
  const nativeTouched = useRef(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((raw) => {
        if (alive) setModeState(parseThemeMode(raw));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (mode === 'dark') {
      nativeTouched.current = true;
      Appearance.setColorScheme('dark');
      SystemUI.setBackgroundColorAsync(darkColors.background).catch(() => {});
    } else if (nativeTouched.current) {
      // Volvió a claro después de haber estado en oscuro: devuelve el sistema a como estaba.
      nativeTouched.current = false;
      Appearance.setColorScheme('unspecified');
      SystemUI.setBackgroundColorAsync(null).catch(() => {});
    }
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ mode, setMode, ready }), [mode, setMode, ready]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {mode === 'dark' ? <StatusBar style="light" /> : null}
    </ThemeContext.Provider>
  );
}

/** Fuerza un modo solo para lo que va adentro (pantalla de desarrollo "Estados de Inicio"); no guarda ni toca el sistema. */
export function ThemeOverride({ mode, children }: { mode: ThemeMode; children: React.ReactNode }) {
  const value = useMemo(() => ({ mode, setMode: () => {}, ready: true }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
