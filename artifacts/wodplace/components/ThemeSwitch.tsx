import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useColors } from '@/hooks/useColors';
import type { ThemeMode } from '@/lib/theme';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'Claro' },
  { mode: 'dark', label: 'Oscuro' },
];

/** Interruptor Claro / Oscuro. Por ahora solo se muestra en desarrollo (ver profile.tsx); el paso (d) del plan lo abre a todos. */
export function ThemeSwitch() {
  const colors = useColors();
  const { mode, setMode } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.navInactive }]}>Apariencia (dev)</Text>
      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const selected = mode === option.mode;
          return (
            <Pressable
              key={option.mode}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setMode(option.mode)}
              style={[styles.option, { backgroundColor: selected ? colors.accent : colors.input }]}
            >
              <Text style={[styles.optionText, { color: selected ? colors.accentForeground : colors.foreground }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  label: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_600SemiBold' },
  options: { flexDirection: 'row', gap: SPACING.sm },
  option: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  optionText: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_600SemiBold' },
});
