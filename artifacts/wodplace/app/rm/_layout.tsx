import React from 'react';
import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { RmBottomNav } from '@/components/rm/RmBottomNav';
import { useDarkColors } from '@/hooks/useDarkColors';

/**
 * RM / 1RM module — its own nested navigator with a dedicated bottom nav
 * (Historial · Calculadoras · Ajustes), fixed dark palette. Entered from the
 * app's "Progreso" tab; the app-wide bottom nav is hidden while inside /rm.
 */
export default function RmLayout() {
  const colors = useDarkColors();
  const pathname = usePathname();
  const hideNav = pathname === '/rm/record';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      {hideNav ? null : <RmBottomNav />}
    </View>
  );
}
