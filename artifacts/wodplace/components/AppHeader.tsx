import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import darkColors from '@/constants/darkColors';
import { useColors } from '@/hooks/useColors';
import { useNotifications } from '@/context/NotificationsContext';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

interface AppHeaderProps {
  onBack?: () => void;
  /** Overrides the back arrow's icon — use for an action that isn't really
   *  "go back one step" (e.g. admin-dashboard's "quit the whole panel",
   *  which looks identical to a normal back arrow otherwise and gets
   *  confused with box-admin's own internal back links). Defaults to
   *  'arrow-left'. */
  backIcon?: React.ComponentProps<typeof Feather>['name'];
  onMenu?: () => void;
  menuOpen?: boolean;
  dark?: boolean;
  /** Show the notification bell on the right with an unread badge. */
  showBell?: boolean;
  /** Para la pantalla de desarrollo (datos inventados): reemplaza la cantidad del contexto. En la app real no se pasa. */
  unreadCount?: number;
  /**
   * Admin alerts bell (box-admin's own alerts inside the admin WebView —
   * unrelated to `showBell`/`useNotifications`, which is the member-facing
   * one). Renders in the same right-side slot when provided; takes priority
   * over `showBell` if somehow both are passed.
   */
  adminAlertCount?: number;
  onPressAdminAlerts?: () => void;
  /** Extra content rendered in the right slot, before the bell/alerts icon
   *  (e.g. the admin-dashboard "Ver como alumno" view-switch button). */
  rightExtra?: React.ReactNode;
}

export function AppHeader({
  onBack,
  backIcon = 'arrow-left',
  onMenu,
  menuOpen,
  dark,
  showBell,
  unreadCount: unreadCountOverride,
  adminAlertCount,
  onPressAdminAlerts,
  rightExtra,
}: AppHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unreadCount: contextUnreadCount } = useNotifications();
  const unreadCount = unreadCountOverride ?? contextUnreadCount;
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // `dark` renders the same fixed dark palette as the RM module and the
  // admin dashboard, not the (slightly different) auth/splash dark tokens.
  const iconColor = dark ? darkColors.foreground : colors.foreground;
  const bg = dark ? darkColors.background : colors.background;
  const borderColor = dark ? darkColors.border : colors.border;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderBottomColor: borderColor,
          paddingTop: insets.top + webTopInset + 14,
        },
      ]}
    >
      {/* LEFT: back arrow OR hamburger */}
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.85 : 1 }] })}
          >
            <Feather name={backIcon} size={24} color={iconColor} />
          </Pressable>
        ) : onMenu ? (
          <Pressable
            onPress={onMenu}
            hitSlop={12}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.85 : 1 }] })}
          >
            <Feather name={menuOpen ? 'x' : 'menu'} size={24} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      {/* CENTER: brand title */}
      <Text style={[styles.title, { color: iconColor }]}>WODPLACE</Text>

      {/* RIGHT: optional extra action + notification bell */}
      <View style={[styles.side, styles.sideEnd]}>
        {rightExtra}
        {onPressAdminAlerts ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver notificaciones de administración"
            onPress={onPressAdminAlerts}
            hitSlop={12}
            style={({ pressed }) => [styles.bellButton, pressed && styles.bellPressed]}
          >
            <Feather name="bell" size={22} color={iconColor} />
            {(adminAlertCount ?? 0) > 0 ? (
              <View style={[styles.bellDot, { backgroundColor: colors.destructive }]} />
            ) : null}
          </Pressable>
        ) : showBell ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver notificaciones"
            onPress={() => router.push('/notifications')}
            hitSlop={12}
            style={({ pressed }) => [styles.bellButton, pressed && styles.bellPressed]}
          >
            <Feather name="bell" size={22} color={iconColor} />
            {unreadCount > 0 ? (
              <View style={[styles.bellDot, { backgroundColor: colors.destructive }]} />
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// Fase 1 (tokens): solo paddingHorizontal y borderRadius calzan exacto.
// Fase 2, paso 1 (2026-10-21): gap:4 (sideEnd) ya se migró a SPACING.xs2.
// El width/height:8 de bellDot (más abajo) NO se tocó: es el tamaño del
// punto, no un espaciado. paddingBottom:14 y fontSize:20 siguen sin
// calzar con ningún token -- ver la propuesta de Fase 2 antes de
// moverlos.
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xxl,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 36,
    alignItems: 'flex-start',
  },
  sideEnd: {
    width: undefined,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.xs2,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Anton_400Regular',
    letterSpacing: 1,
  },
  bellButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellPressed: {
    opacity: 0.6,
  },
});
