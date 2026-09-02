import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDarkColors } from '@/hooks/useDarkColors';
import { trimNum, type Unit } from '@/lib/rm/units';

type Props = {
  /** Current RM in the display unit. */
  baseWeight: number;
  unit: Unit;
};

/** 20% → 110% of the current RM, step 5%. */
export function PercentTable({ baseWeight, unit }: Props) {
  const colors = useDarkColors();
  const rows = React.useMemo(() => {
    const out: Array<{ pct: number; weight: number }> = [];
    for (let pct = 20; pct <= 110; pct += 5) {
      out.push({ pct, weight: (baseWeight * pct) / 100 });
    }
    return out;
  }, [baseWeight]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {rows.map((r, i) => (
        <View
          key={r.pct}
          style={[
            styles.row,
            i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
            r.pct === 100 && { backgroundColor: colors.secondary },
          ]}
        >
          <Text
            style={[
              styles.pct,
              { color: r.pct === 100 ? colors.primary : colors.mutedForeground },
            ]}
          >
            {r.pct}%
          </Text>
          <Text style={[styles.weight, { color: colors.foreground }]}>
            {trimNum(r.weight, 1)} {unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  pct: { fontSize: 13, fontFamily: 'Inter_600SemiBold', width: 56 },
  weight: { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
