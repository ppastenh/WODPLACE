import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Estados de Inicio con datos inventados. Solo __DEV__ -- nunca en producción: la entrada del menú (home.tsx) solo
 * existe bajo la misma condición y aquí, en una build de producción, la ruta redirige a Inicio. El require está
 * dentro de la condición a propósito: Metro reemplaza __DEV__ por false y descarta la rama, así la pantalla y sus
 * datos de ejemplo no entran al paquete de producción.
 */
const DevHomeScreen: React.ComponentType | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/home/DevHomeScreen').default
  : null;

export default function DevHomeRoute() {
  if (!DevHomeScreen) return <Redirect href="/home" />;
  return <DevHomeScreen />;
}
