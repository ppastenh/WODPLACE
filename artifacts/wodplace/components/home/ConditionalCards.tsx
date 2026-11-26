import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * Lo que queda de las tarjetas condicionales de Inicio tras el rediseño: el nombre de pila y la tarjeta "WOD de hoy" anterior (que HomeView solo dibuja con el chip "WOD: actual" de desarrollo).
 * Los avisos (contrato, aviso fijo, plan) y los cumpleaños tienen su propio archivo; las tarjetas anteriores de cumpleaños, aviso del plan, contrato y aviso fijo se borraron (pedido 51).
 * La CONDICIÓN de cada tarjeta sigue en HomeView.tsx: aquí solo se dibuja. Es de claro fijo, como todo Inicio.
 */

export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Atleta';
}

/** Tarjeta "WOD de hoy" (con " · registrado" si la alumna ya registró su resultado): toda la tarjeta es un botón que abre el WOD. */
export function WodTodayCard({ wod, onPress }: { wod: { name: string; description: string; myResult?: unknown }; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ver WOD de hoy"
      onPress={onPress}
      style={({ pressed }) => [styles.wodCard, { backgroundColor: pressed ? colors.accentPressed : colors.accent }]}
    >
      <View style={styles.smallCardHeader}>
        <View style={styles.wodTitleRow}>
          <Feather name="zap" size={18} color={colors.accentForeground} />
          <Text style={[styles.smallCardLabel, { color: colors.accentForeground, marginTop: 0 }]}>WOD de hoy{wod.myResult ? ' · registrado' : ''}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.accentForeground} />
      </View>
      <Text style={[styles.wodName, { color: colors.accentForeground }]}>{wod.name}</Text>
      <Text style={[styles.wodDescription, { color: colors.accentForeground }]} numberOfLines={2}>
        {wod.description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wodCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  wodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  wodName: { fontSize: FONT_SIZE.lg, fontFamily: 'Anton_400Regular', marginTop: SPACING.sm2 },
  wodDescription: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    marginTop: SPACING.xs2,
    lineHeight: 16,
  },
  smallCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  smallCardLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    marginTop: SPACING.lg,
  },
});
