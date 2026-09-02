import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useDarkColors } from '@/hooks/useDarkColors';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: Array<{ key: string; label: string; route: string; icon: IconName }> = [
  { key: 'bar', label: 'Barra', route: '/rm', icon: 'weight-lifter' },
  { key: 'history', label: 'Historial', route: '/rm/history', icon: 'chart-line' },
  { key: 'settings', label: 'Ajustes', route: '/rm/settings', icon: 'cog' },
];

function activeKey(pathname: string): string {
  if (pathname.startsWith('/rm/settings')) return 'settings';
  if (
    pathname.startsWith('/rm/history') ||
    pathname.startsWith('/rm/movement') ||
    pathname.startsWith('/rm/record')
  ) {
    return 'history';
  }
  return 'bar';
}

export function RmBottomNav() {
  const colors = useDarkColors();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const current = activeKey(pathname);
  const bottomInset = Platform.OS === 'web' ? 20 : insets.bottom;

  const go = (route: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (pathname !== route) router.replace(route as never);
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.navBorder,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <View style={styles.row}>
        {TABS.map((tab) => {
          const active = current === tab.key;
          const color = active ? colors.navActive : colors.navInactive;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={() => go(tab.route)}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            >
              <MaterialCommunityIcons name={tab.icon} size={22} color={color} />
              <Text style={[styles.label, { color }, active && styles.activeLabel]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { height: 60, flexDirection: 'row', alignItems: 'stretch' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 10, lineHeight: 13, fontFamily: 'Inter_500Medium' },
  activeLabel: { fontFamily: 'Inter_700Bold' },
});
