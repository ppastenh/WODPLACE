import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AchievementShowcase } from '@/components/home/AchievementShowcase';
import { medalsColors } from '@/components/home/medalsColors';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * ESTUDIO DE LA PARTE DERECHA DE MEDALLAS (pedidos 32 y 33). SOLO en "Estados de Inicio (dev)": una fila con el laurel 'relieve' (el elegido) y seis ejemplos de nombres de logros (tres de rachas y
 * tres del catálogo, para probar el largo) sobre el fondo de la mitad derecha de la tarjeta real (extremo derecho del degradado legible, #8B5E34). No depende de ningún archivo ignorado por git.
 */
const EXAMPLES: { icon: string; name: string }[] = [
  { icon: 'mci:calendar-check', name: 'Racha de 7 días' },
  { icon: 'mci:fire', name: 'Racha de 30 días' },
  { icon: 'trophy', name: 'Racha de 100 días' },
  { icon: 'message-circle', name: 'Primer comentario' },
  { icon: 'repeat', name: 'Competidor recurrente' },
  { icon: 'award', name: 'Leyenda de la constancia' },
];

export function LaurelStudy() {
  const colors = useColors();
  const c = medalsColors(colors);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: colors.foreground }]}>Medallas, parte derecha (estudio)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
        <View style={[styles.strip, { backgroundColor: c.gradientEnd }]}>
          {EXAMPLES.map((e) => (
            <AchievementShowcase key={e.name} icon={e.icon} name={e.name} textWidth={112} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  heading: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_700Bold', marginTop: SPACING.sm, marginBottom: SPACING.xs },
  strip: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg },
});
