import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

type NavRoute = '/home' | '/community' | '/calendar' | '/progress' | '/profile';
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
type NavIcon = FeatherIconName | 'dumbbell';

const NAV_ITEMS: Array<{
  key: string;
  label: string;
  route: NavRoute;
  icon: NavIcon;
}> = [
  { key: 'home', label: 'Home', route: '/home', icon: 'home' },
  { key: 'community', label: 'Comunidad', route: '/community', icon: 'users' },
  { key: 'schedule', label: 'Agendar', route: '/calendar', icon: 'calendar' },
  { key: 'progress', label: 'Progreso', route: '/progress', icon: 'dumbbell' },
  { key: 'profile', label: 'Perfil', route: '/profile', icon: 'user' },
];

export const BOTTOM_NAV_ROUTES = NAV_ITEMS.map((item) => item.route);

function isSelected(route: NavRoute, pathname: string): boolean {
  if (route === '/home') return pathname === '/home';
  return pathname === route;
}

export function BottomNavBar() {
  const colors = useColors();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const bottomInset = isWeb ? 34 : insets.bottom;

  const handlePress = (route: NavRoute) => {
    Haptics.selectionAsync().catch(() => {});
    if (pathname !== route) {
      router.replace(route);
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.navBorder,
          shadowColor: colors.foreground,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <View style={styles.row}>
        {NAV_ITEMS.map((item) => {
          const active = isSelected(item.route, pathname);
          const isCenter = item.key === 'schedule';
          const itemColor = active ? colors.navActive : colors.navInactive;

          if (isCenter) {
            return (
              <View key={item.key} style={styles.item}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Agendar"
                  accessibilityState={{ selected: active }}
                  onPress={() => handlePress(item.route)}
                  style={({ pressed }) => [
                    styles.floatingRing,
                    { backgroundColor: colors.background },
                    pressed && styles.pressedFloating,
                  ]}
                >
                  <View
                    style={[
                      styles.floatingButton,
                      {
                        backgroundColor: colors.navFloating,
                        shadowColor: colors.navFloating,
                      },
                    ]}
                  >
                    <Feather name="calendar" size={23} color={colors.navFloatingForeground} />
                  </View>
                </Pressable>
                <Text
                  style={[
                    styles.label,
                    styles.centerLabel,
                    { color: itemColor },
                    active && styles.activeLabel,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            );
          }

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => handlePress(item.route)}
              style={({ pressed }) => [styles.item, pressed && styles.pressedItem]}
            >
              {item.icon === 'dumbbell' ? (
                <MaterialCommunityIcons name="dumbbell" size={22} color={itemColor} />
              ) : (
                <Feather name={item.icon} size={21} color={itemColor} />
              )}
              <Text style={[styles.label, { color: itemColor }, active && styles.activeLabel]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  row: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'Inter_500Medium',
  },
  activeLabel: {
    fontFamily: 'Inter_700Bold',
  },
  centerLabel: {
    marginTop: 2,
  },
  floatingRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  floatingButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 7,
  },
  pressedFloating: {
    transform: [{ scale: 0.96 }],
  },
  pressedItem: {
    opacity: 0.72,
  },
});