import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useDarkColors } from '@/hooks/useDarkColors';

export type AppButtonVariant =
  | 'primary'
  | 'dark'
  | 'outlineLight'
  | 'outlineDark'
  | 'destructive'
  | 'mutedDisabled'
  | 'softBooked'
  | 'waitlist';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: AppButtonVariant;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  testID?: string;
  /** Which palette to render with -- the caller's screen decides this,
   *  never this component (this used to always call useColors() no matter
   *  what, which is exactly what made "Panel de Super Admin" nearly
   *  invisible on admin-login's dark screen; see AUDITORIA-VISUAL.md). */
  palette?: 'light' | 'dark';
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  fullWidth,
  compact,
  style,
  testID,
  palette = 'light',
}: AppButtonProps) {
  const light = useColors();
  const dark = useDarkColors();
  const colors = palette === 'dark' ? dark : light;
  const isDark = palette === 'dark';

  // 'dark' and 'outlineLight' are the two variants designed specifically
  // for an auth-styled dark button sitting on an otherwise LIGHT screen
  // (the "night box" look) -- they don't have a sensible equivalent when
  // the whole screen is already dark, so they fall back to a plain muted
  // chip rather than a made-up mapping. Not needed by any current caller.
  const scheme: Record<AppButtonVariant, { bg: string; fg: string; border?: string; bgPressed: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryForeground, bgPressed: colors.primaryPressed },
    dark: isDark
      ? { bg: colors.secondary, fg: colors.secondaryForeground, bgPressed: colors.secondaryPressed }
      : { bg: colors.authBackground, fg: colors.authText, bgPressed: colors.authCard },
    outlineLight: isDark
      ? { bg: 'transparent', fg: colors.foreground, border: colors.border, bgPressed: dark.mutedPressed }
      : { bg: 'transparent', fg: colors.authText, border: colors.authBorder, bgPressed: colors.authCard },
    outlineDark: {
      bg: 'transparent',
      fg: colors.foreground,
      border: colors.border,
      bgPressed: isDark ? dark.mutedPressed : colors.muted,
    },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground, bgPressed: colors.destructivePressed },
    mutedDisabled: { bg: colors.muted, fg: colors.mutedForeground, bgPressed: colors.muted },
    softBooked: { bg: colors.secondary, fg: colors.secondaryForeground, bgPressed: colors.secondaryPressed },
    waitlist: { bg: colors.navActive, fg: colors.card, bgPressed: colors.navActivePressed },
  };

  const active = scheme[variant];
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled || !onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        {
          // Estado presionado SÓLIDO (bgPressed, nunca opacidad) -- ver
          // AUDITORIA-VISUAL.md. La única opacidad que queda es la de
          // deshabilitado, que no es un estado de contraste al presionar.
          backgroundColor: pressed && !isDisabled ? active.bgPressed : active.bg,
          borderColor: active.border ?? 'transparent',
          borderWidth: active.border ? 1 : 0,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={active.fg} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[styles.label, compact && styles.labelCompact, { color: active.fg }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  labelCompact: {
    fontSize: 13,
  },
});
