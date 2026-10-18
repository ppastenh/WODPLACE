import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useDarkColors } from '@/hooks/useDarkColors';
import { SPACING } from '@/constants/spacing';
import { FONT_SIZE, FONT_WEIGHT } from '@/constants/typography';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  /** See Badge.tsx's comment -- the caller's screen decides the palette. */
  palette?: 'light' | 'dark';
}

export function EmptyState({ icon = 'inbox', title, description, palette = 'light' }: EmptyStateProps) {
  const light = useColors();
  const dark = useDarkColors();
  const colors = palette === 'dark' ? dark : light;

  return (
    <View style={styles.container}>
      <Feather name={icon} size={26} color={colors.mutedForeground} />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_WEIGHT.semibold,
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_WEIGHT.regular,
    textAlign: 'center',
  },
});
