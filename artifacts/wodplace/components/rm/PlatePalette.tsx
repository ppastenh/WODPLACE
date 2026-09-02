import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDarkColors } from '@/hooks/useDarkColors';
import {
  availablePairs,
  plateKey,
  usedPairs,
  type LoadedPlate,
  type PlateSpec,
} from '@/lib/rm/barLoad';
import { plateFill, plateStroke, plateTextColor } from '@/lib/rm/plateColors';
import { trimNum, type Unit } from '@/lib/rm/units';

type Props = {
  plates: PlateSpec[];
  perSide: LoadedPlate[];
  onAdd: (unit: Unit, weight: number) => void;
};

const GROUPS: Array<{
  label: string;
  match: (p: PlateSpec) => boolean;
}> = [
  { label: 'Discos en libras', match: (p) => p.unit === 'lb' },
  { label: 'Discos en kilos (estándar)', match: (p) => p.unit === 'kg' && p.weight >= 5 },
  { label: 'Fraccionados / técnicos (kg)', match: (p) => p.unit === 'kg' && p.weight < 5 },
];

export function PlatePalette({ plates, perSide, onAdd }: Props) {
  const colors = useDarkColors();
  const avail = availablePairs(plates);
  const used = usedPairs(perSide);

  return (
    <View style={{ gap: 14 }}>
      {GROUPS.map((g) => {
        const items = plates
          .filter((p) => g.match(p) && p.pairs > 0)
          .sort((a, b) => b.weight - a.weight);
        if (items.length === 0) return null;
        return (
          <View key={g.label} style={{ gap: 8 }}>
            <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>{g.label}</Text>
            <View style={styles.row}>
              {items.map((p) => {
                const key = plateKey(p.unit, p.weight);
                const free = (avail.get(key) ?? 0) - (used.get(key) ?? 0);
                const disabled = free <= 0;
                const fill = plateFill(p.unit, p.weight);
                return (
                  <Pressable
                    key={key}
                    onPress={() => onAdd(p.unit, p.weight)}
                    disabled={disabled}
                    style={({ pressed }) => [
                      styles.plate,
                      {
                        backgroundColor: fill,
                        borderColor: plateStroke(p.unit, p.weight),
                        opacity: disabled ? 0.28 : pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.plateNum, { color: plateTextColor(p.unit, p.weight) }]}>
                      {trimNum(p.weight, 2)}
                    </Text>
                    <Text style={[styles.plateUnit, { color: plateTextColor(p.unit, p.weight) }]}>
                      {p.unit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  plate: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateNum: { fontSize: 15, fontFamily: 'Inter_700Bold', lineHeight: 17 },
  plateUnit: { fontSize: 9, fontFamily: 'Inter_500Medium' },
});
