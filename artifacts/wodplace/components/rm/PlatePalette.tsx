import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg from 'react-native-svg';
import { useDarkColors } from '@/hooks/useDarkColors';
import {
  availablePairs,
  plateKey,
  usedPairs,
  type LoadedPlate,
  type PlateSpec,
} from '@/lib/rm/barLoad';
import { plateClass, plateFill, plateStroke, plateTextColor } from '@/lib/rm/plateColors';
import { trimNum, type Unit } from '@/lib/rm/units';
import { PlateShape } from './PlateShape';

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

const BIG_D = 54;
const FRAC_D = 40;
const PAD = 9;

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
          const frac = plateClass(p.unit, p.weight) === 'frac';
          const d = frac ? FRAC_D : BIG_D;
          const box = d + PAD;
          return (
            <Pressable
              key={key}
              onPress={() => onAdd(p.unit, p.weight)}
              disabled={disabled}
              style={({ pressed }) => [
                { width: box, height: box, opacity: disabled ? 0.28 : pressed ? 0.82 : 1 },
              ]}
            >
              <Svg width={box} height={box}>
                <PlateShape
                  uid={`pal-${key}`}
                  variant="disc"
                  cx={box / 2}
                  cy={box / 2 - 1}
                  d={d}
                  fill={plateFill(p.unit, p.weight)}
                  stroke={plateStroke(p.unit, p.weight)}
                  textColor={plateTextColor(p.unit, p.weight)}
                  label={trimNum(p.weight, 2)}
                  unit={p.unit}
                  small={frac}
                />
              </Svg>
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
});
