import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { blocksVisible } from '@/components/home/wodCardModel';
import { movementIconFor } from '@/components/home/wodMovementIcons';
import { wodColors } from '@/components/home/wodCardColors';
import { useColors } from '@/hooks/useColors';
import { RADIUS } from '@/constants/radius';

/**
 * BLOQUES POR EJERCICIO de la tarjeta del WOD: PREPARADOS, SIN USAR (decisión (ab)). Hoy los ejercicios NO vienen separados en los datos (el coach escribe un solo texto libre), así que la tarjeta NO los dibuja ni se
 * adivinan a partir del texto. Cuando existan los datos separados, WodCard los usará: cada bloque lleva un ícono pequeño (wodMovementIcons.ts), el nombre del movimiento tal como lo escribió el coach, fondo #232428,
 * borde de cobre discreto y texto centrado; se muestran los primeros que quepan y un "+N" discreto (el resto está en el detalle). Una prueba confirma que hoy nadie lo importa.
 */
export function WodExerciseBlocks({ exercises, max = 4 }: { exercises: readonly string[]; max?: number }) {
  const colors = useColors();
  const c = wodColors(colors);
  const { shown, more } = blocksVisible(exercises, max);
  return (
    <View style={styles.wrap}>
      {shown.map((name, i) => (
        <View key={`${name}-${i}`} style={[styles.block, { backgroundColor: c.inner, borderColor: c.tagBorderSpecial }]}>
          <Feather name={movementIconFor(name)} size={14} color={c.bolt} />
          <Text style={[styles.name, { color: c.primary }]}>{name}</Text>
        </View>
      ))}
      {more > 0 ? <Text style={[styles.more, { color: c.secondary }]}>{`+${more}`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  block: { alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 8 },
  name: { fontSize: 12, textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  more: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
