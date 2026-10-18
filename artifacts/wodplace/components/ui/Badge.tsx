import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useDarkColors } from '@/hooks/useDarkColors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { FONT_SIZE, FONT_WEIGHT } from '@/constants/typography';

export type BadgeTone = 'success' | 'warning' | 'neutral' | 'danger';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Which palette to render with -- the caller's screen decides this,
   *  never the component itself (see AUDITORIA-VISUAL.md: AppButton always
   *  calling useColors() internally, regardless of the host screen's own
   *  palette, is exactly the bug already fixed once in admin-login). */
  palette?: 'light' | 'dark';
}

export function Badge({ label, tone = 'neutral', palette = 'light' }: BadgeProps) {
  const light = useColors();
  const dark = useDarkColors();
  const colors = palette === 'dark' ? dark : light;

  const toneColors: Record<BadgeTone, { bg: string; fg: string }> = {
    success: { bg: colors.successBackground, fg: colors.success },
    warning: { bg: colors.warningBackground, fg: colors.warning },
    neutral: { bg: colors.secondary, fg: colors.secondaryForeground },
    danger: { bg: colors.destructive, fg: colors.destructiveForeground },
  };
  const scheme = toneColors[tone];

  return (
    <View style={[styles.base, { backgroundColor: scheme.bg }]}>
      <Text style={[styles.label, { color: scheme.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_WEIGHT.bold,
  },
});
