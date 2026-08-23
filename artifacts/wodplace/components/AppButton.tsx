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
}: AppButtonProps) {
  const colors = useColors();

  const palette: Record<AppButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryForeground },
    dark: { bg: colors.authBackground, fg: colors.authText },
    outlineLight: { bg: 'transparent', fg: colors.authText, border: colors.authBorder },
    outlineDark: { bg: 'transparent', fg: colors.foreground, border: colors.border },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground },
    mutedDisabled: { bg: colors.muted, fg: colors.mutedForeground },
    softBooked: { bg: colors.secondary, fg: colors.secondaryForeground },
    waitlist: { bg: colors.navActive, fg: colors.card },
  };

  const scheme = palette[variant];
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
          backgroundColor: scheme.bg,
          borderColor: scheme.border ?? 'transparent',
          borderWidth: scheme.border ? 1 : 0,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={scheme.fg} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[styles.label, compact && styles.labelCompact, { color: scheme.fg }]}
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
