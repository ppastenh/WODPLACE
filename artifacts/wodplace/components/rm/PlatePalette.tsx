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
  key: string;
  tab: string;
  match: (p: PlateSpec) => boolean;
}> = [
  { key: 'lb', tab: 'Libras', match: (p) => p.unit === 'lb' },
  { key: 'kg', tab: 'Kilos', match: (p) => p.unit === 'kg' && p.weight >= 5 },
  { key: 'frac', tab: 'Fraccionados', match: (p) => p.unit === 'kg' && p.weight < 5 },
];

export function PlatePalette({ plates, perSide, onAdd }: Props) {
  const colors = useDarkColors();
  const avail = availablePairs(plates);
  const used = usedPairs(perSide);

  // Which groups actually have plates configured.
  const withItems = GROUPS.map((g) => ({
    ...g,
    items: plates
      .filter((p) => g.match(p) && p.pairs > 0)
      .sort((a, b) => b.weight - a.weight),
  })).filter((g) => g.items.length > 0);

  const [activeKey, setActiveKey] = React.useState(withItems[0]?.key ?? 'lb');
  const active = withItems.find((g) => g.key === activeKey) ?? withItems[0];

  if (!active) {
    return (
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        No hay discos configurados. Agregalos en Ajustes → Discos disponibles.
      </Text>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.tabs, { borderColor: colors.border }]}>
        {withItems.map((g) => {
          const on = g.key === active.key;
          return (
            <Pressable
              key={g.key}
              onPress={() => setActiveKey(g.key)}
              style={[styles.tab, on && { backgroundColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: on ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {g.tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        {active.items.map((p) => {
          const key = plateKey(p.unit, p.weight);
          const free = (avail.get(key) ?? 0) - (used.get(key) ?? 0);
          const disabled = free <= 0;
          return (
            <Pressable
              key={key}
              onPress={() => onAdd(p.unit, p.weight)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.plate,
                {
                  backgroundColor: plateFill(p.unit, p.weight),
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
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  tab: { paddingHorizontal: 16, paddingVertical: 9 },
  tabText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
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
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
});
