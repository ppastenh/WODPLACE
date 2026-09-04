import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import darkColors from '@/constants/darkColors';
import { useColors } from '@/hooks/useColors';
import { useNotifications } from '@/context/NotificationsContext';

interface AppHeaderProps {
  onBack?: () => void;
  onMenu?: () => void;
  menuOpen?: boolean;
  dark?: boolean;
  /** Show the notification bell on the right with an unread badge. */
  showBell?: boolean;
}

export function AppHeader({ onBack, onMenu, menuOpen, dark, showBell }: AppHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
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
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="arrow-left" size={24} color={iconColor} />
          </Pressable>
        ) : onMenu ? (
          <Pressable
            onPress={onMenu}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name={menuOpen ? 'x' : 'menu'} size={24} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      {/* CENTER: brand title */}
      <Text style={[styles.title, { color: iconColor }]}>WODPLACE</Text>

      {/* RIGHT: notification bell */}
      <View style={[styles.side, styles.sideEnd]}>
        {showBell ? (
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 36,
    alignItems: 'flex-start',
  },
  sideEnd: {
    alignItems: 'flex-end',
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
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellPressed: {
    opacity: 0.6,
  },
});
